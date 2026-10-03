import type { CollectionConfig } from 'payload'
import { consentJournalField } from '../fields/consentJournal'
import { resolveProductAudioKey } from '../lib/storage'

export const PersonalOrders: CollectionConfig = {
  slug: 'personal-orders',
  admin: {
    useAsTitle: 'orderNumber',
    group: 'PERSONAL',
    defaultColumns: ['orderNumber', 'customer', 'status', 'createdAt'],
  },
  access: {
    read: ({ req }) => req.user?.role === 'admin',
    create: () => true,
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        const audio = data?.readyAudio
        const audioId = typeof audio === 'string' ? audio : audio?.id
        if (!audioId) return data
        const key = await resolveProductAudioKey({ fullAudio: audioId }, req.payload)
        if (key) data.audioKey = key
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        const becameReady = doc.status === 'ready' && previousDoc?.status !== 'ready'
        const fileAdded = Boolean(doc.audioKey) && !previousDoc?.audioKey && doc.status === 'ready'
        if (!becameReady && !fileAdded) return
        if (!doc.audioKey) return

        const { sendPersonalReady } = await import('../lib/email')
        const { enqueue } = await import('../lib/queue')
        const { signMagicToken } = await import('../lib/magic-link')
        const { publicSiteOrigin } = await import('../lib/site-url')

        const customerId = typeof doc.customer === 'string' ? doc.customer : doc.customer?.id
        if (!customerId) return

        try {
          const customer = await req.payload.findByID({
            collection: 'customers',
            id: customerId,
          })
          if (!customer.email) return

          const token = await signMagicToken({ sub: customer.id, email: customer.email })
          const downloadUrl = `${publicSiteOrigin()}/api/personal-download/${doc.id}?token=${encodeURIComponent(token)}`
          await sendPersonalReady({
            email: customer.email,
            name: customer.name ?? customer.email,
            orderId: doc.orderNumber,
            downloadUrl,
          })
        } catch (err) {
          req.payload.logger.error({ err, msg: 'Personal ready email failed' })
        }

        await enqueue('personal.render', { personalOrderId: doc.id, audioKey: doc.audioKey })
      },
    ],
  },
  fields: [
    {
      name: 'orderNumber',
      type: 'text',
      required: true,
      unique: true,
      label: 'Номер заказа',
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      label: 'Покупатель',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending_payment',
      label: 'Статус',
      options: [
        { label: 'Ожидает оплаты', value: 'pending_payment' },
        { label: 'Оплачен, ожидает анкеты', value: 'paid_questionnaire' },
        { label: 'Анкета заполнена', value: 'questionnaire_done' },
        { label: 'В работе', value: 'in_progress' },
        { label: 'Готово', value: 'ready' },
      ],
    },
    {
      name: 'amount',
      type: 'number',
      label: 'Сумма (₽)',
    },
    {
      name: 'yookassaPaymentId',
      type: 'text',
      label: 'ID платежа ЮKassa',
    },
    {
      name: 'questionnaireAnswers',
      type: 'json',
      label: 'Ответы на анкету',
      admin: {
        components: {
          Field: '@/components/admin/QuestionnaireAnswers#QuestionnaireAnswers',
        },
      },
    },
    {
      name: 'readyAudio',
      type: 'upload',
      relationTo: 'product-audio',
      label: 'Готовый аудиофайл',
      admin: {
        description: 'Загрузите mp3 и поставьте статус «Готово». Клиенту уйдёт письмо со ссылкой на скачивание.',
      },
    },
    {
      name: 'audioKey',
      type: 'text',
      label: 'Ключ файла в хранилище',
      admin: {
        description: 'Заполняется сам, когда выше загружен файл. Вручную — только если файл уже лежит в бакете.',
      },
    },
    {
      name: 'adminNote',
      type: 'textarea',
      label: 'Заметки администратора',
    },
    // Partner / promo
    {
      name: 'partner',
      type: 'relationship',
      relationTo: 'partners',
      label: 'Партнёр',
    },
    {
      name: 'refCode',
      type: 'text',
      label: 'ref-код',
    },
    {
      name: 'utmSource',
      type: 'text',
      label: 'utm_source',
    },
    {
      name: 'paidAt',
      type: 'date',
      label: 'Дата оплаты',
    },
    {
      name: 'consentIp',
      type: 'text',
      label: 'IP при оплате',
    },
    consentJournalField,
  ],
}
