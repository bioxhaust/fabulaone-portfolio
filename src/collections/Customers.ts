import type { CollectionConfig } from 'payload'

export const Customers: CollectionConfig = {
  slug: 'customers',
  admin: {
    useAsTitle: 'email',
    group: 'Клиенты',
    defaultColumns: ['email', 'name', 'createdAt'],
  },
  access: {
    read: ({ req }) => req.user?.role === 'admin',
    create: () => true, // created automatically on purchase
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      label: 'Email',
    },
    {
      name: 'name',
      type: 'text',
      label: 'Имя',
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Телефон',
    },
    // GDPR / 152-FZ
    {
      name: 'consentGiven',
      type: 'checkbox',
      label: 'Согласие на обработку ПД',
      defaultValue: false,
    },
    {
      name: 'consentAt',
      type: 'date',
      label: 'Дата согласия',
      admin: { date: { displayFormat: 'dd.MM.yyyy HH:mm' } },
    },
    {
      name: 'consentIp',
      type: 'text',
      label: 'IP при согласии',
    },
    {
      name: 'consentVersion',
      type: 'text',
      label: 'Версия согласия на обработку ПД',
    },
    {
      name: 'marketingConsent',
      type: 'checkbox',
      label: 'Согласие на рекламу',
      defaultValue: false,
    },
    {
      name: 'marketingConsentAt',
      type: 'date',
      label: 'Дата согласия на рекламу',
      admin: { date: { displayFormat: 'dd.MM.yyyy HH:mm' } },
    },
    {
      name: 'marketingConsentVersion',
      type: 'text',
      label: 'Версия согласия на рекламу',
    },
    {
      name: 'deletionRequested',
      type: 'checkbox',
      label: 'Запрошено удаление данных',
      defaultValue: false,
    },
  ],
}
