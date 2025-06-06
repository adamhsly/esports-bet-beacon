
import * as React from "react"
import { type ToastProps } from "@/components/ui/toast"
import { TOAST_LIMIT, TOAST_REMOVE_DELAY, ToasterToast, ToastContextType } from "./toast-types"

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

// Keep track of the dispatch function outside components
let dispatch = (action: Action) => {
  console.error(
    "Toast dispatch called outside of provider. This is a no-op. Make sure your app is wrapped in a ToastProvider."
  )
}

export function ToastProvider(props: React.PropsWithChildren) {
  const [state, innerDispatch] = React.useReducer(reducer, { toasts: [] })
  
  // Update the outer dispatch reference
  React.useEffect(() => {
    dispatch = innerDispatch
  }, [innerDispatch])

  const value = React.useMemo(() => {
    const toast = (props: ToastProps) => {
      const id = genId()
      
      const update = (props: ToastProps) => 
        dispatch({
          type: actionTypes.UPDATE_TOAST,
          toast: { ...props, id },
        })
      
      const dismiss = () => 
        dispatch({ 
          type: actionTypes.DISMISS_TOAST, 
          toastId: id 
        })

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

    return {
      toasts: state.toasts,
      toast,
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

export function useToast() {
  const { toast, dismiss, update, toasts } = useToastContext()

  return {
    toast,
    dismiss,
    update,
    toasts,
  }
}

export function toast(props: ToastProps) {
  const id = genId()
  
  const update = (props: ToastProps) => 
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...props, id },
    })
  
  const dismiss = () => 
    dispatch({ 
      type: actionTypes.DISMISS_TOAST, 
      toastId: id 
    })

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
