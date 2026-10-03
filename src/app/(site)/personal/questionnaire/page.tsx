'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { OTHER_OPTION } from '@/lib/questionnaire-answers'
import OrderConsents from '@/components/OrderConsents'
import styles from './page.module.css'

type QField = {
  id: string
  label: string
  fieldType: 'text' | 'textarea' | 'select' | 'multiselect'
  required: boolean
  hint?: string
  options?: { value: string }[]
}

type Questionnaire = {
  id: string
  title: string
  fields: QField[]
}

/** Сколько вопросов показываем одним смысловым блоком. */
const SECTION_SIZE = 4

/** Режет плоский список полей на блоки, порядок сохраняется. */
function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

/** Поле считается заполненным, если в нём есть непустой ответ. */
function isFilled(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0
  return typeof value === 'string' && value.trim() !== ''
}

function otherKey(fieldId: string) {
  return `${fieldId}__other`
}

function fieldFilled(field: QField, answers: Record<string, string | string[]>): boolean {
  if (field.fieldType === 'select' && answers[field.id] === OTHER_OPTION) {
    return isFilled(answers[otherKey(field.id)])
  }
  return isFilled(answers[field.id])
}

/** Экран ожидания — он же fallback, пока читаются параметры ссылки. */
function LoadingScreen() {
  return (
    <div className={`${styles.center} scene-wash`}>
      
      <div className={styles.skeleton} aria-hidden>
        <span /><span /><span />
      </div>
      <p className={styles.centerText}>Загрузка анкеты…</p>
    </div>
  )
}

/* useSearchParams обязан быть под Suspense — без границы прод-сборка
   страницы падает с missing-suspense-with-csr-bailout. */
export default function QuestionnairePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <QuestionnaireForm />
    </Suspense>
  )
}

