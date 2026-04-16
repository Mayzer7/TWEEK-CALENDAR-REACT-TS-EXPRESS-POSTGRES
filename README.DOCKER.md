## Docker запуск (одной командой)

### Требования
- Docker Desktop (Windows/Mac) или Docker Engine (Linux)

### Запуск
Из корня проекта:

```bash
docker compose up --build --watch
```

После старта:
- **Frontend**: `http://localhost:5173`
- **Backend**: `http://localhost:3001/api/health`
- **PostgreSQL**: `localhost:5432` (user: `postgres`, password: `mayzer`, db: `calendar_db`)

### Что происходит
- `db`: PostgreSQL с уже созданной БД `calendar_db`
- `backend`: Node/Express + автоинициализация таблиц при старте
- `frontend`: Vite dev server

### Остановить

```bash
docker compose down
```

### Сбросить данные БД

```bash
docker compose down -v
```

