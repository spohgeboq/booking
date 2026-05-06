# ============================================
# Booking Frontend Dockerfile — Production
# Multi-stage: Vite build + Nginx Alpine
# ============================================

# --- Stage 1: Сборка ---
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Переменные окружения для Vite (подставляются при сборке)
ARG VITE_BACKEND_URL
ARG VITE_ADMIN_URL

ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_ADMIN_URL=${VITE_ADMIN_URL}

RUN npm run build

# --- Stage 2: Раздача статики ---
FROM nginx:1.25-alpine AS production

# Безопасность: удаляем дефолтный конфиг и серверные заголовки
RUN rm -rf /usr/share/nginx/html/* && \
    rm /etc/nginx/conf.d/default.conf

# Копируем собранное приложение
COPY --from=build /app/dist /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Безопасность: non-root пользователь
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
