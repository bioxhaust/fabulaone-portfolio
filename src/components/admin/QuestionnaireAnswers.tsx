'use client'

import { useState } from 'react'
import { useField } from '@payloadcms/ui'
import type { JSONFieldClientComponent } from 'payload'
import { formatQuestionnaireCopy, readQuestionnaireItems } from '@/lib/questionnaire-answers'

export const QuestionnaireAnswers: JSONFieldClientComponent = ({ path }) => {
  const { value } = useField<unknown>({ path })
  const items = readQuestionnaireItems(value)
  const text = formatQuestionnaireCopy(items)
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

  if (items.length === 0) {
    return <p style={{ margin: 0, opacity: 0.7 }}>Анкета ещё не заполнена</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <button type="button" onClick={copy}>
          {copied ? 'Скопировано' : 'Скопировать анкету'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((item) => (
          <div key={item.question}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.question}</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{item.answer}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
