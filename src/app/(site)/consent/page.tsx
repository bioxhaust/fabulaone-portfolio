import type { Metadata } from 'next'
import LegalDocument from '@/components/LegalDocument'
import { PD_CONSENT_VERSION } from '@/lib/consents'
import { pdConsentDocument } from '@/lib/legal-copy'

const SITE = 'https://fabulaone.ru'

export const metadata: Metadata = {
  title: 'Согласие на обработку персональных данных',
  description: 'Согласие на обработку персональных данных на сайте FABULA ONE.',
  alternates: { canonical: '/consent' },
}

export default function ConsentPage() {
  const document = pdConsentDocument(SITE)
  return <LegalDocument {...document} version={PD_CONSENT_VERSION} />
}
