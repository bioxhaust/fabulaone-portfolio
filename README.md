# FABULA ONE

Магазин цифровых аудио: каталог, оплата, личный кабинет, индивидуальные заказы и партнёрская программа.

Это публичная портфолио-копия. Боевые секреты, реквизиты продавца и адрес сервера в неё не входят. Юридические тексты в сиде и на страницах согласия используют заглушку `privacy@example.com`.

## Стек

- Next.js 15 и React 19
- Payload CMS 3 (админка, заказы, медиа)
- PostgreSQL 16 и Redis 7
- Оплата через ЮKassa
- Аудио в S3-совместимом хранилище (Yandex Object Storage)
- Docker Compose для локальной базы и для продакшена

## Локальный запуск

Нужны Node.js 20+ и Docker.

```bash
npm install
cp .env.example .env
npm run db:dev
```

В `.env` для локальной базы из `docker-compose.dev.yml`:

```bash
DATABASE_URI=postgresql://fabula:fabula@localhost:5433/fabulaone
REDIS_URL=redis://localhost:6379
PAYLOAD_SECRET=$(openssl rand -hex 32)
MAGIC_LINK_SECRET=$(openssl rand -hex 32)
```

Остальные ключи (ЮKassa, Object Storage, SMTP) можно оставить пустыми, пока не нужны оплата, загрузка полных аудио и письма.

```bash
npm run dev
```

Сайт: [http://localhost:3000](http://localhost:3000). Админка: [http://localhost:3000/admin](http://localhost:3000/admin) — при первом заходе создайте администратора.

Демо-каталог и страницы:

```bash
npm run seed
```

Остановить локальные Postgres и Redis: `npm run db:dev:down`.

Пароль `fabula` у Postgres только у dev-compose. В проде пароль берётся из `POSTGRES_PASSWORD` и в репозиторий не кладётся.
