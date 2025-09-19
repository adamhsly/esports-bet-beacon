import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-input bg-background hover:bg-accent",
        success:
          "border-transparent bg-neon-green text-primary-foreground hover:bg-neon-green/80",
        warning:
          "border-transparent bg-neon-orange text-primary-foreground hover:bg-neon-orange/80",
        info:
          "border-transparent bg-neon-blue text-primary-foreground hover:bg-neon-blue/80",
        premium:
          "border-transparent bg-neon-gold text-primary-foreground hover:bg-neon-gold/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  srText?: string // Screen reader only text for context
}

function AccessibleBadge({ className, variant, srText, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {srText && <span className="sr-only">{srText}</span>}
      {children}
    </div>
  )
}

export { AccessibleBadge, badgeVariants }