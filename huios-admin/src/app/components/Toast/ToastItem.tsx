"use client";

import { Toast, ToastType } from "./types";
import { useToastContext } from "./ToastContext";

const icons: Record<ToastType, string> = {
  error: "error",
  success: "check_circle",
  warning: "warning",
  info: "info",
};

const styles: Record<ToastType, string> = {
  error: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300",
  success: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300",
  warning: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300",
  info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300",
};

const iconStyles: Record<ToastType, string> = {
  error: "text-red-500",
  success: "text-green-500",
  warning: "text-amber-500",
  info: "text-blue-500",
};

export function ToastItem({ id, type, title, message }: Toast) {
  const { removeToast } = useToastContext();

  return (
    <div
      className={`
        ${styles[type]}
        border rounded-xl p-4 shadow-lg backdrop-blur-sm
        animate-[slideIn_0.3s_ease-out]
        flex items-start gap-3
      `}
      role="alert"
    >
      <span className={`material-symbols-outlined text-xl ${iconStyles[type]}`}>
        {icons[type]}
      </span>
      
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">{title}</p>
        {message && (
          <p className="text-sm opacity-80 mt-1">{message}</p>
        )}
      </div>

      <button
        onClick={() => removeToast(id)}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 -mt-0.5 -mr-1"
        aria-label="Fechar"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
}