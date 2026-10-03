import styles from './template.module.css'

/* App Router template: в отличие от layout он ремонтируется при КАЖДОЙ
   навигации внутри группы (site). Это даёт мягкое проявление входящей
   страницы — та самая «плавная анимация между переключениями вкладок».

   Почему так, а не motion/react: анимация чисто CSS, значит не ждёт
   гидратации JS — текст героя LCP рисуется сразу из SSR-разметки, а не
   прячется скриптом. База — opacity:1 (никакого opacity:0-капкана), а
   само проявление живёт под @media (prefers-reduced-motion: no-preference),
   поэтому пользователям с запросом на уменьшение движения переход мгновенный.
   Анимируем ТОЛЬКО opacity: transform создал бы containing-block для
   position:fixed-потомков (модалка видео и т.п.) и дёргал бы их. */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className={styles.page}>{children}</div>
}
