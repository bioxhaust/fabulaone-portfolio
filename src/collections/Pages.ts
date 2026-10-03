import type { CollectionConfig } from 'payload'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    group: 'Контент',
    defaultColumns: ['title', 'slug', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Заголовок страницы',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Slug',
      admin: {
        description:
          'Оферта, оплата и контакты. Политика и согласия отдаются страницами /privacy, /consent и /ads-consent.',
      },
    },
    {
      name: 'content',
      type: 'richText',
      label: 'Содержимое',
    },
    {
      name: 'seoTitle',
      type: 'text',
      label: 'Meta title',
    },
    {
      name: 'seoDescription',
      type: 'textarea',
      label: 'Meta description',
    },
  ],
}
