# Memoria — Full-Stack Flashcard App

A complete full-stack study application built with React, Express, MySQL (Sequelize ORM), Socket.IO, and Google Gemini.

---

## Project Purpose

Memoria lets users create flashcard decks, study them, and collaborate in real-time study sessions. An AI generator creates flashcard Q&A pairs from any topic.

---

## Project Structure

```
Memoria/
├── frontend/          # React frontend
│   └── src/
│       ├── components/    # Card, Table, Navbar, Footer, Layout, StudySession, AIGenerator
│       ├── pages/         # Login, Dashboard, Settings
│       └── services/      # api.js, authService, dashboardService, socketService
└── backend/           # Node.js + Express backend
    ├── src/
    │   ├── controllers/   # auth, user, admin, deck, card, settings, ai
    │   ├── routers/       # Express route definitions
    │   ├── middleware/     # logger, authorization
    │   └── socket/        # socketHandler.js (Socket.IO events)
    ├── models/            # Sequelize ORM models
    ├── migrations/        # Database schema migrations
    ├── seeders/           # Demo seed data
    └── config/            # Sequelize DB config
```

---

## Installation

### Prerequisites

- Node.js ≥ 18
- MySQL Server running locally on port 3306
- A Google Gemini API key (for AI card generation)

### 1. Clone / unzip the project

### 2. Backend setup

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

---

## Database Setup

1. Open MySQL Workbench (or any MySQL client) and create the database:

```sql
CREATE DATABASE memoria_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Make sure `backend/.env` has the correct `DB_USER` and `DB_PASSWORD`.

3. Run migrations and seed demo data:

```bash
cd backend
npm run migrate
npm run seed
```

You should now have tables: **Users, Admins, Decks, Cards, Tags, DeckTags**.

---

## Environment Variables

All variables live in `backend/.env` (copy from `.env.example`):

| Variable      | Description                                      |
|---------------|--------------------------------------------------|
| `NODE_ENV`    | `development` or `production`                    |
| `PORT`        | Backend port (default `3000`)                    |
| `DB_HOST`     | MySQL host (`127.0.0.1`)                         |
| `DB_PORT`     | MySQL port (`3306`)                              |
| `DB_NAME`     | Database name (`memoria_db`)                     |
| `DB_USER`     | MySQL username (`root`)                          |
| `DB_PASSWORD` | MySQL password                                   |
| `AI_API_KEY`  | Google Gemini API key (never expose to frontend) |

---

## ORM Setup

Memoria uses **Sequelize** with the `sequelize-cli`:

| Command              | Effect                             |
|----------------------|------------------------------------|
| `npm run migrate`    | Apply all pending migrations       |
| `npm run migrate:undo` | Roll back the last migration     |
| `npm run seed`       | Insert demo Users, Decks, Cards, Tags |
| `npm run seed:undo`  | Remove seeded data                 |

### Relationships

- **User → Decks**: one-to-many (`User.hasMany(Deck)`)
- **Deck → Cards**: one-to-many (`Deck.hasMany(Card)`)
- **Deck ↔ Tags**: many-to-many via `DeckTags` junction table

---

## Running the Application

```bash
# Terminal 1 — backend (port 3000)
cd backend && npm start

