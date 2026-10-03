import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { Metadata } from 'next'
import Reveal from '@/components/Reveal'
import RichText from '@/components/RichText'
import styles from './page.module.css'


export const dynamic = 'force-dynamic'
export const revalidate = 3600

type Props = { params: Promise<{ slug: string }> }

async function getPage(slug: string) {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  return result.docs[0] ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) return {}
  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? undefined,
  }
}

export default async function LegalPage({ params }: Props) {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) notFound()

  const updated = formatUpdated(page.updatedAt)

  return (
    <div className={`${styles.page} scene-wash`}>
      
      <div className="container">
        <Reveal>
          <header className={styles.head}>
            <p className={`eyebrow ${styles.eyebrow}`}>Документ</p>
            <h1 className={styles.title}>{page.title}</h1>
            {updated && (
              <p className={styles.meta}>
                Редакция от <time dateTime={page.updatedAt}>{updated}</time>
              </p>
            )}
          </header>
        </Reveal>

        {page.content && (
          <RichText content={page.content} className={styles.body} />
        )}
      </div>
    </div>
  )
}

/** Дата последней редакции документа: «10 сентября 2026». */
function formatUpdated(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
