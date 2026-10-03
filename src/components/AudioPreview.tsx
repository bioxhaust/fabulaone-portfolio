'use client'

import { useRef, useState } from 'react'
import { Goals, reachGoal } from '@/lib/metrika'
import styles from './AudioPreview.module.css'

type Props = { src: string }

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const whole = Math.floor(seconds)
  const m = Math.floor(whole / 60)
  const s = whole % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function AudioPreview({ src }: Props) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)

  function toggle() {
    const el = ref.current
    if (!el) return
    if (playing) {
      el.pause()
      setPlaying(false)
      return
    }
    el.play().catch(() => {})
    setPlaying(true)
    reachGoal(Goals.demoPlay, { src })
  }

  function seek(next: number) {
    const el = ref.current
    if (!el) return
    el.currentTime = next
    setTime(next)
  }

  const progress = duration > 0 ? Math.min(1, time / duration) : 0

  return (
    <div className={styles.wrap}>
      <audio
        ref={ref}
        preload="metadata"
        src={src}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(event) => {
          const next = event.currentTarget.duration
          setDuration(Number.isFinite(next) ? next : 0)
        }}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
      />

      <button
        type="button"
        className={styles.play}
        onClick={toggle}
        aria-label={playing ? 'Остановить превью' : 'Послушать превью'}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>

      <label className={styles.track}>
        <span className={styles.sr}>Позиция в превью</span>
        <input
          className={styles.range}
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(time, duration || 0)}
          onChange={(event) => seek(Number(event.target.value))}
          style={{ '--p': `${progress * 100}%` } as React.CSSProperties}
        />
      </label>

      <p className={styles.clock}>
        <span>{formatClock(time)}</span>
        <span>{formatClock(duration)}</span>
      </p>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg className={styles.playIcon} width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M5 3.2v9.6L13 8 5 3.2z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="3.5" y="3" width="3" height="10" />
      <rect x="9.5" y="3" width="3" height="10" />
    </svg>
  )
}
