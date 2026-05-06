# ============================================
# Backend Dockerfile — Production
# Node 22 Alpine, Prisma, TypeScript
# ============================================

# --- Stage 1: Сборка ---
FROM node:22-alpine AS build

WORKDIR /app

# Установка зависимостей для нативных модулей (sharp, bcrypt)
# node-addon-api — обязательна для сборки sharp из исходников на Alpine
RUN apk add --no-cache python3 make g++ vips-dev pkgconfig

# Копируем только package.json для кэширования зависимостей
COPY package.json package-lock.json* ./

# Устанавливаем ВСЕ зависимости
# sharp: ставим зависимости для сборки из исходников (node-addon-api + node-gyp),
# затем npm ci --ignore-scripts (чтобы sharp не падал на отсутствии prebuilt),
# потом вручную собираем sharp с системным vips
RUN npm ci --ignore-scripts && \
    npm install node-addon-api node-gyp --save-dev && \
    cd node_modules/sharp && npm run build

# Копируем Prisma-схему и генерируем клиент
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

# Копируем исходный код и компилируем
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# --- Stage 2: Production ---
FROM node:22-alpine AS production

# Безопасность: запуск от непривилегированного пользователя
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Рантайм-зависимости для sharp (только библиотеки, без -dev headers)
RUN apk add --no-cache vips

# Копируем package.json
COPY package.json package-lock.json* ./

# Копируем node_modules из build-стейджа (sharp уже скомпилирован)
COPY --from=build /app/node_modules ./node_modules/

# Удаляем devDependencies из скопированных node_modules
RUN npm prune --omit=dev && npm cache clean --force

# Prisma CLI нужен для runtime-миграций (prisma migrate deploy)
RUN npm install prisma --save-prod

# Копируем сгенерированный Prisma-клиент и схему из стадии сборки
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/prisma ./prisma/
COPY --from=build /app/prisma.config.ts ./

# Копируем скомпилированный JS-код
COPY --from=build /app/dist ./dist/

# Копируем скрипт запуска
COPY start.sh ./
RUN chmod +x start.sh

# Создаём директорию для загрузок
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app/uploads

# Переключаемся на непривилегированного пользователя
USER appuser

EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["./start.sh"]
