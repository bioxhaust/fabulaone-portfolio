import type { CollectionConfig } from 'payload'

export const PromoCodes: CollectionConfig = {
  slug: 'promo-codes',
  admin: {
    useAsTitle: 'code',
    group: 'Продажи',
    defaultColumns: ['code', 'discountType', 'discountValue', 'usedCount', 'active', 'expiresAt'],
  },
  access: {
    read: ({ req }) => req.user?.role === 'admin',
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      label: 'Промокод',
      admin: { description: 'Латинские буквы и цифры в верхнем регистре, например: FABULA20' },
    },
    {
      name: 'discountType',
      type: 'select',
      required: true,
      label: 'Тип скидки',
      options: [
        { label: 'Процент (%)', value: 'percent' },
        { label: 'Фиксированная (₽)', value: 'fixed' },
      ],
    },
    {
      name: 'discountValue',
      type: 'number',
      required: true,
      label: 'Размер скидки',
      min: 0,
    },
    {
      name: 'expiresAt',
      type: 'date',
      label: 'Действует до',
    },
    {
      name: 'usageLimit',
      type: 'number',
      label: 'Лимит использований (0 = без лимита)',
      defaultValue: 0,
    },
    {
      name: 'usedCount',
      type: 'number',
      label: 'Использований',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'applicableProducts',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      label: 'Применяется к продуктам (пусто = все)',
    },
    {
      name: 'partner',
      type: 'relationship',
      relationTo: 'partners',
      label: 'Привязан к партнёру (атрибуция)',
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Активен',
      defaultValue: true,
    },
  ],
}
