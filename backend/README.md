# Calendar Backend

Node.js + Express + PostgreSQL сервер для календаря заметок.

## Установка

### 1. Убедитесь, что установлен PostgreSQL

Создайте базу данных:
```sql
CREATE DATABASE calendar_db;
```

Или используйте строку подключения в `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/calendar_db
```

### 2. Установите зависимости

```bash
cd backend
npm install
```

### 3. Настройте .env

Скопируйте `.env.example` в `.env` и настройте параметры подключения к БД.

### 4. Запустите сервер

```bash
npm run dev
```

Сервер запустится на http://localhost:3001

## API Endpoints

### Auth

- `POST /api/auth/register` - Регистрация
  - Body: `{ email, password, name }`
  - Returns: `{ token, user }`

- `POST /api/auth/login` - Вход
  - Body: `{ email, password }`
  - Returns: `{ token, user }`

- `GET /api/auth/me` - Текущий пользователь
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ user }`

### Tasks

- `GET /api/tasks` - Все задачи пользователя
  - Query: `?startDate=2024-01-01&endDate=2024-01-31`
  - Headers: `Authorization: Bearer <token>`

- `POST /api/tasks` - Создать задачу
  - Body: `{ date, text, completed }`
  - Headers: `Authorization: Bearer <token>`

- `PUT /api/tasks/:id` - Обновить задачу
  - Body: `{ text?, completed?, position?, date? }`
  - Headers: `Authorization: Bearer <token>`

- `DELETE /api/tasks/:id` - Удалить задачу
  - Headers: `Authorization: Bearer <token>`

- `GET /api/tasks/by-date/:date` - Задачи на дату
  - Headers: `Authorization: Bearer <token>`
