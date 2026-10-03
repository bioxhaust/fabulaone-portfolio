/**
 * Lightweight Redis-backed job queue stub.
 * Architecture hook for later PERSONAL automation (TTS / mix / deliver)
 * without rewriting the storefront.
 */

import Redis from 'ioredis'

export type JobName = 'personal.render' | 'email.retry' | 'partner.reconcile'

export type JobPayload = {
  name: JobName
  data: Record<string, unknown>
  createdAt: string
}

const QUEUE_KEY = 'fabula:jobs'

let client: Redis | null = null

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL
  if (!url) return null
  if (!client) {
    client = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    })
  }
  return client
}

/** Enqueue a job. No-op (with warn) if Redis is unavailable. */
export async function enqueue(name: JobName, data: Record<string, unknown> = {}): Promise<boolean> {
  const redis = getRedis()
  if (!redis) {
    console.warn('[queue] REDIS_URL missing — skip', name)
    return false
  }
  const job: JobPayload = {
    name,
    data,
    createdAt: new Date().toISOString(),
  }
  try {
    if (redis.status !== 'ready') await redis.connect()
    await redis.lpush(QUEUE_KEY, JSON.stringify(job))
    return true
  } catch (err) {
    console.warn('[queue] enqueue failed', name, err)
    return false
  }
}

/** Pop one job (for a future worker process). */
export async function dequeue(): Promise<JobPayload | null> {
  const redis = getRedis()
  if (!redis) return null
  try {
    if (redis.status !== 'ready') await redis.connect()
    const raw = await redis.rpop(QUEUE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as JobPayload
  } catch (err) {
    console.warn('[queue] dequeue failed', err)
    return null
  }
}
