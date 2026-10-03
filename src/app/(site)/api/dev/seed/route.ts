/**
 * POST /api/dev/seed
 * Dev-only bootstrap: 6 products, legal pages, PERSONAL questionnaire.
 * Disabled outside development.
 */

import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const runtime = 'nodejs'

function lexicalDoc(...paragraphs: string[]) {
  return {
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: paragraphs.map((text) => ({
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        children: [
          {
            type: 'text',
            text,
            detail: 0,
            format: 0,
            mode: 'normal' as const,
            style: '',
            version: 1,
          },
        ],
      })),
    },
  }
}

const PRODUCTS = [
  {
    title: 'Дыхание леса',
    slug: 'forest-breath',
    shortDescription: 'Мягкий звуковой путь сквозь хвою, туман и тишину.',
    price: 1111,
    cover: 'cover-forest-breath.webp',
    sortOrder: 1,
  },
  {
    title: 'Ночной берег',
    slug: 'night-shore',
    shortDescription: 'Волны, далёкий горизонт и глубокое расслабление.',
    price: 1111,
    cover: 'cover-night-shore.webp',
    sortOrder: 2,
  },
  {
    title: 'Каменный сад',
    slug: 'stone-garden',
    shortDescription: 'Медленный ритм, пространство и внутренняя ясность.',
    price: 1111,
    cover: 'cover-stone-garden.webp',
    sortOrder: 3,
  },
  {
    title: 'Золотая пыль',
    slug: 'golden-dust',
    shortDescription: 'Тёплый свет, мягкая вибрация и состояние присутствия.',
    price: 1111,
    cover: 'cover-golden-dust.webp',
    sortOrder: 4,
  },
  {
    title: 'Тихая вода',
    slug: 'quiet-water',
    shortDescription: 'Глубина без давления — для восстановления и сна.',
    price: 1111,
    cover: 'cover-quiet-water.webp',
    sortOrder: 5,
  },
  {
    title: 'Северный горизонт',
    slug: 'northern-horizon',
    shortDescription: 'Широкое пространство, холодный воздух и ясный ум.',
    price: 1111,
    cover: 'cover-northern-horizon.webp',
    sortOrder: 6,
  },
] as const

const PAGES = [
  {
    slug: 'offer',
    title: 'Публичная оферта',
    paragraphs: [
      'Настоящий документ является официальным предложением (публичной офертой) продавца FABULA ONE заключить договор купли-продажи цифровых аудиопродуктов (аудиофабул) на условиях, изложенных ниже.',
      'Акцептом оферты является оформление заказа на сайте fabulaone.ru и оплата выбранного продукта. С момента успешной оплаты договор считается заключённым.',
      'Предметом договора является предоставление покупателю неисключительного права на скачивание и личное использование цифровой аудиозаписи. Передача прав третьим лицам, публичное воспроизведение и коммерческое использование без согласия продавца не допускаются.',
      'Стоимость продуктов указана на сайте в рублях РФ и включает все применимые налоги. Оплата производится онлайн через платёжного партнёра ЮKassa.',
      'Цифровой продукт предоставляется сразу после подтверждения оплаты. Срок доступа к файлу определяется функциональностью личного кабинета на сайте.',
      'По всем вопросам обращайтесь: privacy@example.com. Реквизиты продавца в публичную копию не входят и размещаются на боевом сайте.',
    ],
  },
  {
    slug: 'privacy',
    title: 'Политика конфиденциальности',
    paragraphs: [
      'Оператор персональных данных — продавец сайта FABULA ONE. ИНН, ОГРНИП, телефон и адрес в публичную копию не входят. Контакт для демо: privacy@example.com.',
      'Мы обрабатываем персональные данные, которые вы указываете при заказе и обратной связи: адрес электронной почты, имя (при наличии), сведения о заказе и платеже, технические данные (IP-адрес, cookie) в объёме, необходимом для работы сайта.',
      'Цели обработки: заключение и исполнение договора, предоставление доступа к цифровому продукту, связь по заказу, соблюдение требований законодательства РФ, улучшение работы сайта.',
      'Правовые основания: ст. 6 Федерального закона № 152-ФЗ «О персональных данных», исполнение договора и согласие субъекта данных.',
      'Данные хранятся на серверах и у сервисов, расположенных на территории Российской Федерации, в течение срока, необходимого для целей обработки, либо до отзыва согласия, если иное не предусмотрено законом.',
      'Мы не передаём персональные данные третьим лицам, за исключением платёжного провайдера ЮKassa (для проведения оплаты) и случаев, прямо предусмотренных законодательством РФ.',
      'Вы вправе запросить доступ, уточнение, блокирование или удаление своих данных, а также отозвать согласие, направив обращение на privacy@example.com.',
    ],
  },
  {
    slug: 'consent',
    title: 'Согласие на обработку персональных данных',
    paragraphs: [
      'Оставляя данные на сайте fabulaone.ru (оформление заказа, анкета PERSONAL, обратная связь), вы свободно, своей волей и в своём интересе даёте согласие Оператору сайта FABULA ONE на обработку персональных данных.',
      'Состав данных: адрес электронной почты, имя (если указано), сведения о заказе, ответы анкеты (для персональной фабулы), технические данные браузера и устройства.',
      'Цели: оформление и исполнение заказа, доставка цифрового продукта, связь по вопросам заказа и сервиса, направление сервисных уведомлений.',
      'Способы обработки: сбор, запись, систематизация, хранение, уточнение, использование, обезличивание, удаление — с использованием средств автоматизации и без них.',
      'Согласие действует до его отзыва. Отозвать согласие можно письмом на privacy@example.com. Отзыв не влияет на законность обработки до момента отзыва.',
    ],
  },
  {
    slug: 'payment-refund',
    title: 'Оплата и возврат',
    paragraphs: [
      'Оплата на сайте fabulaone.ru производится онлайн через сервис ЮKassa банковскими картами и другими доступными способами (включая СБП, если он включён у продавца).',
      'После успешной оплаты цифровой аудиопродукт становится доступен для скачивания в личном кабинете и/или по ссылке, направленной на указанный email.',
      'Поскольку товар является цифровым контентом с предоставлением доступа сразу после оплаты, возврат денежных средств возможен при технической невозможности получить оплаченный файл по вине продавца либо в иных случаях, предусмотренных законодательством РФ о защите прав потребителей.',
      'Для оформления возврата направьте обращение на privacy@example.com с указанием email заказа, даты оплаты и описания проблемы. Срок рассмотрения — до 10 рабочих дней. Возврат при положительном решении выполняется тем же способом, которым была произведена оплата, через ЮKassa.',
      'Претензии по качеству аудиозаписи принимаются в разумный срок после покупки при наличии подтверждённого дефекта файла.',
    ],
  },
  {
    slug: 'contacts',
    title: 'Контакты',
    paragraphs: [
      'FABULA ONE',
      'Реквизиты продавца (ИНН, ОГРНИП, расчётный счёт, банк и юридический адрес) в публичную копию не входят.',
      'Email для демо: privacy@example.com',
    ],
  },
] as const

