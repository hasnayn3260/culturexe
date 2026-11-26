import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'

type ToastType = 'success' | 'error'
type ShowToast = (message: string, type?: ToastType) => void

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
    setToasts((current) => [...current, { id, message, type }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3200)
  }, [])

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
            className={`pointer-events-auto max-w-[340px] animate-[toast-in_0.22s_ease] rounded-[10px] px-[18px] py-3 text-[13.5px] font-medium leading-6 text-white shadow-[0_4px_20px_rgba(0,0,0,0.18)] ${
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
