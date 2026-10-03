/**
 * ВРЕМЕННАЯ ЗАГЛУШКА.
 *
 * Payload автоматически перезапишет этот файл при первом запуске dev-сервера
 * (или командой `npm run generate:types`, когда БД будет доступна).
 * Правки здесь не сохранятся — меняйте схему в src/collections/*.
 *
 * ID имеют тип string, т.к. в payload.config.ts задан idType: 'uuid'.
 */

export interface RichText {
  root: {
    type: string
    children: { [k: string]: unknown; type: string; version: number }[]
    direction: ('ltr' | 'rtl') | null
    format: '' | 'left' | 'start' | 'center' | 'right' | 'end' | 'justify'
    indent: number
    version: number
  }
  [k: string]: unknown
}

export interface Media {
  id: string
  alt?: string | null
  url?: string | null
  filename?: string | null
  mimeType?: string | null
  filesize?: number | null
  width?: number | null
  height?: number | null
  sizes?: {
    thumbnail?: { url?: string | null; width?: number | null; height?: number | null }
    cover?: { url?: string | null; width?: number | null; height?: number | null }
    og?: { url?: string | null; width?: number | null; height?: number | null }
  }
  updatedAt: string
  createdAt: string
}

export interface ProductAudio {
  id: string
  title?: string | null
  prefix?: string | null
  url?: string | null
  filename?: string | null
  mimeType?: string | null
  filesize?: number | null
  updatedAt: string
  createdAt: string
}

export interface Product {
  id: string
  title: string
  slug: string
  shortDescription?: string | null
  description?: RichText | null
  cover: string | Media
  duration?: string | null
  demoAudio?: (string | null) | Media
  fullAudio?: (string | null) | ProductAudio
  fullAudioKey?: string | null
  price: number
  active?: boolean | null
  sortOrder?: number | null
  seo?: {
    title?: string | null
    description?: string | null
    ogImage?: (string | null) | Media
  }
  updatedAt: string
  createdAt: string
}

export interface Customer {
  id: string
  email: string
  name?: string | null
  phone?: string | null
  consentGiven?: boolean | null
  consentAt?: string | null
  consentIp?: string | null
  consentVersion?: string | null
  marketingConsent?: boolean | null
  marketingConsentAt?: string | null
  marketingConsentVersion?: string | null
  deletionRequested?: boolean | null
  updatedAt: string
  createdAt: string
}

export interface Partner {
  id: string
  name: string
  email: string
  refCode: string
  referralLink?: string | null
  commissionRate: number
  active?: boolean | null
  balance?: number | null
  totalEarned?: number | null
  totalPaid?: number | null
  totalClicks?: number | null
  totalOrders?: number | null
  totalSales?: number | null
  updatedAt: string
  createdAt: string
}

export interface PromoCode {
  id: string
  code: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  active?: boolean | null
  expiresAt?: string | null
  usageLimit?: number | null
  usedCount?: number | null
  applicableProducts?: (string | Product)[] | null
  partner?: (string | null) | Partner
  updatedAt: string
  createdAt: string
}

export interface Order {
  id: string
  orderNumber: string
  customer: string | Customer
  product: string | Product
  amount: number
  originalAmount?: number | null
  status: 'pending' | 'paid' | 'refunded' | 'cancelled'
  yookassaPaymentId?: string | null
  yookassaStatus?: string | null
  paymentMethod?: ('bank_card' | 'sbp' | 'yoo_money' | 'other') | null
  refundedAt?: string | null
  partner?: (string | null) | Partner
  promoCode?: (string | null) | PromoCode
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmContent?: string | null
  utmTerm?: string | null
  refCode?: string | null
  offerAccepted?: boolean | null
  offerAcceptedAt?: string | null
  consentIp?: string | null
  consentJournal?: unknown
  paidAt?: string | null
  updatedAt: string
  createdAt: string
}

export interface PersonalOrder {
  id: string
  orderNumber: string
  customer: string | Customer
  status: 'pending_payment' | 'paid_questionnaire' | 'questionnaire_done' | 'in_progress' | 'ready'
  amount?: number | null
  yookassaPaymentId?: string | null
  questionnaireAnswers?: unknown
  readyAudio?: (string | null) | ProductAudio
  audioKey?: string | null
  adminNote?: string | null
  partner?: (string | null) | Partner
  refCode?: string | null
  utmSource?: string | null
  paidAt?: string | null
  consentIp?: string | null
  consentJournal?: unknown
  updatedAt: string
  createdAt: string
}

export interface PartnerEarning {
  id: string
  partner: string | Partner
  order?: (string | null) | Order
  personalOrder?: (string | null) | PersonalOrder
  amount: number
  rate: number
  status: 'pending' | 'earned' | 'paid' | 'cancelled'
  paidAt?: string | null
  updatedAt: string
  createdAt: string
}

export interface Questionnaire {
  id: string
  title: string
  active?: boolean | null
  fields?:
    | {
        id?: string | null
        label: string
        fieldType: 'text' | 'textarea' | 'select' | 'multiselect'
        required?: boolean | null
        options?: { id?: string | null; value?: string | null }[] | null
        hint?: string | null
        order?: number | null
      }[]
    | null
  updatedAt: string
  createdAt: string
}

export interface Page {
  id: string
  title: string
  slug: string
  content?: RichText | null
  seoTitle?: string | null
  seoDescription?: string | null
  updatedAt: string
  createdAt: string
}

export interface User {
  id: string
  email: string
  name?: string | null
  role?: ('admin' | 'editor') | null
  updatedAt: string
  createdAt: string
}

export interface Config {
  collections: {
    users: User
    products: Product
    'product-audio': ProductAudio
    media: Media
    orders: Order
    customers: Customer
    partners: Partner
    'partner-earnings': PartnerEarning
    'promo-codes': PromoCode
    'personal-orders': PersonalOrder
    questionnaires: Questionnaire
    pages: Page
  }
}

declare module 'payload' {
  export interface GeneratedTypes extends Config {}
}
