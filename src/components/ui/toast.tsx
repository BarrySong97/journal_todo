"use client"

import { cn } from "@/lib/utils"

interface ToastProps {
  open: boolean
  message: string
  className?: string
}

export function Toast({ open, message, className }: ToastProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        className={cn(
          "bg-foreground text-background rounded-lg px-4 py-2 text-sm shadow-lg",
          className
        )}
      >
        {message}
      </div>
    </div>
  )
}
