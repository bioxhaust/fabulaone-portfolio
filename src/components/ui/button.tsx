'use client'

/**
 * Минимальная кнопка в соглашении shadcn — её импортируют компоненты из
 * реестра Kokonut UI (`@/components/ui/button`).
 *
 * Написана под наши токены, а не скопирована из shadcn: полный вариант
 * оттуда тянет собственный набор цветовых переменных (--primary,
 * --secondary, --destructive и далее), который дублировал бы уже
 * проверенную палитру проекта. Здесь ровно те варианты и размеры, которые
 * реально используются компонентами реестра.
 *
 * Важно: это НЕ замена глобальному классу `.btn` из globals.css. Тот —
 * основная кнопка сайта. Этот примитив нужен только внутри компонентов
 * реестра, чтобы они собирались без правок их импортов.
 */

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-brand-bg disabled:pointer-events-none disabled:opacity-40 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-brand-accent text-brand-void hover:bg-brand-accent/90',
        outline:
          'border border-brand-line-strong bg-transparent text-brand-text hover:bg-brand-raised hover:text-brand-head',
        ghost: 'bg-transparent text-brand-text hover:bg-brand-raised',
      },
      size: {
        default: 'h-11 px-5 text-sm',
        sm: 'h-9 px-3 text-xs',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
