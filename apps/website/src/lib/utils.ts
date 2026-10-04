import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names using clsx and tailwind-merge
 * This utility is used by shadcn/ui components to handle class name combinations
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}