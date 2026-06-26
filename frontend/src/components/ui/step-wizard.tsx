"use client"

import { Children, isValidElement, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Check } from "lucide-react"

interface StepWizardProps {
  children: ReactNode
  currentStep: number
  onStepChange?: (step: number) => void
  className?: string
  steps?: { label: string; description?: string }[]
}

interface StepProps {
  children: ReactNode
  label: string
  description?: string
  isValid?: boolean
}

export function Step({ children }: StepProps) {
  return <>{children}</>
}

export function StepWizard({
  children,
  currentStep,
  onStepChange,
  className,
  steps = [],
}: StepWizardProps) {
  const stepsArray = Children.toArray(children).filter(
    (child) => isValidElement(child)
  )
  const totalSteps = stepsArray.length
  const progress = totalSteps > 0 ? ((currentStep) / totalSteps) * 100 : 0

  // Use provided steps or extract from children
  const resolvedSteps = steps.length > 0
    ? steps
    : stepsArray.map((child, i) => {
        if (isValidElement(child) && typeof child.props.label === "string") {
          return {
            label: child.props.label,
            description: child.props.description,
          }
        }
        return { label: `Step ${i + 1}` }
      })

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Progress indicator */}
      <div className="space-y-4">
        <Progress
          value={progress}
          variant="gradient"
          size="sm"
          label={`Step ${currentStep + 1} of ${totalSteps}`}
          showValue
        />

        {/* Step pills */}
        <div className="flex items-center gap-2">
          {resolvedSteps.map((step, i) => (
            <button
              key={i}
              type="button"
              onClick={() => i <= currentStep && onStepChange?.(i)}
              disabled={i > currentStep}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                i < currentStep && "bg-chromatic-ocean/15 text-chromatic-ocean cursor-pointer",
                i === currentStep && "bg-primary text-primary-foreground shadow-sm",
                i > currentStep && "bg-muted text-muted-foreground cursor-not-allowed",
              )}
            >
              {i < currentStep ? (
                <Check className="size-3" />
              ) : (
                <span className="tabular-nums text-[10px]">{i + 1}</span>
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="glass rounded-xl p-6">
        {stepsArray[currentStep] || null}
      </div>
    </div>
  )
}
