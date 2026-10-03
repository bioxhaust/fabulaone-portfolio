import type { JSX } from 'react'

/**
 * Lexical (Payload richText) → HTML.
 *
 * Общий для юридических страниц и подробного описания фабулы: раньше жил
 * копией внутри pages/[slug] и из-за этого описание товара просто не
 * выводилось на сайте, хотя редактор его заполнял.
 *
 * Разметку намеренно держим бедной — в контенте FABULA ONE нужны только
 * абзацы, заголовки, списки, ссылки и базовое начертание.
 */

type Node = {
  type?: string
  text?: string
  tag?: string | number
  listType?: string
  url?: string
  fields?: { url?: string; newTab?: boolean; linkType?: string }
  children?: Node[]
  [key: string]: unknown
}

export default function RichText({
  content,
  className,
}: {
  content: unknown
  className?: string
}): JSX.Element | null {
  const html = serializeRichText(content)
  if (!html) return null
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

export function serializeRichText(content: unknown): string {
  const root = (content as { root?: { children?: Node[] } } | null)?.root
  if (!root?.children) return ''
  return root.children.map(serializeNode).join('')
}

function serializeNode(node: Node): string {
  if (node.type === 'text') {
    let t = escapeText(node.text ?? '')
    if (node.bold) t = `<strong>${t}</strong>`
    if (node.italic) t = `<em>${t}</em>`
    if (node.code) t = `<code>${t}</code>`
    return t
  }

  const inner = (node.children ?? []).map(serializeNode).join('')

  switch (node.type) {
    case 'paragraph':
      return `<p>${inner}</p>`

    /* Lexical пишет tag как 'h2', а не как 2. Старый код подставлял его
       в `<h${tag}>` и выдавал <hh2> — заголовки в документах не работали. */
    case 'heading': {
      const raw = String(node.tag ?? 'h2')
      const level = /^h[1-6]$/.test(raw) ? raw : `h${raw}`
      const safe = /^h[1-6]$/.test(level) ? level : 'h2'
      return `<${safe}>${inner}</${safe}>`
    }

    case 'list':
      return node.listType === 'number' ? `<ol>${inner}</ol>` : `<ul>${inner}</ul>`

    case 'listitem':
      return `<li>${inner}</li>`

    /* В Payload ссылка кладёт адрес в fields.url; node.url — форма из
       старых версий. Поддерживаем обе, иначе ссылка молча теряется. */
    case 'link': {
      const href = safeUrl(node.fields?.url ?? node.url ?? '')
      if (!href) return inner
      // target="_blank" только для внешних: на своих страницах он мешает
      const external = /^https?:\/\//i.test(href)
      const rel = external ? ' target="_blank" rel="noopener noreferrer"' : ''
      return `<a href="${escapeAttr(href)}"${rel}>${inner}</a>`
    }

    default:
      return inner
  }
}

/** Текстовый контекст: достаточно снять угловые скобки и амперсанд. */
function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Атрибут: кавычки обязательны, иначе адрес со схемой " выходит из href. */
function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Пропускаем только безопасные схемы: javascript: в href — это XSS. */
function safeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed
  if (/^[/#]/.test(trimmed)) return trimmed // относительный путь или якорь
  return ''
}
