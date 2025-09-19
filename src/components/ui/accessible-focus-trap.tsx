import * as React from "react"

interface AccessibleFocusTrapProps {
  children: React.ReactNode
  enabled?: boolean
  onEscape?: () => void
}

export function AccessibleFocusTrap({ 
  children, 
  enabled = true, 
  onEscape 
}: AccessibleFocusTrapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [firstFocusableElement, setFirstFocusableElement] = React.useState<HTMLElement | null>(null)
  const [lastFocusableElement, setLastFocusableElement] = React.useState<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!enabled || !containerRef.current) return

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const focusableArray = Array.from(focusableElements) as HTMLElement[]
    setFirstFocusableElement(focusableArray[0] || null)
    setLastFocusableElement(focusableArray[focusableArray.length - 1] || null)

    // Focus first element
    if (focusableArray[0]) {
      focusableArray[0].focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape?.()
        return
      }

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusableElement) {
            e.preventDefault()
            lastFocusableElement?.focus()
          }
        } else {
          if (document.activeElement === lastFocusableElement) {
            e.preventDefault()
            firstFocusableElement?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, firstFocusableElement, lastFocusableElement, onEscape])

  return (
    <div ref={containerRef}>
      {children}
    </div>
  )
}