'use client'

/**
 * Кнопка со слоистой градиентной рамкой и светящейся подписью.
 *
 * Основано на компоненте «Gradient Button» из реестра Kokonut UI
 * © @dorianbaffier, MIT — https://kokonutui.com
 *
 * Что изменено под FABULA ONE:
 *  • три цветовые схемы (emerald / purple / orange) с зашитыми hex-ами
 *    заменены одной — на токенах бренда, фиолет в циан;
 *  • светлая тема убрана, в проекте только тёмная;
 *  • добавлен вариант-ссылка: главный CTA на макете ведёт в каталог, а не
 *    отправляет форму, и подменять <button> на <a> обработчиком неверно;
 *  • inset-свечение задано через arbitrary-значение с нашим токеном.
 *    В оригинале оно собиралось конкатенацией строки в имя класса
 *    (`shadow-[inset_0_0_10px_${glow}]`) — так Tailwind класс не находит
 *    при сканировании и стиль молча не применяется.
 */

import Link from 'next/link'
import type * as React from 'react'
import { cn } from '@/lib/utils'

interface AuroraButtonProps {
  label: string
  href?: string
  icon?: React.ReactNode
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
}

export default function AuroraButton({
  label,
  href,
  icon,
  className,
  onClick,
  type = 'button',
}: AuroraButtonProps) {
  const content = (
    <>
      {/* Заливка. В оригинале тело кнопки тёмное, а градиент только в рамке —
          на выбранном макете наоборот: главный CTA это яркая градиентная
          пилюля. Поэтому градиент вынесен в заливку, а подпись сделана
          тёмной. Все пять стопов проверены на контраст с --color-void
          в scripts/check-palette.mjs, минимум 5.40:1. */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-[image:var(--gradient-aurora)] bg-[length:200%_100%] bg-[position:0%_50%] transition-[background-position] duration-500 group-hover:bg-[position:100%_50%]"
      />

      {/* Светлая кромка сверху и тень внутрь снизу — объём, как у стекла */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full shadow-[inset_0_1px_0_oklch(1_0_0/0.35),inset_0_-8px_16px_oklch(from_var(--color-accent-deep)_l_c_h/0.35)]"
      />

      {/* Мягкое свечение вокруг по наведению */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full opacity-0 shadow-[0_0_28px_oklch(from_var(--color-accent)_l_c_h/0.45)] transition-opacity duration-300 group-hover:opacity-100"
      />

      <span className="relative flex items-center justify-center gap-2">
        <span className="font-display font-semibold text-base text-brand-void tracking-tight">
          {label}
        </span>
        {icon}
      </span>
    </>
  )

  const shell = cn(
    'group relative inline-flex h-14 items-center overflow-hidden rounded-full px-8',
    'transition-transform duration-300 active:scale-[0.98]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2',
    'focus-visible:ring-offset-brand-bg',
    className,
  )

  if (href) {
    return (
      <Link className={shell} href={href}>
        {content}
      </Link>
    )
  }

  return (
    <button className={shell} onClick={onClick} type={type}>
      {content}
    </button>
  )
}
