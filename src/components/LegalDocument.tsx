import Reveal from '@/components/Reveal'
import { LEGAL_EDITION_ISO } from '@/lib/consents'
import type { LegalSection } from '@/lib/legal-copy'
import styles from '@/app/(site)/pages/[slug]/page.module.css'

type Props = {
  title: string
  edition: string
  version: string
  sections: LegalSection[]
}

export default function LegalDocument({ title, edition, version, sections }: Props) {
  return (
    <div className={`${styles.page} scene-wash`}>
      <div className="container">
        <Reveal>
          <header className={styles.head}>
            <p className={`eyebrow ${styles.eyebrow}`}>Документ</p>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.meta} style={{ whiteSpace: 'normal' }}>
              Редакция от <time dateTime={LEGAL_EDITION_ISO}>{edition}</time>
              {' · '}
              версия {version}
            </p>
          </header>
        </Reveal>

        <div className={styles.body} style={{ hyphens: 'manual' }}>
          {sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>
                  <LinkedText text={paragraph} />
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function LinkedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi)
  return parts.map((part, index) => {
    if (/^https?:\/\//i.test(part)) {
      const url = part.replace(/[.,;]+$/, '')
      const tail = part.slice(url.length)
      return (
        <span key={index}>
          <a href={url}>{url}</a>
          {tail}
        </span>
      )
    }
    if (part.includes('@') && part.includes('.')) {
      return (
        <a key={index} href={`mailto:${part}`}>
          {part}
        </a>
      )
    }
    return <span key={index}>{part}</span>
  })
}
