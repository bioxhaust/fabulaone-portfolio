# FABULA ONE — деплой и приёмка

## Что в репозитории
- Next.js 15 + Payload CMS 3
- Docker Compose: app, Postgres 16, Redis 7, Nginx
- S3-плагин Media → Yandex Object Storage (если заданы `YOS_*`)
- Полные аудио — `fullAudioKey` / `audioKey` + signed URL
- SEO: `/robots.txt`, `/sitemap.xml`, favicon, OG-image

## До выкладки нужно
1. **YOS** — статический ключ сервисного аккаунта (`storage.editor`), бакет private
2. **`.env` на сервере** из `.env.example` + `POSTGRES_PASSWORD`
3. **DNS** — `fabulaone.ru` / `www` → IP VPS
4. ЮKassa / SMTP / Метрика — от клиента

## Первый деплой
```bash
ssh root@SERVER_IP
apt update && apt install -y docker.io docker-compose-v2 rsync curl
mkdir -p /opt/fabulaone
# положить .env в /opt/fabulaone/.env (включая POSTGRES_PASSWORD=...)

chmod +x deploy/deploy.sh
./deploy/deploy.sh root@SERVER_IP
```

HTTPS после DNS:
```bash
docker run --rm \
  -v fabulaone_certbot_www:/var/www/certbot \
  -v fabulaone_certbot_certs:/etc/letsencrypt \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d fabulaone.ru -d www.fabulaone.ru \
  --email admin@fabulaone.ru --agree-tos -n
# В docker-compose.yml сменить volume nginx на fabulaone.conf и:
docker compose up -d nginx
```

## После старта
1. `/admin` — создать админа
2. 6 продуктов + Media
3. `fullAudioKey` вида `audio/name.m4a`
4. Страницы: `offer`, `privacy`, `consent`, `payment-refund`, `contacts`
5. Webhook ЮKassa: `https://fabulaone.ru/api/webhooks/yookassa`

## SSH
Подключение: `./deploy/deploy.sh user@host`. Порт 22 должен быть открыт на вашем сервере.
