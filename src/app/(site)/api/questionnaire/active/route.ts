/**
 * GET /api/questionnaire/active
 * Returns the currently active questionnaire for PERSONAL orders.
 * Public endpoint — no auth needed (form fields are not sensitive).
 */

import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'


export const dynamic = 'force-dynamic'
export const revalidate = 60

export async function GET() {
  try {
    const payload = await getPayload({ config: configPromise })

    const result = await payload.find({
      collection: 'questionnaires',
      where: { active: { equals: true } },
      limit: 1,
      sort: '-createdAt',
    })

    const q = result.docs[0]
    if (!q) {
      return NextResponse.json({ error: 'Анкета не найдена' }, { status: 404 })
    }

    return NextResponse.json({
      id: q.id,
      title: q.title,
      fields: (q.fields ?? []).map((f: any) => ({
        id: f.id,
        label: f.label,
        fieldType: f.fieldType,
        required: f.required ?? false,
        hint: f.hint ?? null,
        options: f.options ?? [],
        order: f.order ?? 0,
      })).sort((a: any, b: any) => a.order - b.order),
    })
  } catch (err) {
    console.error('Active questionnaire fetch error:', err)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}
