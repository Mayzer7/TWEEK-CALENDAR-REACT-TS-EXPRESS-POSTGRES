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


### Бэкап и восстановление базы данных

Для удобной работы с данными добавлены скрипты автоматизации:

1. **Создать бэкап** (сохранит текущую БД в `backup/calendar_db_backup.sql`):
   ```bash
   npm run backup
   ```

2. **Восстановить базу** (удалит текущую БД и загрузит данные из файла бэкапа):
   ```bash
   npm run restore
   ```

*Примечание: Скрипты должны запускаться из корня проекта при запущенных контейнерах.*
