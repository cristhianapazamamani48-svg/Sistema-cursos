# ============================================================
# Stage 1: Build Frontend (Vite + React)
# ============================================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ============================================================
# Stage 2: Build Backend (NestJS)
# ============================================================
FROM node:22-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

# ============================================================
# Stage 3: Production image
# ============================================================
FROM node:22-alpine AS production

WORKDIR /app

# Copiar dependencias de produccion del backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copiar el build del backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copiar el build del frontend como archivos estaticos que NestJS servira
COPY --from=frontend-builder /app/frontend/dist ./public

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main"]
