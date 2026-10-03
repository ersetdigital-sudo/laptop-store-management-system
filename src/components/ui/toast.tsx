'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error'

interface Toast {
  id: number
  message: string
  type: ToastType
}

let globalId = 0
let listeners: Array<(toast: Toast) => void> = []

export function showToast(message: string, type: ToastType = 'success') {
  const toast: Toast = { id: ++globalId, message, type }
  listeners.forEach(fn => fn(toast))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Toast) => {
    setToasts(prev => [...prev, toast])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id))
    }, 3000)
  }, [])

  useEffect(() => {
    listeners.push(addToast)
    return () => { listeners = listeners.filter(fn => fn !== addToast) }
  }, [addToast])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-[calc(100vw-2rem)]" style={{ animation: 'toast-slide-in 0.3s ease-out' }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-destructive'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          <span>{toast.message}</span>
          <button
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            className="ml-2 hover:opacity-70"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
