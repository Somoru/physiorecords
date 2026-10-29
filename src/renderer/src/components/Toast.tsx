/* eslint-disable react-refresh/only-export-components -- context + hook + provider live together intentionally */
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Check } from 'lucide-react'

interface ToastItem {
  id: number
  message: string
}

const ToastContext = createContext<((message: string) => void) | null>(null)

export function useToast(): (message: string) => void {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const showToast = useCallback((message: string) => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2200)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 rounded-md border bg-foreground px-3 py-2 text-sm text-background shadow-lg animate-in fade-in slide-in-from-bottom-2"
          >
            <Check className="h-3.5 w-3.5" />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
