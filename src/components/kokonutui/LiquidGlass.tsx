'use client'

import Link from 'next/link'
import { memo, useId, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import styles from './LiquidGlass.module.css'

const FILTER_SCALE_SURFACE = 30
const FILTER_SCALE_BUTTON = 70

interface GlassFilterProps {
  id: string
  scale?: number
}

export const GlassFilter = memo(function GlassFilter({
  id,
  scale = FILTER_SCALE_SURFACE,
}: GlassFilterProps) {
  return (
    <svg aria-hidden="true" className="hidden" focusable="false">
      <defs>
        <filter
          colorInterpolationFilters="sRGB"
          height="200%"
          id={id}
          width="200%"
          x="-50%"
          y="-50%"
        >
          <feTurbulence
            baseFrequency="0.05 0.05"
            numOctaves="1"
            result="turbulence"
            seed="1"
            type="fractalNoise"
          />
          <feGaussianBlur in="turbulence" result="blurredNoise" stdDeviation="2" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            result="displaced"
            scale={scale}
            xChannelSelector="R"
            yChannelSelector="B"
          />
          <feGaussianBlur in="displaced" result="finalBlur" stdDeviation="4" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  )
})

interface LiquidGlassProps extends ComponentPropsWithoutRef<'div'> {
  children: ReactNode
  contentClassName?: string
  filterScale?: number
}

export function LiquidGlass({
  children,
  className,
  contentClassName,
  filterScale = FILTER_SCALE_SURFACE,
  ...props
}: LiquidGlassProps) {
  const filterId = useId()

  return (
    <div className={`${styles.surface} ${className ?? ''}`} {...props}>
      <div className={styles.shadow} aria-hidden />
      <div
        className={styles.filterLayer}
        style={{ backdropFilter: `url("#${filterId}")` }}
        aria-hidden
      />
      <GlassFilter id={filterId} scale={filterScale} />
      <div className={styles.shimmer} aria-hidden />
      <div className={`${styles.content} ${contentClassName ?? ''}`}>{children}</div>
    </div>
  )
}

interface LiquidGlassButtonProps extends Omit<ComponentPropsWithoutRef<typeof Link>, 'children'> {
  children: ReactNode
  large?: boolean
}

export function LiquidGlassButton({
  href,
  children,
  className,
  large = false,
  ...props
}: LiquidGlassButtonProps) {
  const filterId = useId()

  return (
    <>
      <Link
        href={href}
        className={`${styles.button} ${large ? styles.buttonLg : ''} ${className ?? ''}`}
        {...props}
      >
        <div className={styles.shadow} aria-hidden />
        <div
          className={styles.filterLayer}
          style={{ backdropFilter: `url("#${filterId}")` }}
          aria-hidden
        />
        <div className={styles.shimmer} aria-hidden />
        <span className={styles.content}>{children}</span>
      </Link>
      <GlassFilter id={filterId} scale={FILTER_SCALE_BUTTON} />
    </>
  )
}
