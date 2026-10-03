/**
 * Yandex Object Storage (S3-compatible) — signed URL generation and upload helpers.
 * Bucket must be private. Files are served only via short-lived presigned GET URLs.
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { Payload } from 'payload'

const client = new S3Client({
  endpoint: process.env.YOS_ENDPOINT ?? 'https://storage.yandexcloud.net',
  region: process.env.YOS_REGION ?? 'ru-central1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.YOS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.YOS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.YOS_BUCKET ?? 'fabulaone-audio'
const TTL = Number(process.env.YOS_SIGNED_URL_TTL ?? 3600)
const PRODUCT_AUDIO_PREFIX = 'audio'

type AudioUploadDoc = {
  filename?: string | null
  prefix?: string | null
}

type ProductAudioSource = {
  fullAudio?: string | AudioUploadDoc | null
  fullAudioKey?: string | null
}

/**
 * Resolve S3 object key for a product's paid track.
 * Prefer uploaded ProductAudio; fall back to manual fullAudioKey.
 */
export async function resolveProductAudioKey(
  product: ProductAudioSource,
  payload?: Payload,
): Promise<string | null> {
  let audio = product.fullAudio

  if (typeof audio === 'string' && payload) {
    try {
      audio = (await payload.findByID({
        collection: 'product-audio',
        id: audio,
        depth: 0,
      })) as AudioUploadDoc
    } catch {
      audio = null
    }
  }

  if (audio && typeof audio === 'object' && audio.filename) {
    const prefix = (audio.prefix || PRODUCT_AUDIO_PREFIX).replace(/\/$/, '')
    return `${prefix}/${audio.filename}`
  }

  return product.fullAudioKey?.trim() || null
}

/**
 * Generate a presigned download URL for a private audio file.
 * The URL expires after TTL seconds (default 1 hour).
 */
export async function getSignedDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(client, command, { expiresIn: TTL })
}

/**
 * Generate a presigned upload URL so the admin can upload directly from the browser.
 * Returns a URL valid for 15 minutes.
 */
export async function getSignedUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(client, command, { expiresIn: 900 })
}
