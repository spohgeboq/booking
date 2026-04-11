import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Утилита для объединения классов и разрешения конфликтов Tailwind
 * Используется повсеместно в UI-компонентах (аналог из shadcn/ui)
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
