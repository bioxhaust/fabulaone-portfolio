import type { Metadata } from 'next'
import LegalDocument from '@/components/LegalDocument'
import { PD_CONSENT_VERSION } from '@/lib/consents'
import { privacyDocument } from '@/lib/legal-copy'

const SITE = 'https://fabulaone.ru'

export const metadata: Metadata = {
  title: 'Политика обработки персональных данных',
  description: 'Политика обработки персональных данных сайта FABULA ONE.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  const document = privacyDocument(SITE)
  return <LegalDocument {...document} version={PD_CONSENT_VERSION} />
}
