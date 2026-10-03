import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Склейка классов для компонентов из реестра Kokonut UI.
 *
 * twMerge, а не просто clsx: в компонентах реестра классы часто
 * переопределяются через пропс className, и без разрешения конфликтов
 * в разметке остаются оба (`px-4 px-6`) — победит тот, что стоит позже
 * в собранном CSS, а не тот, что передали.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
