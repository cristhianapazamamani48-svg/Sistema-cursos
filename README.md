# Plataforma de Cursos Virtuales

Plataforma web para alojar y vender cursos en línea con consumo asíncrono, progreso por bloques de 10s y pasarelas de pago bolivianas.

## Estructura del Proyecto

```text
├── backend/                # API REST con NestJS 11, Drizzle ORM y PostgreSQL 16
│   ├── migrations/         # Esquema SQL inicial y migraciones
│   └── src/                # auth, courses, lessons, progress, database
├── frontend/               # SPA con React, Vite, TypeScript y Tailwind CSS
├── docker-compose.yml      # Base de datos PostgreSQL para desarrollo
├── .gitignore
└── README.md
```

## Requisitos
- Node.js 22 LTS
- Docker y Docker Compose

## Puesta en marcha

1. **Levantar PostgreSQL:**
   ```bash
   docker compose up -d
   ```

2. **Iniciar Backend:**
   ```bash
   cd backend
   npm install
   npm run start:dev
   ```

3. **Iniciar Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Abre [http://localhost:5173](http://localhost:5173) en tu navegador.
