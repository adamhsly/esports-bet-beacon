import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 100
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: string
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: string
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
    default:
      return state
  }
}

function addToRemoveQueue(toastId: string) {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

interface ToastContextType {
  toasts: ToasterToast[]
  toast: (props: ToastProps) => void
  dismiss: (toastId?: string) => void
  update: (props: Partial<ToasterToast>) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(
  undefined
)

function useToastContext() {
  const context = React.useContext(ToastContext)

  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }

  return context
}

export function useToast() {
  const { toast, dismiss, update } = useToastContext()

  return {
    toast,
    dismiss,
    update,
  }
}

export function toast(props: ToastProps) {
  const id = genId()
  const update = (props: ToastProps) => dispatch({
    type: actionTypes.UPDATE_TOAST,
    toast: { ...props, id },
  })
  const dismiss = () => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id })

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id,
    dismiss,
    update,
  }
}

// Create a separate React.useReducer call that doesn't get initialized outside of a component
const useReducerState = () => React.useReducer(reducer, { toasts: [] })

// Export the initial state and dispatch for external use
export const [initialState, initialDispatch] = { toasts: [] } as const

// Keep track of the dispatch function outside components
let dispatch = (action: Action) => {
  console.error(
    "Toast dispatch called outside of provider. This is a no-op. Make sure your app is wrapped in a ToastProvider."
  )
}

export function ToastProvider(props: React.PropsWithChildren) {
  const [state, innerDispatch] = useReducerState()
  
  // Update the outer dispatch reference
  React.useEffect(() => {
    dispatch = innerDispatch
  }, [innerDispatch])

  const value = React.useMemo(() => {
    return {
      toasts: state.toasts,
      toast: (props: ToastProps) => toast(props),
      dismiss: (toastId?: string) => innerDispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
      update: (props: Partial<ToasterToast>) => innerDispatch({ type: actionTypes.UPDATE_TOAST, toast: props }),
    }
  }, [state])

  return (
    <ToastContext.Provider value={value}>
      {props.children}
    </ToastContext.Provider>
  )
}

export { type ToastProps, type ToastActionElement }