function QuestionnaireForm() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order') ?? ''
  const token = searchParams.get('token') ?? ''

  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [pdAccepted, setPdAccepted] = useState(false)
  const [marketingAccepted, setMarketingAccepted] = useState(false)
  const [pdError, setPdError] = useState('')

  useEffect(() => {
    if (!orderId) { setError('Неверная ссылка'); setLoading(false); return }

    let cancelled = false
    const qs = new URLSearchParams({ order: orderId })
    if (token) qs.set('token', token)

    ;(async () => {
      try {
        const auth = await fetch(`/api/personal/questionnaire?${qs}`, { credentials: 'include' })
        const authData = await auth.json().catch(() => ({}))
        if (cancelled) return
        if (!auth.ok) {
          setError(authData.error ?? 'Неверная ссылка')
          return
        }
        if (authData.status === 'pending_payment') {
          setError('Оплата ещё не подтверждена. Подождите немного и обновите страницу.')
          return
        }
        if (authData.status !== 'paid_questionnaire') {
          setDone(true)
          return
        }

        const form = await fetch('/api/questionnaire/active')
        const fields = form.ok ? await form.json() : null
        if (cancelled) return
        if (!fields) setError('Не удалось загрузить анкету')
        else setQuestionnaire(fields)
      } catch {
        if (!cancelled) setError('Не удалось загрузить анкету')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [orderId, token])

  function setAnswer(fieldId: string, value: string | string[]) {
    setAnswers(prev => ({ ...prev, [fieldId]: value }))
  }

  function toggleMulti(fieldId: string, option: string) {
    setAnswers(prev => {
      const current = (prev[fieldId] as string[] | undefined) ?? []
      return {
        ...prev,
        [fieldId]: current.includes(option)
          ? current.filter(v => v !== option)
          : [...current, option],
      }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setPdError('')

    if (!pdAccepted) {
      setPdError('Необходимо дать согласие на обработку персональных данных')
      return
    }

    // Validate required fields
    const outgoing: Record<string, string | string[]> = {}
    for (const f of questionnaire?.fields ?? []) {
      let val = answers[f.id]
      if (f.fieldType === 'select' && val === OTHER_OPTION) {
        const rawOther = answers[otherKey(f.id)]
        const custom = typeof rawOther === 'string' ? rawOther.trim() : ''
        if (!custom) { setError('Напишите свой вариант для «Другое»'); return }
        val = `Другое: ${custom}`
      }
      if (f.required && !isFilled(val)) {
        setError(`Поле «${f.label}» обязательное`)
        return
      }
      if (isFilled(val) && val !== undefined) outgoing[f.id] = val
    }

    setSubmitting(true)
    try {
      const r = await fetch('/api/personal/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId,
          ...(token ? { token } : {}),
          answers: outgoing,
          pdAccepted: true,
          marketingAccepted,
        }),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error ?? 'Ошибка отправки'); return }
      setDone(true)
    } catch {
      setError('Сетевая ошибка. Попробуйте ещё раз.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingScreen />
  }

  if (error && !questionnaire) {
    return (
      <div className={`${styles.center} scene-wash`}>
        
        <p className={styles.centerText} role="alert">{error}</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className={`${styles.page} scene-wash`}>
        
        <div className="container">
          <div className={styles.done}>
            <span className={styles.doneIcon} aria-hidden>✓</span>
            <p className="eyebrow">Готово</p>
            <h1 className={styles.doneTitle}>Анкета отправлена!</h1>
            <p className={styles.doneText}>
              Мы приступим к созданию вашей персональной фабулы в течение рабочего дня.
              Готовый файл появится в личном кабинете, и вы получите письмо.
            </p>
            <div className={styles.doneActions}>
              <Link href="/cabinet" className="btn btn-primary btn-lg">Мои покупки</Link>
              <Link href="/" className="btn btn-ghost">На главную</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!questionnaire) {
    return (
      <div className={`${styles.center} scene-wash`}>
        
        <p className={styles.centerText}>Анкета не найдена</p>
      </div>
    )
  }

  const fields = questionnaire.fields
  const total = fields.length
  const filledCount = fields.filter(f => fieldFilled(f, answers)).length
  const percent = total > 0 ? Math.round((filledCount / total) * 100) : 0
  const sections = chunk(fields, SECTION_SIZE)

  /** Разметка одного вопроса. Логика ответа не меняется — только вид. */
  function renderField(field: QField, index: number) {
    const filled = fieldFilled(field, answers)
    // У множественного выбора нет одного контрола: заголовок такого вопроса
    // не может быть <label for=…> — ссылка вела бы в никуда.
    const isMulti = field.fieldType === 'multiselect'

    const labelInner = (
      <>
        <span className={styles.qNum} aria-hidden>
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className={styles.qText}>
          {field.label}
          {field.required && <span className={styles.qReq}> *</span>}
        </span>
      </>
    )

    return (
      <div
        key={field.id}
        className={`${styles.q} ${filled ? styles.qFilled : ''}`}
      >
        {isMulti ? (
          <span className={styles.qLabel}>{labelInner}</span>
        ) : (
          <label className={styles.qLabel} htmlFor={field.id}>
            {labelInner}
          </label>
        )}

        {field.fieldType === 'text' && (
          <input
            id={field.id} type="text" className={`input ${styles.control}`}
            value={(answers[field.id] as string) ?? ''}
            onChange={e => setAnswer(field.id, e.target.value)}
            required={field.required}
          />
        )}

        {field.fieldType === 'textarea' && (
          <textarea
            id={field.id} className={`input ${styles.control} ${styles.textarea}`} rows={4}
            value={(answers[field.id] as string) ?? ''}
            onChange={e => setAnswer(field.id, e.target.value)}
            required={field.required}
            style={{ resize: 'vertical' }}
            /* колесо внутри длинного ответа не перехватывается инерцией */
            data-native-scroll
          />
        )}

        {field.fieldType === 'select' && (
          <select
            id={field.id} className={`input ${styles.control} ${styles.select}`}
            value={(answers[field.id] as string) ?? ''}
            onChange={e => setAnswer(field.id, e.target.value)}
            required={field.required}
          >
            <option value="">— выберите —</option>
            {field.options?.map(o => (
              <option key={o.value} value={o.value}>{o.value}</option>
            ))}
          </select>
        )}

        {field.fieldType === 'select' && answers[field.id] === OTHER_OPTION && (
          <input
            type="text"
            className={`input ${styles.control} ${styles.other}`}
            value={(answers[otherKey(field.id)] as string) ?? ''}
            onChange={e => setAnswer(otherKey(field.id), e.target.value)}
            placeholder="Свой вариант"
            aria-label="Свой вариант"
            required
          />
        )}

        {field.fieldType === 'multiselect' && (
          <div className={styles.multiOptions} role="group" aria-labelledby={`${field.id}-label`}>
            <span id={`${field.id}-label`} className={styles.srOnly}>{field.label}</span>
            {field.options?.map(o => (
              <label key={o.value} className={styles.option}>
                <input
                  type="checkbox"
                  className={styles.optionInput}
                  checked={((answers[field.id] as string[]) ?? []).includes(o.value)}
                  onChange={() => toggleMulti(field.id, o.value)}
                />
                <span>{o.value}</span>
              </label>
            ))}
          </div>
        )}

        {field.hint && <p className={styles.hint}>{field.hint}</p>}
      </div>
    )
  }

  return (
    <div className={`${styles.page} scene-wash`}>
      
      <div className="container">
        <div className={styles.layout}>
          <header className={styles.head}>
            <p className={`eyebrow ${styles.eyebrow}`}>Персональная фабула</p>
            <h1 className={styles.heading}>{questionnaire.title}</h1>
            <p className={styles.sub}>
              Ответьте на вопросы — это поможет нам создать фабулу именно для вас.
            </p>
          </header>

          {/* Прогресс липнет под шапкой — виден на всей длине анкеты */}
          <div className={styles.progress}>
            <div className={styles.progressHead}>
              <span className={styles.progressLabel}>Заполнено</span>
              <span className={styles.progressCount}>
                {filledCount} из {total}
              </span>
            </div>
            <div
              className={styles.track}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label="Прогресс заполнения анкеты"
            >
              <span className={styles.fill} style={{ width: `${percent}%` }} />
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className={styles.form}>
            {sections.map((group, si) => {
              const offset = si * SECTION_SIZE
              const groupFilled = group.filter(f => fieldFilled(f, answers)).length
              const groupDone = groupFilled === group.length

              return (
                <section
                  key={si}
                  className={styles.section}
                  style={{ '--i': si } as React.CSSProperties}
                >
                  <div className={styles.sectionHead} aria-hidden>
                    <span className={styles.sectionNum}>
                      {String(si + 1).padStart(2, '0')}
                    </span>
                    <span className={styles.sectionLine} />
                    <span
                      className={`${styles.sectionCount} ${groupDone ? styles.sectionCountDone : ''}`}
                    >
                      {groupFilled}/{group.length}
                    </span>
                  </div>

                  <div className={styles.sectionBody}>
                    {group.map((field, fi) => renderField(field, offset + fi))}
                  </div>
                </section>
              )
            })}

            <div className={styles.footer}>
              <OrderConsents
                pdAccepted={pdAccepted}
                marketingAccepted={marketingAccepted}
                onPd={(value) => { setPdAccepted(value); setPdError('') }}
                onMarketing={setMarketingAccepted}
                pdError={pdError}
              />

              {error && (
                <p className={`error-text ${styles.errorBox}`} role="alert">{error}</p>
              )}

              <button
                type="submit"
                className={`btn btn-primary btn-lg ${styles.submit}`}
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting ? 'Отправляем…' : 'Отправить анкету'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
