import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Система',
  },
  access: {
    read: () => true,
  },
  upload: {
    // Local fallback when YOS_* keys are absent (dev). With S3 plugin enabled,
    // Payload sets disableLocalStorage automatically.
    staticDir: 'media',
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 400,
        position: 'centre',
      },
      {
        name: 'cover',
        width: 800,
        height: 800,
        position: 'centre',
      },
      {
        name: 'og',
        width: 1200,
        height: 630,
        position: 'centre',
      },
    ],
    adminThumbnail: 'thumbnail',
    mimeTypes: ['image/*', 'audio/*'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alt-текст',
    },
  ],
}
