import type { Field } from 'payload'

export const consentJournalField: Field = {
  name: 'consentJournal',
  type: 'json',
  label: 'Журнал согласий',
  admin: {
    description:
      'Доказательство согласий по этому заказу: дата, версия текста, форма, страница, IP и User-Agent. Технические сведения не используются для других целей.',
    components: {
      Field: '@/components/admin/ConsentJournal#ConsentJournal',
    },
  },
}
