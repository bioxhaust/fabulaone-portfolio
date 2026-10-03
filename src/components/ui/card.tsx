/**
 * Примитивы карточки в соглашении shadcn — их импортируют компоненты из
 * реестра Kokonut UI. Заливка и граница взяты из наших токенов.
 *
 * Здесь нет backdrop-filter и полупрозрачности: карточки каталога лежат на
 * ровном фоне страницы, и стеклянная подложка смешалась бы с ним, сведя
 * проверенное отделение карточки от фона (1.26:1) почти к нулю.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      className={cn(
        'rounded-brand border border-brand-line bg-brand-card text-brand-text',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Card.displayName = 'Card'

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div className={cn('p-4', className)} ref={ref} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div className={cn('flex items-center p-4 pt-0', className)} ref={ref} {...props} />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardContent, CardFooter }
