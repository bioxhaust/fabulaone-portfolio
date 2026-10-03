import type { CollectionConfig } from 'payload'
import { createRefund } from '../lib/yookassa'
import { consentJournalField } from '../fields/consentJournal'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber',
    group: 'Продажи',
    defaultColumns: ['orderNumber', 'customer', 'product', 'status', 'amount', 'createdAt'],
    description:
      'Чтобы оформить возврат: смените статус на «Возвращён». Система вызовет ЮKassa Refund API и скорректирует партнёрское начисление.',
  },
  access: {
    read: ({ req }) => req.user?.role === 'admin',
    create: () => true,
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        if (doc.status !== 'refunded' || previousDoc?.status === 'refunded') return

        if (doc.yookassaPaymentId && process.env.YOOKASSA_SHOP_ID) {
          try {
            await createRefund(doc.yookassaPaymentId, Number(doc.amount), doc.id)
          } catch (err) {
            req.payload.logger.error({ err, msg: 'YooKassa refund failed' })
          }
        }

        if (!doc.refundedAt) {
          await req.payload.update({
            collection: 'orders',
            id: doc.id,
            data: { refundedAt: new Date().toISOString() },
            overrideAccess: true,
          })
        }

        if (doc.partner) {
          const partnerId = typeof doc.partner === 'string' ? doc.partner : doc.partner.id
          const earnings = await req.payload.find({
            collection: 'partner-earnings',
            where: {
              and: [
                { order: { equals: doc.id } },
                { status: { equals: 'earned' } },
              ],
            },
            limit: 10,
          })

          for (const row of earnings.docs) {
            await req.payload.update({
              collection: 'partner-earnings',
              id: row.id,
              data: { status: 'cancelled' },
              overrideAccess: true,
            })

            const partner = await req.payload.findByID({
              collection: 'partners',
              id: partnerId,
            })
            if (partner) {
              const amt = Number(row.amount) || 0
              await req.payload.update({
                collection: 'partners',
                id: partnerId,
                data: {
                  totalEarned: Math.max(0, Number(partner.totalEarned ?? 0) - amt),
                  balance: Math.max(0, Number(partner.balance ?? 0) - amt),
                  totalOrders: Math.max(0, Number(partner.totalOrders ?? 0) - 1),
                  totalSales: Math.max(0, Number(partner.totalSales ?? 0) - Number(doc.amount)),
                },
                overrideAccess: true,
              })
            }
          }
        }
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
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      label: 'Продукт',
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      label: 'Сумма (₽)',
    },
    {
      name: 'originalAmount',
      type: 'number',
      label: 'Сумма без скидки (₽)',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      label: 'Статус',
      options: [
        { label: 'Ожидает оплаты', value: 'pending' },
        { label: 'Оплачен', value: 'paid' },
        { label: 'Возвращён', value: 'refunded' },
        { label: 'Отменён', value: 'cancelled' },
      ],
    },
    // YooKassa
    {
      name: 'yookassaPaymentId',
      type: 'text',
      label: 'ID платежа ЮKassa',
      index: true,
    },
    {
      name: 'yookassaStatus',
      type: 'text',
      label: 'Статус ЮKassa',
    },
    {
      name: 'paymentMethod',
      type: 'select',
      label: 'Способ оплаты',
      options: [
        { label: 'Банковская карта', value: 'bank_card' },
        { label: 'СБП', value: 'sbp' },
        { label: 'ЮMoney', value: 'yoo_money' },
        { label: 'Другое', value: 'other' },
      ],
    },
    {
      name: 'refundedAt',
      type: 'date',
      label: 'Дата возврата',
    },
    // Affiliate / promo
    {
      name: 'partner',
      type: 'relationship',
      relationTo: 'partners',
      label: 'Партнёр',
    },
    {
      name: 'promoCode',
      type: 'relationship',
      relationTo: 'promo-codes',
      label: 'Промокод',
    },
    // Attribution / analytics
    {
      name: 'utmSource',
      type: 'text',
      label: 'utm_source',
    },
    {
      name: 'utmMedium',
      type: 'text',
      label: 'utm_medium',
    },
    {
      name: 'utmCampaign',
      type: 'text',
      label: 'utm_campaign',
    },
    {
      name: 'utmContent',
      type: 'text',
      label: 'utm_content',
    },
    {
      name: 'utmTerm',
      type: 'text',
      label: 'utm_term',
    },
    {
      name: 'refCode',
      type: 'text',
      label: 'ref (партнёрский код)',
    },
    // Consent
    {
      name: 'offerAccepted',
      type: 'checkbox',
      label: 'Оферта принята',
      defaultValue: false,
    },
    {
      name: 'offerAcceptedAt',
      type: 'date',
      label: 'Дата принятия оферты',
    },
    {
      name: 'consentIp',
      type: 'text',
      label: 'IP при оплате',
    },
    consentJournalField,
    {
      name: 'paidAt',
      type: 'date',
      label: 'Дата оплаты',
    },
  ],
}
