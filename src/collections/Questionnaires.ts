import type { CollectionConfig } from 'payload'

export const Questionnaires: CollectionConfig = {
  slug: 'questionnaires',
  admin: {
    useAsTitle: 'title',
    group: 'PERSONAL',
  },
  access: {
    read: ({ req }) => req.user?.role === 'admin',
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Название анкеты',
      defaultValue: 'Анкета FABULA ONE PERSONAL',
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Активна',
      defaultValue: true,
    },
    {
      name: 'fields',
      type: 'array',
      label: 'Поля анкеты',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          label: 'Подпись поля',
        },
        {
          name: 'fieldType',
          type: 'select',
          required: true,
          label: 'Тип поля',
          options: [
            { label: 'Текст (одна строка)', value: 'text' },
            { label: 'Текст (многострочный)', value: 'textarea' },
            { label: 'Выбор одного варианта', value: 'select' },
            { label: 'Выбор нескольких вариантов', value: 'multiselect' },
          ],
        },
        {
          name: 'required',
          type: 'checkbox',
          label: 'Обязательное',
          defaultValue: false,
        },
        {
          name: 'options',
          type: 'array',
          label: 'Варианты ответа (для select/multiselect)',
          fields: [
            {
              name: 'value',
              type: 'text',
              label: 'Вариант',
            },
          ],
        },
        {
          name: 'hint',
          type: 'text',
          label: 'Подсказка под полем',
        },
        {
          name: 'order',
          type: 'number',
          label: 'Порядок',
          defaultValue: 0,
        },
      ],
    },
  ],
}
