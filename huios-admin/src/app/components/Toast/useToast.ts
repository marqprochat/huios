"use client";

import { useToastContext } from "./ToastContext";
import { ToastContextType, ToastType } from "./types";

export function useToast(): Pick<ToastContextType, "toast"> {
  const { toast } = useToastContext();
  return { toast };
}

export type { ToastType };