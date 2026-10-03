/**
 * Бейдж в соглашении shadcn — импортируется компонентами реестра Kokonut UI.
 * Цвета из наших токенов: циановая обводка, как у плашек фич на главной.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-brand-cyan/25 bg-brand-cyan/10',
        'px-2.5 py-0.5 font-medium text-brand-cyan text-xs',
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
