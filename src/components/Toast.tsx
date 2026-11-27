import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import {
  CULTUREXE_ERROR_EVENT,
  userErrorMessage,
} from '@/lib/errors/normaliseClientError'

type ToastType = 'success' | 'error'
type ShowToast = (message: unknown, type?: ToastType) => void

type ToastItem = {
  id: number
  message: string
  type: ToastType
}

const ToastContext = createContext<ShowToast | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback<ShowToast>((message, type = 'success') => {
    const id = Date.now() + Math.random()
    const displayMessage = type === 'error'
      ? userErrorMessage(message)
      : String(message)
    setToasts((current) => [...current, { id, message: displayMessage, type }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3200)
  }, [])

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      showToast(event.error ?? event.message, 'error')
    }
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      showToast(event.reason, 'error')
    }
    const handleApplicationError = (event: Event) => {
      showToast((event as CustomEvent<unknown>).detail, 'error')
    }

    window.addEventListener('error', handleWindowError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener(CULTUREXE_ERROR_EVENT, handleApplicationError)
    return () => {
      window.removeEventListener('error', handleWindowError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener(CULTUREXE_ERROR_EVENT, handleApplicationError)
    }
  }, [showToast])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto max-w-[440px] animate-[toast-in_0.22s_ease] rounded-[10px] px-[18px] py-3 text-[13.5px] font-medium leading-6 text-white shadow-[0_4px_20px_rgba(0,0,0,0.18)] ${
              toast.type === 'error' ? 'bg-[var(--coral)]' : 'bg-[var(--teal)]'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast(): ShowToast {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
