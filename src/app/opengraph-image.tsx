import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'FABULA ONE — Звук глубже слов'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 72,
          background: 'linear-gradient(160deg, #1a1612 0%, #0f0d0b 55%, #1c1814 100%)',
          color: '#f3ebe0',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 70% 20%, rgba(196,165,116,0.18), transparent 55%)',
          }}
        />
        <div style={{ fontSize: 28, letterSpacing: 8, color: '#c4a574', marginBottom: 24 }}>
          FABULA ONE
        </div>
        <div style={{ fontSize: 72, lineHeight: 1.05, maxWidth: 900 }}>Звук глубже слов</div>
        <div style={{ marginTop: 28, fontSize: 28, color: 'rgba(243,235,224,0.65)' }}>
          Цифровые аудиофабулы · 11:11
        </div>
      </div>
    ),
    { ...size },
  )
}