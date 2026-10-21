"use client"

import { useCallback, useReducer, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"
import { tripApi } from "../api"
import type { GenerateJob, GenerateTripInput } from "../types"
import { ignoreJob, isIgnored, saveSnapshot, snapshotFromInput } from "../lib/generateJob"

const POLL_MS = 3000

const GENERIC_ERROR = "Couldn't generate the itinerary. Your answers are kept, so try again."

/**
 * Trip generation as a background job: start it, poll until it is done or
 * failed, and pick up the user's latest job when they come back to the page.
 * A job the user already used or dismissed (ignoreJob) is not picked up again.
 */
export function useGenerateJob() {
  const qc = useQueryClient()
  // The job this page started, or followed after a 409.
  const [startedId, setStartedId] = useState<string | null>(null)
  // Re-render after ignoreJob (it writes to localStorage, not state).
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  const [startError, setStartError] = useState<string | null>(null)

  // On arrival: is there a job to resume?
  const resume = useQuery({
    queryKey: ["trips", "generate-job", "active"],
    queryFn: () => tripApi.getActiveGenerateJob(),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
  const resumable = resume.data
  const jobId = startedId ?? (resumable && !isIgnored(resumable.job_id) ? resumable.job_id : null)

  const jobQuery = useQuery({
    queryKey: ["trips", "generate-job", jobId],
    queryFn: () => tripApi.getGenerateJob(jobId as string),
    enabled: jobId !== null,
    gcTime: 0,
    retry: false,
    refetchIntervalInBackground: true,
    // A failed poll (network blip) keeps polling; only a finished job or a job
    // that no longer exists (404) stops it. The query stops itself on unmount.
    refetchInterval: (query) => {
      if (query.state.error instanceof ApiError && query.state.error.status === 404) return false
      const status = query.state.data?.status
      return status === "done" || status === "failed" ? false : POLL_MS
    },
  })
  const job: GenerateJob | undefined = jobQuery.data
  const jobGone = jobQuery.error instanceof ApiError && jobQuery.error.status === 404

  const startMutation = useMutation({
    mutationFn: (input: GenerateTripInput) => tripApi.startGenerateJob(input),
    retry: 0,
    onSuccess: ({ job_id }, input) => {
      saveSnapshot(job_id, snapshotFromInput(input))
      setStartedId(job_id)
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        // Already generating (another tab or a double click): follow that job.
        tripApi
          .getActiveGenerateJob()
          .then((active) => {
            if (active) setStartedId(active.job_id)
            else setStartError(GENERIC_ERROR)
          })
          .catch(() => setStartError(GENERIC_ERROR))
        return
      }
      setStartError(err instanceof ApiError ? err.message : GENERIC_ERROR)
    },
    // The quota is spent when a job starts, so refresh the badge.
    onSettled: () => qc.invalidateQueries({ queryKey: ["autogen", "quota"] }),
  })

  const start = useCallback(
    (input: GenerateTripInput) => {
      setStartError(null)
      startMutation.mutate(input)
    },
    // mutate is stable; the mutation object is not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startMutation.mutate],
  )

  /** Forget the current job (used, dismissed, or failed) so it does not come back. */
  const dismiss = useCallback(() => {
    if (jobId) ignoreJob(jobId)
    setStartedId(null)
    setStartError(null)
    refresh()
    qc.removeQueries({ queryKey: ["trips", "generate-job"] })
  }, [jobId, qc])

  const running =
    startMutation.isPending || (jobId !== null && !jobGone && (job === undefined || job.status === "running"))

  let error: string | null = startError
  if (!error && job?.status === "failed") error = job.error?.message || GENERIC_ERROR
  if (!error && jobGone) error = "This itinerary is no longer available. Please generate it again."

  return { jobId, job, running, error, start, dismiss }
}
