import type { CollectionConfig } from 'payload'

export const PartnerEarnings: CollectionConfig = {
  slug: 'partner-earnings',
  admin: {
    useAsTitle: 'id',
    group: 'Партнёры',
    defaultColumns: ['partner', 'order', 'amount', 'status', 'createdAt'],
  },
  access: {
    read: ({ req }) => req.user?.role === 'admin',
    create: () => false, // created only programmatically
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'partner',
      type: 'relationship',
      relationTo: 'partners',
      required: true,
      label: 'Партнёр',
    },
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      label: 'Заказ из каталога',
    },
    {
      name: 'personalOrder',
      type: 'relationship',
      relationTo: 'personal-orders',
      label: 'Персональный заказ',
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      label: 'Сумма начисления (₽)',
    },
    {
      name: 'rate',
      type: 'number',
      label: 'Процент на момент начисления',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      label: 'Статус',
      options: [
        { label: 'Ожидает', value: 'pending' },
        { label: 'Начислено', value: 'earned' },
        { label: 'Выплачено', value: 'paid' },
        { label: 'Аннулировано (возврат)', value: 'cancelled' },
      ],
    },
    {
      name: 'paidAt',
      type: 'date',
      label: 'Дата выплаты',
    },
    {
      name: 'note',
      type: 'textarea',
      label: 'Примечание',
    },
  ],
}
