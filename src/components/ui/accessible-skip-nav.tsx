import * as React from "react"
import { cn } from "@/lib/utils"

interface SkipNavLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

export function SkipNavLink({ href, children, className }: SkipNavLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50",
        "bg-primary text-primary-foreground px-4 py-2 rounded-md",
        "transition-all duration-200 focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
    >
      {children}
    </a>
  )
}

interface SkipNavContentProps {
  id: string
  children: React.ReactNode
  className?: string
}

export function SkipNavContent({ id, children, className }: SkipNavContentProps) {
  return (
    <main
      id={id}
      className={className}
      tabIndex={-1}
    >
      {children}
    </main>
  )
}