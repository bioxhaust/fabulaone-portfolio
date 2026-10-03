import type { Metadata } from 'next'
import Link from 'next/link'
import Reveal from '@/components/Reveal'
import styles from './page.module.css'


export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Персональная аудиофабула',
  description:
    'Создаём аудиофабулу специально для вас — по вашей истории, образам и намерению.',
}

const PRICE = 9900

export default function PersonalPage() {
  return (
    <div className={styles.page}>
      {/* ── Геройский блок ─────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <p className={`eyebrow ${styles.heroEyebrow}`}>Эксклюзивно</p>

          <h1 className={styles.title}>
            <span>Персональная</span>
            <span>фабула</span>
          </h1>

          <p className={styles.subtitle}>
            Аудиофабула, созданная специально для вас. Мы берём вашу историю,
            ваши образы и намерение — и создаём уникальное звуковое путешествие длиной 11&nbsp;минут&nbsp;11&nbsp;секунд.
          </p>

          <div className={styles.heroActions}>
            <Link className="btn btn-primary btn-lg" href="/personal/checkout">
              Заказать персональную
            </Link>
            <span className="timecode">11:11</span>
          </div>
        </div>
      </section>

      {/* ── Как это работает ───────────────────────────────────── */}
      <section className={`section ${styles.steps}`}>
        <div className="container">
          <Reveal>
            <header className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>Как это работает</h2>
              <p className={styles.sectionMeta}>
                01 — {String(STEPS.length).padStart(2, '0')}
              </p>
            </header>
          </Reveal>

          <Reveal>
            <ol className={styles.stepList}>
              {STEPS.map((s, i) => (
                <li key={i} className={styles.step}>
                  <span className={styles.stepNum} aria-hidden>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepText}>{s.text}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* ── Вопросы ────────────────────────────────────────────── */}
      <section className={`section-sm ${styles.faq}`}>
        <div className="container">
          <Reveal>
            <header className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>Вопросы</h2>
              <p className={styles.sectionMeta}>
                01 — {String(FAQ.length).padStart(2, '0')}
              </p>
            </header>
          </Reveal>

          <Reveal>
            {/* Нативные details/summary: доступно с клавиатуры и работает без JS */}
            <div className={styles.faqList}>
              {FAQ.map((item, i) => (
                <details key={i} className={styles.faqItem}>
                  <summary className={styles.faqSummary}>
                    <span className={styles.faqNum} aria-hidden>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className={styles.faqQuestion}>{item.q}</span>
                    <span className={styles.faqToggle} aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M1.75 4.75L7 10l5.25-5.25"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </summary>

                  <div className={styles.faqBody}>
                    <p className={styles.faqAnswer}>{item.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Финальный CTA ──────────────────────────────────────── */}
      <section className={styles.ctaSection}>
        <div className="container">
          <Reveal from="scale">
            <div className={styles.cta}>
              <div className={styles.ctaInfo}>
                <p className="eyebrow">Стоимость</p>
                <p className={styles.ctaPrice}>{PRICE.toLocaleString('ru-RU')} ₽</p>
                <p className={styles.ctaHint}>Срок изготовления — до 7 рабочих дней</p>
              </div>
              <Link className="btn btn-primary btn-lg" href="/personal/checkout">
                Заказать персональную
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}

const STEPS = [
  {
    title: 'Оплата и анкета',
    text: 'После оплаты вы получите анкету, где расскажете о себе: жизненный контекст, образы, состояние, которого хотите достичь.',
  },
  {
    title: 'Создание',
    text: 'Мы изучаем ваши ответы и создаём уникальный текст и звуковую палитру — специально для вас.',
  },
  {
    title: 'Передача файла',
    text: 'Готовый файл появляется в вашем личном кабинете. Вы получаете ссылку на скачивание по email.',
  },
]

const FAQ = [
  {
    q: 'Чем персональная фабула отличается от каталожной?',
    a: 'В каталоге — фабулы для общих состояний. Персональная пишется под вашу историю: текст, образы и звуковая палитра существуют в единственном экземпляре.',
  },
  {
    q: 'Что нужно от меня?',
    a: 'Только заполненная анкета. Вопросы открытые: жизненный контекст, важные для вас образы, состояние, к которому хотите прийти. Чем честнее ответы, тем точнее результат.',
  },
  {
    q: 'Сколько ждать готовую фабулу?',
    a: 'До 7 рабочих дней. Если по анкете понадобится что-то уточнить, мы напишем на указанный вами email.',
  },
  {
    q: 'В каком формате приходит запись?',
    a: 'MP3. Файл появляется в личном кабинете, ссылка на скачивание дублируется письмом на email.',
  },
  {
    q: 'Как её слушать?',
    a: 'Наушники, тихое место и одиннадцать минут, которые никто не прервёт. Закрывайте глаза и отправляйтесь внутрь.',
  },
]
