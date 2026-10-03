import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'title',
    group: 'Каталог',
    defaultColumns: ['title', 'price', 'active', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        if (!data?.fullAudio || !req.payload) return data

        const id =
          typeof data.fullAudio === 'string'
            ? data.fullAudio
            : (data.fullAudio as { id?: string })?.id

        if (!id) return data

        try {
          const doc = await req.payload.findByID({
            collection: 'product-audio',
            id,
            depth: 0,
          })
          const filename = (doc as { filename?: string | null }).filename
          if (filename) {
            const prefix =
              ((doc as { prefix?: string | null }).prefix || 'audio').replace(/\/$/, '')
            data.fullAudioKey = `${prefix}/${filename}`
          }
        } catch {
          // leave fullAudioKey as-is
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Название',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'URL-slug',
      admin: {
        description: 'Латинские буквы, цифры и дефис. Пример: forest-breath',
      },
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      label: 'Краткое описание',
    },
    {
      name: 'description',
      type: 'richText',
      label: 'Подробное описание',
    },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'Обложка',
    },
    {
      name: 'duration',
      type: 'text',
      label: 'Продолжительность',
      defaultValue: '11:11',
    },
    {
      name: 'demoAudio',
      type: 'upload',
      relationTo: 'media',
      label: 'Демо-фрагмент (публичный)',
      admin: {
        description: 'Короткий демо-фрагмент для прослушивания на сайте',
      },
    },
    {
      name: 'fullAudio',
      type: 'upload',
      relationTo: 'product-audio',
      label: 'Полный аудиофайл (платный)',
      admin: {
        description:
          'Загрузите полный трек здесь — файл сохранится в приватный бакет. Клиенту не нужна консоль Yandex.',
      },
    },
    {
      name: 'fullAudioKey',
      type: 'text',
      label: 'Ключ в Object Storage (запасной)',
      admin: {
        description:
          'Заполняется автоматически при загрузке через «Полный аудиофайл». Можно задать вручную, если файл уже лежит в бакете (пример: audio/forest-breath.m4a).',
        position: 'sidebar',
      },
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      label: 'Цена (₽)',
      min: 1,
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Опубликован',
      defaultValue: true,
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Порядок сортировки',
      defaultValue: 0,
    },
    // SEO
    {
      name: 'seo',
      type: 'group',
      label: 'SEO',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Meta title',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Meta description',
        },
        {
          name: 'ogImage',
          type: 'upload',
          relationTo: 'media',
          label: 'OG Image',
        },
      ],
    },
  ],
}
