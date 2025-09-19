import * as React from "react"
import { cn } from "@/lib/utils"

const AccessibleCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    asChild?: boolean
    interactive?: boolean
  }
>(({ className, asChild = false, interactive = false, ...props }, ref) => {
  const Comp = asChild ? "div" : "div"
  
  return (
    <Comp
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        interactive && "transition-all duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className
      )}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      {...props}
    />
  )
})
AccessibleCard.displayName = "AccessibleCard"

const AccessibleCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
AccessibleCardHeader.displayName = "AccessibleCardHeader"

const AccessibleCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    level?: 1 | 2 | 3 | 4 | 5 | 6
  }
>(({ className, level = 3, ...props }, ref) => {
  const baseClasses = "font-semibold leading-none tracking-tight"
  const sizeClasses = {
    1: "text-4xl",
    2: "text-3xl", 
    3: "text-2xl",
    4: "text-xl",
    5: "text-lg",
    6: "text-base"
  }
  
  const headingProps = {
    ref,
    className: cn(baseClasses, sizeClasses[level], className),
    ...props
  }
  
  switch (level) {
    case 1: return <h1 {...headingProps} />
    case 2: return <h2 {...headingProps} />
    case 3: return <h3 {...headingProps} />
    case 4: return <h4 {...headingProps} />
    case 5: return <h5 {...headingProps} />
    case 6: return <h6 {...headingProps} />
    default: return <h3 {...headingProps} />
  }
})
AccessibleCardTitle.displayName = "AccessibleCardTitle"

const AccessibleCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
AccessibleCardDescription.displayName = "AccessibleCardDescription"

const AccessibleCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
AccessibleCardContent.displayName = "AccessibleCardContent"

const AccessibleCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
AccessibleCardFooter.displayName = "AccessibleCardFooter"

export {
  AccessibleCard,
  AccessibleCardHeader,
  AccessibleCardFooter,
  AccessibleCardTitle,
  AccessibleCardDescription,
  AccessibleCardContent,
}