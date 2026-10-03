-- Rewrite saved answers from field ids into «question + answer», then
-- replace the active PERSONAL questionnaire with the final 14 questions.
-- Safe to re-run: already converted orders are left as they are.

DO $$
DECLARE
  rec record;
  built jsonb;
BEGIN
  FOR rec IN
    SELECT id, questionnaire_answers
    FROM personal_orders
    WHERE questionnaire_answers IS NOT NULL
      AND jsonb_typeof(questionnaire_answers) = 'object'
      AND NOT (questionnaire_answers ? 'items')
  LOOP
    SELECT COALESCE(jsonb_agg(mapped.item ORDER BY mapped.ord), '[]'::jsonb)
    INTO built
    FROM (
      SELECT
        jsonb_build_object(
          'question', COALESCE(f.label, e.key),
          'answer', CASE
            WHEN jsonb_typeof(e.value) = 'string' THEN COALESCE(NULLIF(e.value #>> '{}', ''), '—')
            WHEN jsonb_typeof(e.value) = 'array' THEN COALESCE(
              (SELECT string_agg(elem, ', ') FROM jsonb_array_elements_text(e.value) AS elem),
              '—'
            )
            ELSE COALESCE(NULLIF(e.value #>> '{}', ''), e.value::text, '—')
          END
        ) AS item,
        COALESCE(f._order, 1000) AS ord
      FROM jsonb_each(rec.questionnaire_answers) AS e
      LEFT JOIN questionnaires_fields AS f ON f.id = e.key
    ) AS mapped;

    UPDATE personal_orders
    SET questionnaire_answers = jsonb_build_object('items', built)
    WHERE id = rec.id;
  END LOOP;
END $$;

WITH latest AS (
  SELECT id
  FROM questionnaires
  WHERE active IS TRUE
  ORDER BY created_at DESC
  LIMIT 1
)
UPDATE questionnaires
SET active = false
WHERE active IS TRUE
  AND id NOT IN (SELECT id FROM latest);

DELETE FROM questionnaires_fields_options
WHERE _parent_id IN (
  SELECT f.id
  FROM questionnaires_fields f
  JOIN questionnaires q ON q.id = f._parent_id
  WHERE q.active IS TRUE
);

DELETE FROM questionnaires_fields
WHERE _parent_id IN (SELECT id FROM questionnaires WHERE active IS TRUE);

INSERT INTO questionnaires_fields (_order, _parent_id, id, label, field_type, required, hint, "order")
SELECT
  v.ord,
  q.id,
  v.fid,
  v.label,
  v.field_type::enum_questionnaires_fields_field_type,
  v.required,
  v.hint,
  v.ord
FROM questionnaires q
CROSS JOIN (
  VALUES
    (1, 'q01', 'Как к вам обращаться?', 'text', true, NULL),
    (2, 'q02', 'Выберите основную тему вашей персональной фабулы.', 'select', true, NULL),
    (3, 'q03', 'Что сейчас происходит в этой сфере вашей жизни?', 'textarea', true, NULL),
    (4, 'q04', 'Что именно вы хотите изменить?', 'textarea', true, NULL),
    (5, 'q05', 'Какого состояния вы хотите достичь?', 'textarea', true, NULL),
    (6, 'q06', 'Представьте, что желаемые изменения уже произошли. Что изменилось в вашей жизни?', 'textarea', true, NULL),
    (7, 'q07', 'Какие мысли или внутренние установки сейчас вам мешают?', 'textarea', true, NULL),
    (8, 'q08', 'Какие новые убеждения вы хотели бы укрепить?', 'textarea', true, NULL),
    (9, 'q09', 'Назовите одну главную цель, которая для вас сейчас особенно важна.', 'textarea', true, NULL),
    (10, 'q10', 'Почему эта цель важна именно для вас?', 'textarea', true, NULL),
    (11, 'q11', 'Какие ваши качества уже помогают вам двигаться вперёд?', 'textarea', true, NULL),
    (12, 'q12', 'Какие качества вы хотите усилить?', 'textarea', true, NULL),
    (13, 'q13', 'Есть ли слова, выражения или темы, которые вы НЕ хотите слышать в своей фабуле?', 'text', false, 'Если ограничений нет, напишите «Нет».'),
    (14, 'q14', 'Напишите всё, что ещё важно знать о вас для создания персональной фабулы.', 'textarea', false, NULL)
) AS v(ord, fid, label, field_type, required, hint)
WHERE q.active IS TRUE;

INSERT INTO questionnaires_fields_options (_order, _parent_id, id, value)
VALUES
  (1, 'q02', 'q02o01', 'Уверенность в себе'),
  (2, 'q02', 'q02o02', 'Деньги и финансовое мышление'),
  (3, 'q02', 'q02o03', 'Отношения'),
  (4, 'q02', 'q02o04', 'Внутреннее спокойствие'),
  (5, 'q02', 'q02o05', 'Мотивация и энергия'),
  (6, 'q02', 'q02o06', 'Фокус и концентрация'),
  (7, 'q02', 'q02o07', 'Самооценка'),
  (8, 'q02', 'q02o08', 'Достижение цели'),
  (9, 'q02', 'q02o09', 'Другое');
