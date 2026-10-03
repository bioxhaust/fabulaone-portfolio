import {
  AudioLines,
  Boxes,
  Brain,
  Fingerprint,
  Gem,
  Leaf,
} from 'lucide-react'
import styles from './FeatureRow.module.css'

/* Ряд преимуществ под героем — как на макете: иконка, короткий заголовок,
   пояснение. Содержание описывает метод (что внутри фабулы), а не условия
   покупки — условия закрывает FAQ и карточка товара. */
const FEATURES = [
  { icon: Boxes, title: '3D-звук', text: 'Погружает в состояние' },
  { icon: AudioLines, title: 'Скрытый речевой слой', text: 'Скрытый речевой слой' },
  { icon: Leaf, title: 'Природные звуки', text: 'Записаны в высоком качестве' },
  { icon: Brain, title: 'Научный подход', text: 'Основано на исследованиях' },
  { icon: Gem, title: 'Премиальное', text: 'Качество звука и мастеринг' },
  { icon: Fingerprint, title: 'Индивидуально', text: 'Программа под вашу цель' },
] as const

export default function FeatureRow() {
  return (
    <ul className={styles.row} id="features">
      {FEATURES.map((item) => {
        const Icon = item.icon
        return (
          <li className={styles.item} key={item.title}>
            <span className={styles.icon} aria-hidden>
              <Icon size={20} strokeWidth={1.5} />
            </span>
            <p className={styles.title}>{item.title}</p>
            <p className={styles.text}>{item.text}</p>
          </li>
        )
      })}
    </ul>
  )
}
