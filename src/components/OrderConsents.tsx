'use client'

import Link from 'next/link'
import { ADS_CONSENT_PATH, PD_CONSENT_PATH, PRIVACY_PATH } from '@/lib/consents'
import styles from './OrderConsents.module.css'

type Props = {
  pdAccepted: boolean
  marketingAccepted: boolean
  onPd: (value: boolean) => void
  onMarketing: (value: boolean) => void
  pdError?: string
}

export default function OrderConsents({
  pdAccepted,
  marketingAccepted,
  onPd,
  onMarketing,
  pdError,
}: Props) {
  return (
    <div className={styles.consents}>
      <div className="field">
        <label className="checkbox-wrap">
          <input
            type="checkbox"
            checked={pdAccepted}
            onChange={(event) => onPd(event.target.checked)}
            aria-invalid={pdError ? true : undefined}
            aria-describedby={pdError ? 'pd-consent-err' : undefined}
          />
          <span className={styles.checkLabel}>
            Я даю согласие на обработку моих персональных данных в соответствии с{' '}
            <Link href={PD_CONSENT_PATH} target="_blank" rel="noopener noreferrer" className={styles.link}>«Согласием на обработку персональных данных»</Link>
            {' '}и ознакомлен(а) с{' '}
            <Link href={PRIVACY_PATH} target="_blank" rel="noopener noreferrer" className={styles.link}>«Политикой обработки персональных данных»</Link>.
          </span>
        </label>
        {pdError && (
          <p id="pd-consent-err" className="error-text" role="alert">
            {pdError}
          </p>
        )}
      </div>

      <div className="field">
        <label className="checkbox-wrap">
          <input
            type="checkbox"
            checked={marketingAccepted}
            onChange={(event) => onMarketing(event.target.checked)}
          />
          <span className={styles.checkLabel}>
            Я согласен(на) получать{' '}
            <Link href={ADS_CONSENT_PATH} target="_blank" rel="noopener noreferrer" className={styles.link}>рекламные и информационные сообщения</Link>
            {' '}о продуктах и предложениях FABULA ONE.
          </span>
        </label>
        <p className={styles.hint}>Необязательно. Отказ не мешает оформить заказ.</p>
      </div>
    </div>
  )
}
