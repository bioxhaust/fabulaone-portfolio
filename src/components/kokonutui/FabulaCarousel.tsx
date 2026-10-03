'use client'

/**
 * Горизонтальная карусель фабул со стрелками.
 *
 * Основано на компоненте «Carousel Cards» из реестра Kokonut UI
 * © @dorianbaffier, MIT — https://kokonutui.com
 *
 * Что изменено под FABULA ONE:
 *  • компонент принимает children, а не вшитый массив демо-данных
 *    (в оригинале внутри лежат карточки Airbnb с картинками с Unsplash);
 *  • стрелки гаснут на краях ленты. В оригинале они всегда активны, и на
 *    первом кадре клик влево ничего не делает — выглядит как поломка;
 *  • шаг прокрутки считается от реальной ширины карточки, а не фиксированные
 *    320px: при другой ширине карточки лента уезжала бы не на целое число;
 *  • палитра neutral-* заменена токенами бренда;
 *  • лента остаётся доступной с клавиатуры: у контейнера tabIndex и
 *    видимый фокус, стрелки — настоящие кнопки с подписями.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import styles from './FabulaCarousel.module.css'

interface FabulaCarouselProps {
  title: string
  meta?: string
  children: React.ReactNode
  className?: string
}

export default function FabulaCarousel({
  title,
  meta,
  children,
  className,
}: FabulaCarouselProps) {
  const track = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  /** Обновляет состояние стрелок по текущему положению ленты. */
  const syncEdges = useCallback(() => {
    const el = track.current
    if (!el) return
    // 2px допуска: при дробном devicePixelRatio scrollLeft не добирает до
    // максимума ровно, и стрелка «вправо» оставалась бы активной навсегда.
    setAtStart(el.scrollLeft <= 2)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    const el = track.current
    if (!el) return

    syncEdges()
    el.addEventListener('scroll', syncEdges, { passive: true })

    // Ширина карточек зависит от ширины окна — на ресайзе края меняются.
    const ro = new ResizeObserver(syncEdges)
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', syncEdges)
      ro.disconnect()
    }
  }, [syncEdges])

  const scroll = (direction: -1 | 1) => {
    const el = track.current
    if (!el) return
    // Шаг — ширина первой карточки плюс зазор, чтобы лента всегда
    // останавливалась на границе элемента, а не посередине.
    const first = el.firstElementChild as HTMLElement | null
    const gap = Number.parseFloat(getComputedStyle(el).columnGap || '0') || 0
    const step = first ? first.offsetWidth + gap : el.clientWidth * 0.8
    el.scrollBy({ left: step * direction, behavior: 'smooth' })
  }

  return (
    <div className={className}>
      <div className="mb-8 flex items-baseline justify-between gap-6 border-brand-line border-b pb-6">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="font-display font-bold text-3xl text-brand-head tracking-tight">
            {title}
          </h2>
          {meta && (
            <p className="text-brand-muted text-sm tabular-nums">{meta}</p>
          )}
        </div>

        {/* Стрелки только с sm и шире. На телефоне лента листается свайпом, а
            неуменьшаемый блок из двух кнопок вместе с заголовком не влезал
            в 342px контейнера и давал 68px горизонтальной прокрутки. */}
        <div className="hidden flex-none items-center gap-2 sm:flex">
          <Button
            aria-label="Предыдущие фабулы"
            className="h-10 w-10 rounded-full disabled:opacity-25"
            disabled={atStart}
            onClick={() => scroll(-1)}
            size="icon"
            variant="outline"
          >
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Следующие фабулы"
            className="h-10 w-10 rounded-full disabled:opacity-25"
            disabled={atEnd}
            onClick={() => scroll(1)}
            size="icon"
            variant="outline"
          >
            <ChevronRight aria-hidden className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        aria-label={title}
        className={cn(styles.track, 'snap-x snap-mandatory')}
        ref={track}
        role="group"
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  )
}
