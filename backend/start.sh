#!/bin/sh
set -e

echo "==> Ожидание готовности базы данных..."

# Ожидание готовности PostgreSQL (до 30 секунд)
MAX_RETRIES=30
RETRY_COUNT=0

until node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.query('SELECT 1')
    .then(() => { pool.end(); process.exit(0); })
    .catch(() => { pool.end(); process.exit(1); });
" 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "ОШИБКА: База данных недоступна после ${MAX_RETRIES} попыток. Завершаю."
    exit 1
  fi
  echo "  БД пока недоступна, повтор через 1с... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 1
done

echo "==> БД доступна! Применяю миграции..."
npx prisma migrate deploy

echo "==> Миграции применены. Запускаю сервер..."
exec node dist/server.js
