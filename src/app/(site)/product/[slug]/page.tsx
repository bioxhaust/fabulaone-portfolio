import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { Product } from '@/payload-types'
import CheckoutButton from '@/components/CheckoutButton'
import AudioPreview from '@/components/AudioPreview'
import Reveal from '@/components/Reveal'
import RichText from '@/components/RichText'
import ProductViewTracker from '@/components/ProductViewTracker'
import CoverImage from '@/components/CoverImage'
import StickyBuyBar from '@/components/StickyBuyBar'
import ReleaseList from '@/components/ReleaseList'
import { productCoverUrl, sceneryCover } from '@/lib/media'
import styles from './page.module.css'


export const dynamic = 'force-dynamic'
export const revalidate = 60

type Props = { params: Promise<{ slug: string }> }

async function getProduct(slug: string): Promise<Product | null> {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'products',
    where: { and: [{ slug: { equals: slug } }, { active: { equals: true } }] },
    limit: 1,
  })
  return (result.docs[0] as Product) ?? null
}

async function getRelated(slug: string): Promise<Product[]> {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'products',
    where: {
      and: [
        { active: { equals: true } },
        { slug: { not_equals: slug } },
      ],
    },
    sort: 'sortOrder',
    limit: 4,
  })
  return result.docs as Product[]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return {}
  const ogImage =
    product.seo?.ogImage && typeof product.seo.ogImage === 'object'
      ? (product.seo.ogImage as { url?: string | null }).url
      : null
  return {
    title: product.title,
    description: product.seo?.description ?? product.shortDescription ?? undefined,
    openGraph: { images: ogImage ? [ogImage] : [] },
  }
}

const INCLUDED = [
  { title: 'Полный файл 11:11', text: 'Одиннадцать минут одиннадцать секунд — столько длится фабула.' },
  { title: 'Ссылка после оплаты', text: 'Файл в кабинете и на почте, как только ЮKassa подтвердит платёж.' },
  { title: 'Ваш навсегда', text: 'Без подписки. Скачали — слушаете без интернета.' },
] as const

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) notFound()

  const related = await getRelated(slug)
  const cover = productCoverUrl(product)
  const fallback = sceneryCover(product.slug)

  const demoUrl =
    product.demoAudio && typeof product.demoAudio === 'object'
      ? (product.demoAudio as { url?: string | null }).url
      : null

  return (
    <div className={`${styles.page} scene-wash`}>
      <ProductViewTracker productId={product.id} slug={product.slug} price={product.price} />

      <div className={`container ${styles.inner}`}>
        <div className={styles.grid}>
          <div className={styles.coverWrap}>
            <Reveal from="scale">
              <figure className={styles.coverFrame}>
                <div className={styles.cover}>
                  <CoverImage
                    alt={product.title}
                    className={styles.coverImg}
                    fallback={fallback}
                    priority
                    sizes="(max-width:900px) 100vw, 58vw"
                    src={cover}
                  />
                </div>
              </figure>
            </Reveal>
          </div>

          <div className={styles.info}>
            <Reveal>
              <header>
                <div className={styles.headMeta}>
                  <p className="eyebrow">Аудиофабула</p>
                  <span className="timecode">{product.duration ?? '11:11'}</span>
                </div>
                <h1 className={styles.title}>{product.title}</h1>
              </header>
            </Reveal>

            {product.shortDescription && (
              <Reveal>
                <p className={styles.short}>{product.shortDescription}</p>
              </Reveal>
            )}

            {demoUrl && (
              <Reveal>
                <AudioPreview src={demoUrl} />
              </Reveal>
            )}

            <Reveal>
              <div className={styles.buyBlock} data-buy-panel>
                <div className={styles.priceWrap}>
                  <span className="eyebrow">Стоимость</span>
                  <span className={styles.price}>
                    {product.price.toLocaleString('ru-RU')}
                    <span className={styles.currency}>₽</span>
                  </span>
                </div>

                <CheckoutButton
                  productId={product.id}
                  productSlug={product.slug}
                  price={product.price}
                />
              </div>

              <p className={styles.hint}>
                Мгновенная доставка. Файл доступен в личном кабинете сразу после оплаты.
              </p>
            </Reveal>

            <StickyBuyBar
              price={product.price}
              productId={product.id}
              productSlug={product.slug}
              title={product.title}
            />
          </div>

          {product.description && (
            <div className={styles.bodyWrap}>
              <Reveal>
                <RichText content={product.description} className={styles.body} />
              </Reveal>
            </div>
          )}

          <section className={styles.included} aria-labelledby="included-title">
            <Reveal>
              <h2 id="included-title" className={styles.includedTitle}>
                Что входит
              </h2>
              <ul className={styles.includedList}>
                {INCLUDED.map((item) => (
                  <li key={item.title} className={styles.includedItem}>
                    <span className={styles.includedMark} aria-hidden />
                    <span>
                      <span className={styles.includedName}>{item.title}</span>
                      <span className={styles.includedText}>{item.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </section>
        </div>

        {related.length > 0 && (
          <section className={styles.related}>
            <Reveal>
              <h2 className={styles.relatedTitle}>Ещё в каталоге</h2>
              <ReleaseList
                items={related.map((p) => ({
                  id: p.id,
                  title: p.title,
                  href: `/product/${p.slug}`,
                  price: p.price,
                  duration: p.duration ?? '11:11',
                  slug: p.slug,
                  coverUrl: productCoverUrl(p),
                  shortDescription: p.shortDescription,
                }))}
              />
            </Reveal>
          </section>
        )}
      </div>
    </div>
  )
}
