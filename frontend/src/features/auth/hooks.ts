"use client"

import { useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { api, ApiError } from "@/lib/api"
import { useAuthStore } from "./store"
import type { User } from "./types"

export function useAuth() {
  const { user, isLoading, setUser, setLoading } = useAuthStore()

  const query = useQuery<User, ApiError>({
    queryKey: ["auth", "me"],
    queryFn: () => api.get<User>("/auth/me"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (query.isSuccess) {
      setUser(query.data)
      setLoading(false)
    } else if (query.isError) {
      setUser(null)
      setLoading(false)
    }
  }, [query.isSuccess, query.isError, query.data, setUser, setLoading])

  return {
    user,
    isLoading: query.isLoading || isLoading,
    isAuthenticated: !!user,
  }
}

export function useLogout() {
  const queryClient = useQueryClient()
  const { setUser } = useAuthStore()
  const router = useRouter()

  return useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSettled: () => {
      setUser(null)
      queryClient.clear()
      router.push("/login")
    },
  })
}
