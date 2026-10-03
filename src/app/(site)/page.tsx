import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { Product } from '@/payload-types'
import Link from 'next/link'
import { ArrowRight, Headphones } from 'lucide-react'
import CatalogCarousel from '@/components/CatalogCarousel'
import FeatureRow from '@/components/FeatureRow'
import HeroBackground from '@/components/HeroBackground'
import HeroCta from '@/components/HeroCta'
import Reveal from '@/components/Reveal'
import { productCoverUrl } from '@/lib/media'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'
export const revalidate = 60

async function getProducts(): Promise<Product[]> {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'products',
    where: { active: { equals: true } },
    sort: 'sortOrder',
    limit: 20,
  })
  return result.docs as Product[]
}

/* Ключевые направления — декоративный правый столбец героя, как на макете.
   Не завязаны на каталог: это обещание бренда, а не список товаров. */
export default async function HomePage() {
  const products = await getProducts()

  return (
    <section className={styles.stage}>
      <HeroBackground />
      <div className={styles.stageInner}>
        <header className={styles.hero} id="top">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>
              <span>Звук</span>
              <span className={styles.kickerDot} aria-hidden />
              <span>Природа</span>
              <span className={styles.kickerDot} aria-hidden />
              <span>Подсознание</span>
            </p>
            <h1 className={styles.heroTitle}>
              Реальные изменения
              <br />
              рождаются <em>в тишине.</em>
            </h1>
            <p className={styles.heroSub}>
              Персонализированные аудиофабулы, которые раскрывают ваш
              потенциал через силу звука, природы и подсознания. Каждая —
              ровно 11:11.
            </p>
            <HeroCta />
          </div>

          <aside className={styles.infoCard}>
            <span className={styles.infoBar} aria-hidden />
            <span className={styles.infoIcon} aria-hidden>
              <Headphones size={20} strokeWidth={1.75} />
            </span>
            <div className={styles.infoText}>
              <strong>Слушайте в наушниках</strong>
              <span>3D-звук раскрывается в стерео · 11 минут 11 секунд</span>
            </div>
          </aside>

          <a className={styles.scrollCue} href="#features" aria-label="Листайте вниз">
            <span>Листайте вниз</span>
            <span className={styles.scrollLine} aria-hidden />
          </a>
        </header>
        {/* SECTIONS-MARKER */}

        <FeatureRow />
      </div>

      <Reveal>
        <section className={styles.catalog} id="catalog">
            <header className={styles.catalogHead}>
              <h2 className={styles.catalogTitle}>
                6 фабул · 6 направлений · 1 новая ты
              </h2>
              <p className={styles.catalogMeta}>
                Стартовый набор · 6 аудиофабул · 11:11 каждая
              </p>
            </header>

            {products.length === 0 ? (
              <p className={styles.empty}>Скоро здесь появятся фабулы</p>
            ) : (
              <CatalogCarousel
                items={products.map((p) => ({
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
            )}
        </section>
      </Reveal>

      <div className={styles.stageInner}>
        <Reveal>
          <figure className={styles.quote}>
            <blockquote>
              «Звук — это мост между тем, где ты есть, и тем, кем ты можешь
              стать.»
            </blockquote>
            <figcaption>FABULA ONE</figcaption>
          </figure>
        </Reveal>

        <Reveal from="scale">
          <section className={styles.personal}>
            <div className={styles.personalInner}>
              <p className={styles.personalKicker}>FABULA ONE · PERSONAL</p>
              <h2 className={styles.personalTitle}>Фабула под вашу цель</h2>
              <p className={styles.personalText}>
                Заполните короткую анкету — соберём индивидуальную программу
                звука и скрытого речевого слоя под вашу задачу.
              </p>
              <Link className={styles.personalCta} href="/personal">
                Собрать персональную фабулу
                <ArrowRight aria-hidden size={18} strokeWidth={2} />
              </Link>
            </div>
          </section>
        </Reveal>
      </div>
    </section>
  )
}
