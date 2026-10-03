import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Golos_Text, Inter, Playfair_Display } from 'next/font/google'
import SiteHeader from '@/components/SiteHeader'
import Footer from '@/components/Footer'
import '../globals.css'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fabulaone.ru'
const YM_ID = process.env.NEXT_PUBLIC_YM_ID ?? ''

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
})

const golos = Golos_Text({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-golos',
  display: 'swap',
  weight: ['400', '500', '600'],
})

/* Playfair Display — крупная редакционная антиква героя и цитат. Кириллица
   у семейства есть, курсив тоже: заголовок «рождаются в тишине.» ставит
   вставку курсивом. display:swap — текст LCP не ждёт загрузки шрифта, а
   рисуется системной антиквой из --font-serif и подменяется. */
const playfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  /* Цвет строки состояния браузера обязан совпадать с фоном страницы, иначе
     на мобильном над сайтом висит полоса чужого цвета. #0f0d0b — хвост
     прежнего тёплого направления (near-black + шампанское золото); теперь
     здесь --color-surface-0, посчитанный scripts/check-palette.mjs. */
  themeColor: '#050815',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'FABULA ONE — Звук глубже слов',
    template: '%s | FABULA ONE',
  },
  description:
    'Цифровые аудиофабулы для глубокого расслабления, фокуса и внутреннего путешествия. Каждая — 11 минут 11 секунд.',
  openGraph: {
    siteName: 'FABULA ONE',
    locale: 'ru_RU',
    type: 'website',
    title: 'FABULA ONE — Звук глубже слов',
    description:
      'Цифровые аудиофабулы для глубокого расслабления, фокуса и внутреннего путешествия.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FABULA ONE — Звук глубже слов',
    description:
      'Цифровые аудиофабулы для глубокого расслабления, фокуса и внутреннего путешествия.',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
  robots: { index: true, follow: true },
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${golos.variable} ${playfair.variable}`}>
      <body>
        {YM_ID ? (
          <Script id="ym-init" strategy="afterInteractive">{`
            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
            ym(${YM_ID},"init",{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",accurateTrackBounce:true,trackLinks:true});
          `}</Script>
        ) : null}

        <SiteHeader />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
