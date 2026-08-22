import React, { createContext, useContext, useState, useCallback } from "react"
import { CheckCircle2, AlertTriangle, X } from "lucide-react"

export type ToastType = "success" | "error"

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, type, message }])
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      removeToast(id)
    }, 4000)
  }, [removeToast])

  const success = useCallback((message: string) => toast("success", message), [toast])
  const error = useCallback((message: string) => toast("error", message), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      {/* Toast Notification Container in Top-Right */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 p-3.5 rounded-lg border shadow-lg pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
              t.type === "success"
                ? "bg-[#9CB080] border-[#819666] text-[#2B5748]"
                : "bg-[#FDF2F2] border-[#BE1A1A] text-[#BE1A1A]"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-[#2B5748]" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-[#BE1A1A]" />
              )}
            </div>
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {t.message}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-0.5 rounded-full hover:bg-black/5 text-current/60 hover:text-current transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
