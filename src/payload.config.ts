import path from 'path'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { s3Storage } from '@payloadcms/storage-s3'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Products } from './collections/Products'
import { ProductAudio } from './collections/ProductAudio'
import { Media } from './collections/Media'
import { Orders } from './collections/Orders'
import { Customers } from './collections/Customers'
import { Partners } from './collections/Partners'
import { PartnerEarnings } from './collections/PartnerEarnings'
import { PromoCodes } from './collections/PromoCodes'
import { PersonalOrders } from './collections/PersonalOrders'
import { Questionnaires } from './collections/Questionnaires'
import { Pages } from './collections/Pages'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const yosConfigured = Boolean(
  process.env.YOS_ACCESS_KEY_ID && process.env.YOS_SECRET_ACCESS_KEY,
)

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '',
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: '— FABULA ONE Admin',
    },
  },
  collections: [
    Users,
    Products,
    ProductAudio,
    Media,
    Orders,
    Customers,
    Partners,
    PartnerEarnings,
    PromoCodes,
    PersonalOrders,
    Questionnaires,
    Pages,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    idType: 'uuid',
    // First deploy / empty DB: set PAYLOAD_PUSH=true to sync schema, then turn off.
    push: process.env.PAYLOAD_PUSH === 'true',
    pool: {
      connectionString: process.env.DATABASE_URI ?? '',
    },
  }),
  ...(process.env.SMTP_HOST
    ? {
        email: nodemailerAdapter({
          defaultFromAddress: process.env.EMAIL_FROM ?? 'noreply@fabulaone.ru',
          defaultFromName: process.env.EMAIL_FROM_NAME ?? 'FABULA ONE',
          transportOptions: {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT ?? 465),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          },
        }),
      }
    : {}),
  sharp,
  plugins: [
    s3Storage({
      // Without keys keep local disk for `next dev`. Production must set YOS_*.
      enabled: yosConfigured,
      bucket: process.env.YOS_BUCKET ?? 'fabulaone-audio',
      collections: {
        media: {
          prefix: 'media',
          // Private bucket: every media URL is a short-lived signed GET.
          signedDownloads: true,
        },
        'product-audio': {
          prefix: 'audio',
          signedDownloads: true,
        },
      },
      config: {
        credentials: {
          accessKeyId: process.env.YOS_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.YOS_SECRET_ACCESS_KEY ?? '',
        },
        endpoint: process.env.YOS_ENDPOINT ?? 'https://storage.yandexcloud.net',
        region: process.env.YOS_REGION ?? 'ru-central1',
        forcePathStyle: true,
      },
    }),
  ],
})