# Terminal 2 — frontend (port 5173)
cd frontend && npm start
```

Open **http://localhost:5173** in your browser.

Demo login credentials (after seeding):

| Email                  | Password    | Role    |
|------------------------|-------------|---------|
| mshihada@memoria.dev   | Passw0rd!   | user    |
| sara@memoria.dev       | Passw0rd!   | manager |
| admin@memoria.dev      | Passw0rd!   | admin   |

---

## API Endpoints

All responses follow this format:

```json
{ "success": true,  "data": {},   "error": null }
{ "success": false, "data": null, "error": { "code": "...", "message": "...", "details": {} } }
```

### Auth
| Method | Path              | Description       |
|--------|-------------------|-------------------|
| POST   | `/api/auth/login` | Login, get token  |
| POST   | `/api/auth/logout`| Logout            |

### Users
| Method | Path             | Description          |
|--------|------------------|----------------------|
| GET    | `/api/users/me`  | Get current user     |
| PUT    | `/api/users/me/password` | Change password |
| GET    | `/api/users`     | List all users (admin/manager) |
| POST   | `/api/users`     | Create user          |
| PUT    | `/api/users/:id` | Update user          |
| DELETE | `/api/users/:id` | Delete user          |

### Decks
| Method | Path                       | Description               |
|--------|----------------------------|---------------------------|
| GET    | `/api/decks`               | All decks (with owner + tags) |
| GET    | `/api/decks/:id`           | Deck detail with cards    |
| POST   | `/api/decks`               | Create deck               |
| PUT    | `/api/decks/:id`           | Update deck               |
| DELETE | `/api/decks/:id`           | Delete deck               |
| POST   | `/api/decks/:id/tags`      | Add tag to deck           |
| DELETE | `/api/decks/:id/tags/:tagId` | Remove tag from deck   |

### Cards
| Method | Path                                  | Description      |
|--------|---------------------------------------|------------------|
| GET    | `/api/decks/:deckId/cards`            | Cards in a deck  |
| GET    | `/api/decks/:deckId/cards/:cardId`    | Single card      |
| POST   | `/api/decks/:deckId/cards`            | Create card      |
| PUT    | `/api/decks/:deckId/cards/:cardId`    | Update card      |
| DELETE | `/api/decks/:deckId/cards/:cardId`    | Delete card      |

### AI
| Method | Path                      | Description                      |
|--------|---------------------------|----------------------------------|
| POST   | `/api/ai/generate-cards`  | Generate flashcards for a topic  |

**Request body:**
```json
{ "topic": "The French Revolution", "count": 5 }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "topic": "The French Revolution",
    "cards": [
      { "question": "...", "answer": "..." }
    ]
  },
  "error": null
}
```

---

## WebSocket Feature

### Connection

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:3000');
```

### Custom Events

| Event (emit)        | Payload                                        | Description                                 |
|---------------------|------------------------------------------------|---------------------------------------------|
| `join-session`      | `{ deckId, deckTitle, username }`              | Join a live study session for a deck        |
| `leave-session`     | `{ deckId }`                                   | Leave the session                           |
| `card-flipped`      | `{ deckId, cardIndex, totalCards, username }`  | Broadcast when you flip a card              |
| `session-complete`  | `{ deckId, username }`                         | Broadcast when you finish studying a deck   |

| Event (listen)      | Payload                                             | Description                            |
|---------------------|-----------------------------------------------------|----------------------------------------|
| `session-update`    | `{ deckId, participants, event, username }`          | Someone joined or left the session     |
| `card-progress`     | `{ socketId, username, deckId, cardIndex, totalCards }` | Another user flipped a card         |
| `session-finished`  | `{ socketId, username, deckId }`                    | Another user completed the deck        |

To test with two clients: open the app in two different browser tabs, log in with different accounts, pick the same deck, and click **Join Session** in both tabs.

---

## AI Feature

**Endpoint:** `POST /api/ai/generate-cards`

The backend calls the Google Gemini API (`gemini-2.0-flash`) with a structured prompt and JSON response mode, parses the response, and returns validated Q&A pairs. The API key is kept server-side — it is never sent to or accessible from the frontend.

To use this feature, set `AI_API_KEY` in `backend/.env` to a valid Gemini key. Get a free one at https://aistudio.google.com/apikey.

---

## Known Limitations

- Authentication uses a simple base64 token (not JWT). Not suitable for production.
- The `x-user-role` header is trusted from the client (no cryptographic verification).
- AI generation requires an active Gemini API key with available quota.
- Socket.IO rooms are in-memory; they reset on server restart.
