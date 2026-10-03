'use client'

import { useState } from 'react'
import { useField } from '@payloadcms/ui'
import type { JSONFieldClientComponent } from 'payload'
import { formatConsentCopy, readConsentJournal } from '@/lib/consents'

export const ConsentJournal: JSONFieldClientComponent = ({ path }) => {
  const { value } = useField<unknown>({ path })
  const entries = readConsentJournal(value)
  const text = formatConsentCopy(entries)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  if (entries.length === 0) {
    return <p style={{ margin: 0, opacity: 0.7 }}>Согласия по этому заказу ещё не записаны</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <button type="button" onClick={copy}>
          {copied ? 'Скопировано' : 'Скопировать журнал'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {entries.map((entry, index) => (
          <pre
            key={`${entry.kind}-${entry.at}-${index}`}
            style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
          >
            {formatConsentCopy([entry])}
          </pre>
        ))}
      </div>
    </div>
  )
}
