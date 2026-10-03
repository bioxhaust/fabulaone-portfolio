/**
 * Transactional email templates and sender.
 * All sends go through nodemailer using env-configured SMTP.
 */

import nodemailer from 'nodemailer'

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const from = `"${process.env.EMAIL_FROM_NAME ?? 'FABULA ONE'}" <${process.env.EMAIL_FROM ?? 'noreply@fabulaone.ru'}>`

async function send(to: string, subject: string, html: string): Promise<void> {
  const transport = createTransport()
  await transport.sendMail({ from, to, subject, html })
}

/** 1. Payment confirmed + download link */
export async function sendPaymentSuccess(params: {
  email: string
  name: string
  productTitle: string
  downloadUrl: string
  orderId: string
}): Promise<void> {
  await send(
    params.email,
    `Оплата прошла — ${params.productTitle}`,
    `<p>Здравствуйте${params.name ? `, ${params.name}` : ''}!</p>
<p>Ваш заказ <strong>#${params.orderId}</strong> оплачен.</p>
<p>Скачать аудиофабулу «${params.productTitle}»:<br>
<a href="${params.downloadUrl}">${params.downloadUrl}</a></p>
<p>Ссылка действительна 1 час. Войти в личный кабинет можно через письмо со ссылкой входа.</p>
<p>С уважением,<br>FABULA ONE</p>`,
  )
}

/** 2. Magic link for customer cabinet */
export async function sendMagicLink(params: {
  email: string
  name: string
  magicUrl: string
}): Promise<void> {
  await send(
    params.email,
    'Ваша ссылка входа — FABULA ONE',
    `<p>Здравствуйте${params.name ? `, ${params.name}` : ''}!</p>
<p>Нажмите кнопку ниже, чтобы войти в личный кабинет и получить доступ к своим покупкам:</p>
<p><a href="${params.magicUrl}" style="display:inline-block;padding:12px 24px;background:#b8966e;color:#fff;text-decoration:none;border-radius:6px;">Войти в кабинет</a></p>
<p>Ссылка действительна 24 часа.</p>
<p>FABULA ONE</p>`,
  )
}

/** 3. Personal order accepted */
export async function sendPersonalAccepted(params: {
  email: string
  name: string
  questionnaireUrl: string
  orderId: string
}): Promise<void> {
  await send(
    params.email,
    'Заказ персональной фабулы принят — FABULA ONE',
    `<p>Здравствуйте${params.name ? `, ${params.name}` : ''}!</p>
<p>Ваш заказ <strong>#${params.orderId}</strong> получен. Оплата прошла.</p>
<p>Чтобы мы могли создать вашу персональную фабулу, пожалуйста, заполните анкету:<br>
<a href="${params.questionnaireUrl}">${params.questionnaireUrl}</a></p>
<p>FABULA ONE</p>`,
  )
}

/** 4. Personal order ready */
export async function sendPersonalReady(params: {
  email: string
  name: string
  orderId: string
  downloadUrl?: string
}): Promise<void> {
  await send(
    params.email,
    'Ваша персональная фабула готова — FABULA ONE',
    `<p>Здравствуйте${params.name ? `, ${params.name}` : ''}!</p>
<p>Ваша персональная аудиофабула по заказу <strong>#${params.orderId}</strong> готова.</p>
${
  params.downloadUrl
    ? `<p><a href="${params.downloadUrl}">Скачать файл</a></p>
<p>Ссылка действует 24 часа. Позже файл можно скачать в личном кабинете.</p>`
    : `<p>Войдите в личный кабинет, чтобы скачать файл.</p>`
}
<p>FABULA ONE</p>`,
  )
}

/** Admin notification about new order */
export async function sendAdminNewOrder(params: {
  orderNumber: string
  productTitle: string
  customerEmail: string
  amount: number
  isPersonal?: boolean
}): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return
  await send(
    adminEmail,
    `Новый заказ #${params.orderNumber}${params.isPersonal ? ' (PERSONAL)' : ''}`,
    `<p>Новый заказ <strong>#${params.orderNumber}</strong></p>
<ul>
  <li>Продукт: ${params.productTitle}</li>
  <li>Покупатель: ${params.customerEmail}</li>
  <li>Сумма: ${params.amount} ₽</li>
</ul>
<p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin">Открыть в админке</a></p>`,
  )
}
