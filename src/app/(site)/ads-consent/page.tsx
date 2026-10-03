import type { Metadata } from 'next'
import LegalDocument from '@/components/LegalDocument'
import { ADS_CONSENT_VERSION } from '@/lib/consents'
import { adsConsentDocument } from '@/lib/legal-copy'

export const metadata: Metadata = {
  title: 'Согласие на получение рекламы',
  description: 'Отдельное согласие на рекламные сообщения FABULA ONE.',
  alternates: { canonical: '/ads-consent' },
}

export default function AdsConsentPage() {
  const document = adsConsentDocument()
  return <LegalDocument {...document} version={ADS_CONSENT_VERSION} />
}
