/**
 * One-shot: init Payload so postgresAdapter push can sync schema.
 * Run with NODE_ENV=development PAYLOAD_PUSH=true
 */
import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

const payload = await getPayload({ config })
const products = await payload.find({ collection: 'products', limit: 1 })
console.log('schema ok, products:', products.totalDocs)
process.exit(0)
