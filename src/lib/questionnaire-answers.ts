/** Saved with the order so later edits to the form do not rewrite old answers. */
export type QuestionnaireItem = {
  question: string
  answer: string
}

export const OTHER_OPTION = 'Другое'

export function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean).join(', ')
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}

export function readQuestionnaireItems(value: unknown): QuestionnaireItem[] {
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>

  if (Array.isArray(record.items)) {
    return record.items.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const question = formatAnswer((item as { question?: unknown }).question)
      if (!question) return []
      const answer = formatAnswer((item as { answer?: unknown }).answer)
      return [{ question, answer: answer || '—' }]
    })
  }

  return Object.entries(record)
    .filter(([key]) => key !== 'items')
    .map(([question, answer]) => ({
      question,
      answer: formatAnswer(answer) || '—',
    }))
}

/** Plain text for the admin copy button. */
export function formatQuestionnaireCopy(items: QuestionnaireItem[]): string {
  return items.map((item) => `${item.question}\n${item.answer}`).join('\n\n')
}

export function buildStoredAnswers(
  fields: { id?: string | null; label: string; order?: number | null }[],
  answers: Record<string, string | string[]>,
): { items: QuestionnaireItem[] } {
  const sorted = [...fields].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
  return {
    items: sorted.flatMap((field) => {
      if (!field.id || !field.label) return []
      const answer = formatAnswer(answers[field.id])
      return [{ question: field.label, answer: answer || '—' }]
    }),
  }
}
