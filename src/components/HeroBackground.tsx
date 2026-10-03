import { heroLandscapeMobileUrl, heroLandscapeUrl } from '@/lib/hero-assets'
import styles from './HeroBackground.module.css'

/**
 * Полноэкранный фон героя: одно кинематографичное фото под первым экраном,
 * затем плавный переход в плоский --color-surface-0. Серверный компонент —
 * ассет резолвится из /public через hero-assets (файла нет → ничего не
 * рендерим, герой ложится на плоский фон).
 *
 * <picture>: телефону отдаём вертикальный кадр, остальным — горизонтальный.
 * Картинка декоративная (alt=""), но она — LCP: fetchPriority="high",
 * без lazy. Затемняющие вуали (.scrim) обязательны — без них текст поверх
 * фото не гарантирован по контрасту (см. page.module.css: тень у заголовка
 * страхует локальные светлые участки кадра).
 */
export default function HeroBackground() {
  const desktop = heroLandscapeUrl()
  const mobile = heroLandscapeMobileUrl()

  const primary = desktop ?? mobile
  if (!primary) return null

  return (
    <div className={styles.bg} aria-hidden>
      <picture>
        {mobile ? (
          <source media="(max-width: 767px)" srcSet={mobile} width={1440} height={2580} />
        ) : null}
        <img
          className={styles.img}
          src={primary}
          alt=""
          width={3840}
          height={2143}
          decoding="async"
          fetchPriority="high"
        />
      </picture>
      <div className={styles.scrim} />
    </div>
  )
}
