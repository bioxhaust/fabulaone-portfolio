import type { CollectionConfig } from 'payload'

/**
 * Private full-length audio for paid products.
 * Not publicly readable via API — only admins and server-side signed downloads.
 */
export const ProductAudio: CollectionConfig = {
  slug: 'product-audio',
  labels: {
    singular: 'Полный трек',
    plural: 'Полные треки',
  },
  admin: {
    useAsTitle: 'filename',
    group: 'Каталог',
    description: 'Платные аудиофайлы. Клиент загружает здесь — файл уходит в приватный бакет.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  upload: {
    staticDir: 'product-audio',
    mimeTypes: ['audio/*'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Название (для себя)',
      admin: {
        description: 'Необязательно. Помогает найти файл в списке.',
      },
    },
  ],
}