export async function POST(req: Request) {
  const seedSecret = process.env.SEED_SECRET
  const auth = req.headers.get('x-seed-secret')
  const allowed =
    process.env.NODE_ENV !== 'production' ||
    (Boolean(seedSecret) && auth === seedSecret)
  if (!allowed) {
    return NextResponse.json({ error: 'disabled' }, { status: 403 })
  }

  const payload = await getPayload({ config: configPromise })
  const log: string[] = []
  const root = process.cwd()

  for (const page of PAGES) {
    const existing = await payload.find({
      collection: 'pages',
      where: { slug: { equals: page.slug } },
      limit: 1,
    })
    const data = {
      title: page.title,
      slug: page.slug,
      content: lexicalDoc(...page.paragraphs),
      seoTitle: `${page.title} | FABULA ONE`,
      seoDescription: page.paragraphs[0]?.slice(0, 150),
    }
    if (existing.docs[0]) {
      await payload.update({ collection: 'pages', id: existing.docs[0].id, data })
      log.push(`page updated ${page.slug}`)
    } else {
      await payload.create({ collection: 'pages', data })
      log.push(`page created ${page.slug}`)
    }
  }

  const qExisting = await payload.find({
    collection: 'questionnaires',
    where: { active: { equals: true } },
    limit: 1,
  })
  const questionnaireData = {
    title: 'Анкета FABULA ONE PERSONAL',
    active: true,
    fields: [
      {
        label: 'Как к вам обращаться?',
        fieldType: 'text' as const,
        required: true,
        order: 1,
        hint: 'Имя или псевдоним',
      },
      {
        label: 'Для чего вам персональная фабула?',
        fieldType: 'select' as const,
        required: true,
        order: 2,
        options: [
          { value: 'Расслабление / сон' },
          { value: 'Фокус / работа' },
          { value: 'Эмоциональная поддержка' },
          { value: 'Другое' },
        ],
      },
      {
        label: 'Опишите желаемое состояние или сюжет',
        fieldType: 'textarea' as const,
        required: true,
        order: 3,
        hint: 'Несколько предложений достаточно',
      },
      {
        label: 'Есть ли звуки или образы, которых лучше избегать?',
        fieldType: 'textarea' as const,
        required: false,
        order: 4,
      },
    ],
  }
  if (qExisting.docs[0]) {
    await payload.update({
      collection: 'questionnaires',
      id: qExisting.docs[0].id,
      data: questionnaireData,
    })
    log.push('questionnaire updated')
  } else {
    await payload.create({ collection: 'questionnaires', data: questionnaireData })
    log.push('questionnaire created')
  }

  for (const product of PRODUCTS) {
    const coverPath = path.join(root, 'public', 'scenery', product.cover)
    if (!fs.existsSync(coverPath)) {
      log.push(`skip missing cover ${product.cover}`)
      continue
    }

    const existing = await payload.find({
      collection: 'products',
      where: { slug: { equals: product.slug } },
      limit: 1,
    })

    const buf = fs.readFileSync(coverPath)
    const media = await payload.create({
      collection: 'media',
      data: { alt: product.title },
      file: {
        data: buf,
        mimetype: 'image/webp',
        name: product.cover,
        size: buf.length,
      },
    })

    const data = {
      title: product.title,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: lexicalDoc(
        product.shortDescription,
        'Продолжительность — 11 минут 11 секунд. Полный файл доступен после оплаты.',
      ),
      cover: media.id,
      duration: '11:11',
      price: product.price,
      active: true,
      sortOrder: product.sortOrder,
      fullAudioKey: `audio/${product.slug}.m4a`,
      seo: {
        title: `${product.title} | FABULA ONE`,
        description: product.shortDescription,
      },
    }

    if (existing.docs[0]) {
      await payload.update({ collection: 'products', id: existing.docs[0].id, data })
      log.push(`product updated ${product.slug}`)
    } else {
      await payload.create({ collection: 'products', data })
      log.push(`product created ${product.slug}`)
    }
  }

  return NextResponse.json({ ok: true, log })
}
