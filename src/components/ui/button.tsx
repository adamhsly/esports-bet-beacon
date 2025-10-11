import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "relative bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] text-white shadow-[0_4px_15px_rgba(0,0,0,0.4)] rounded-xl border-2 border-transparent transition-all duration-[250ms] ease-in-out before:absolute before:inset-0 before:rounded-xl before:border before:border-white/10 before:pointer-events-none hover:translate-y-[-3px] hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(150,90,255,0.2),0_4px_15px_rgba(0,0,0,0.4)] active:translate-y-[-2px] active:border-[#965AFF] active:shadow-[0_0_20px_rgba(150,90,255,0.4),0_4px_15px_rgba(0,0,0,0.4)] disabled:pointer-events-none disabled:opacity-50 disabled:translate-y-0 disabled:scale-100",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl transition-colors disabled:pointer-events-none disabled:opacity-50",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-xl transition-colors disabled:pointer-events-none disabled:opacity-50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl transition-colors disabled:pointer-events-none disabled:opacity-50",
        ghost: "hover:bg-accent hover:text-accent-foreground rounded-xl transition-colors disabled:pointer-events-none disabled:opacity-50",
        link: "text-primary underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50",
      },
      size: {
        default: "h-10 px-4 py-2 rounded-xl",
        sm: "h-9 px-3 rounded-xl",
        lg: "h-11 px-8 rounded-xl",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
