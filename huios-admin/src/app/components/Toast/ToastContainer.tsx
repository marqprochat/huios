"use client";

import { useToastContext } from "./ToastContext";
import { ToastItem } from "./ToastItem";

export function ToastContainer() {
  const { toasts } = useToastContext();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  );
}