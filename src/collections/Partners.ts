import type { CollectionConfig } from 'payload'
import { partnerReferralUrl } from '@/lib/site-url'

export const Partners: CollectionConfig = {
  slug: 'partners',
  admin: {
    useAsTitle: 'name',
    group: 'Партнёры',
    defaultColumns: ['name', 'refCode', 'referralLink', 'commissionRate', 'balance', 'active'],
  },
  access: {
    // Только админ. Партнёрский кабинет ходит не через REST API Payload,
    // а через /api/partner/stats — там своя проверка JWT и Local API,
    // который access control не затрагивает.
    read: ({ req }) => req.user?.role === 'admin',
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Имя / название',
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      label: 'Email',
    },
    {
      name: 'refCode',
      type: 'text',
      required: true,
      unique: true,
      label: 'Реферальный код (ref=...)',
      admin: {
        description: 'Латинские буквы и цифры, например: viktoria. Готовая ссылка — в поле ниже.',
      },
    },
    {
      name: 'referralLink',
      type: 'text',
      virtual: true,
      label: 'Ссылка для рекламы',
      admin: {
        readOnly: true,
        description: 'Скопируйте и передайте партнёру. Заказы по этой ссылке привязываются к коду 30 дней.',
      },
      hooks: {
        afterRead: [
          ({ siblingData, data }) => {
            const code = siblingData?.refCode ?? data?.refCode
            if (!code || typeof code !== 'string') return null
            return partnerReferralUrl(code)
          },
        ],
      },
    },
    {
      name: 'commissionRate',
      type: 'number',
      required: true,
      label: 'Процент вознаграждения',
      min: 0,
      max: 100,
      defaultValue: 20,
      admin: {
        description: 'Процент от суммы заказа, например: 20 = 20%',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Активен',
      defaultValue: true,
    },
    // Read-only balance fields (updated by hooks/API)
    {
      name: 'totalEarned',
      type: 'number',
      label: 'Начислено всего (₽)',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'totalPaid',
      type: 'number',
      label: 'Выплачено (₽)',
      defaultValue: 0,
    },
    {
      name: 'balance',
      type: 'number',
      label: 'Текущий баланс (₽)',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    // Stats
    {
      name: 'totalClicks',
      type: 'number',
      label: 'Переходов',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'totalOrders',
      type: 'number',
      label: 'Оплаченных заказов',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'totalSales',
      type: 'number',
      label: 'Сумма продаж (₽)',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    // Auth for partner cabinet
    {
      name: 'passwordHash',
      type: 'text',
      label: 'Хэш пароля',
      admin: { hidden: true },
      // hidden прячет поле только в админке — через API оно бы отдавалось.
      // Local API (партнёрская авторизация) access control игнорирует.
      access: {
        read: () => false,
      },
    },
  ],
}
