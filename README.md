# Memoria — Full-Stack Flashcard App

A complete full-stack study application built with React, Express, MySQL (Sequelize ORM), Socket.IO, and Groq (OpenAI-compatible LLM API).

---

## Project Purpose

Memoria lets users create flashcard decks, study them, and collaborate in real-time study sessions. An AI generator creates flashcard Q&A pairs from any topic, which can be reviewed and saved straight into a deck. The app has three roles — **user**, **manager**, and **admin** — with role-appropriate permissions, and supports light/dark/system theming.

---

## Project Structure

```
Memoria/
├── frontend/          # React frontend
│   └── src/
│       ├── components/    # Card, Table, Navbar, Footer, Layout, StudySession, AIGenerator
│       ├── pages/         # Login, SignUp, Dashboard, Settings, ManageUsers
│       └── services/      # api.js, authService, dashboardService, settingsService, userService, socketService
│       └── theme.css      # Light/dark CSS variables
└── backend/           # Node.js + Express backend
    ├── src/
    │   ├── controllers/   # auth, user, admin, deck, card, settings, ai
    │   ├── routers/       # Express route definitions
    │   ├── middleware/     # logger, authorization
    │   └── socket/        # socketHandler.js (Socket.IO events)
    ├── models/            # Sequelize ORM models (User, Admin, Deck, Card, Tag)
    ├── migrations/        # Database schema migrations
    ├── seeders/           # Demo seed data
    └── config/            # Sequelize DB config
```

---

## Installation

### Prerequisites

- Node.js ≥ 18
- MySQL Server running locally on port 3306
- A Groq API key (free, no billing required — for AI card generation)

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
| `AI_API_KEY`  | Groq API key — get one free at https://console.groq.com/keys (never expose to frontend) |

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
- **Admin**: standalone account model (no associations) — mirrors `User`'s `username`/`email`/`password`/`theme` fields, but always has role `admin`

---

## Roles & Permissions

| Capability                          | user | manager | admin |
|--------------------------------------|------|---------|-------|
| View/create/edit/delete **own** decks & cards | ✅ | ✅ | ✅ |
| View/manage **other users'** decks & cards    | ❌ | ❌ | ✅ |
| Live Study Session, AI generator, Settings    | ✅ | ✅ | ✅ |
| "Manage Users" page (`/admin/users`)          | ❌ | ✅ (own scope only) | ✅ (full) |
| Change a `user`'s role / delete their account | ❌ | ✅ | ✅ |
| Change a `manager`'s or `admin`'s role/account| ❌ | ❌ | ✅ (users/managers only — manage other Admins via `/api/admins`) |
| Self-promote own role                         | ❌ | ❌ | n/a |

Notes:
- New sign-ups (`/signup`, public, no auth) always get role `user` — the API ignores any `userRole` sent in that request, so it can't be used to self-promote.
- Admin accounts live in a separate `Admins` table, not `Users`. Session tokens encode the role (`base64(id:email:role)`) so admin/user accounts that happen to share the same numeric ID are never confused server-side.

---

## Running the Application

```bash
# Terminal 1 — backend (port 3000)
cd backend && npm start

# Terminal 2 — frontend (port 5173)
cd frontend && npm start
```

Open **http://localhost:5173** in your browser. New users can also register via the **Create account** link on the login page.

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
| POST   | `/api/auth/login` | Login (checks both Users and Admins tables), get token |
| POST   | `/api/auth/logout`| Logout            |

### Users
| Method | Path             | Description          |
|--------|------------------|----------------------|
| GET    | `/api/users/me`  | Get current user (or admin) |
| PUT    | `/api/users/me/password` | Change password (works for users and admins) |
| GET    | `/api/users`     | List all users (admin/manager) |
| GET    | `/api/users/:id` | Get a single user (admin/manager) |
| POST   | `/api/users`     | Create user / public sign-up — always creates role `user` |
| PUT    | `/api/users/:id` | Update user (name, role). Self-role-change and manager-on-manager edits are blocked |
| DELETE | `/api/users/:id` | Delete user (admin/manager; managers can't delete other managers) |

### Admins (admin-only)
| Method | Path              | Description          |
|--------|-------------------|----------------------|
| GET    | `/api/admins`     | List all admins      |
| GET    | `/api/admins/:id` | Get a single admin   |
| POST   | `/api/admins`     | Create an admin account |
| PUT    | `/api/admins/:id` | Update an admin's name |
| DELETE | `/api/admins/:id` | Delete an admin account |

### Settings (current user or admin)
| Method | Path            | Description                          |
|--------|-----------------|---------------------------------------|
| GET    | `/api/settings` | Get username/email/theme              |
| PUT    | `/api/settings` | Update username/email/theme           |

### Decks
| Method | Path                       | Description               |
|--------|----------------------------|---------------------------|
| GET    | `/api/decks`               | Your decks (admin sees everyone's) |
| GET    | `/api/decks/:id`           | Deck detail with cards (owner or admin only) |
| POST   | `/api/decks`               | Create deck               |
| PUT    | `/api/decks/:id`           | Update deck (owner or admin only) |
| DELETE | `/api/decks/:id`           | Delete deck (owner or admin only) |
| POST   | `/api/decks/:id/tags`      | Add tag to deck           |
| DELETE | `/api/decks/:id/tags/:tagId` | Remove tag from deck   |

### Cards
| Method | Path                                  | Description      |
|--------|----------------------------------------|------------------|
| GET    | `/api/decks/:deckId/cards`            | Cards in a deck (owner or admin only) |
| GET    | `/api/decks/:deckId/cards/:cardId`    | Single card (owner or admin only) |
| POST   | `/api/decks/:deckId/cards`            | Create card      |
| PUT    | `/api/decks/:deckId/cards/:cardId`    | Update card      |
| DELETE | `/api/decks/:deckId/cards/:cardId`    | Delete card      |

### AI
| Method | Path                      | Description                      |
|--------|---------------------------|-----------------------------------|
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

Generated cards are shown with a checkbox each, plus a deck picker and an **"Add N to deck"** button — selected cards are saved via the existing card-creation endpoint and appear immediately in the Dashboard.

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
| `session-complete`  | `{ deckId, username }`                         | Broadcast when you master every card in a round |

| Event (listen)      | Payload                                             | Description                            |
|---------------------|-----------------------------------------------------|-----------------------------------------|
| `session-update`    | `{ deckId, participants, event, username }`          | Someone joined or left the session     |
| `card-progress`     | `{ socketId, username, deckId, cardIndex, totalCards }` | Another user flipped a card         |
| `session-finished`  | `{ socketId, username, deckId }`                    | Another user completed the deck        |

To test with two clients: open the app in two different browser tabs, log in with different accounts, pick the same deck, and click **Join Session** in both tabs.

### Study Session mechanics

Studying a deck is round-based, not a single linear pass:

- After flipping a card, rate it **✅ Got it** or **❌ Still learning**.
- Cards marked "Still learning" are queued and replayed in the next round; this repeats until every card has been rated "Got it" at least once.
- A "Round N" badge appears once you're past round 1. A completion screen shows the total rounds taken, with a "Study Again" button.
- **Keyboard shortcuts**: `Space`/`Enter` flips the card, `→` rates "Got it", `←` rates "Still learning" (disabled while typing in any form field elsewhere on the page).
- While a session is active, the Dashboard's Flashcards table (which shows answers) is hidden so you can't accidentally see the answer — with a manual "Show anyway" override if you want to peek.

---

## AI Feature

**Endpoint:** `POST /api/ai/generate-cards`

The backend calls Groq's OpenAI-compatible chat completions API (`llama-3.3-70b-versatile`) with a structured prompt and JSON response mode, parses the response, and returns validated Q&A pairs. The API key is kept server-side — it is never sent to or accessible from the frontend.

To use this feature, set `AI_API_KEY` in `backend/.env` to a Groq key (free tier, no billing required). Get one at https://console.groq.com/keys.

---

## Theming

Settings → theme picker supports **Light**, **Dark**, and **System**. The preference is stored per-account (`username`/`email`/`theme` on both `Users` and `Admins`) and applied app-wide via a `data-theme` attribute on `<html>`, driven by CSS variables defined in `frontend/src/theme.css`. "System" follows the OS color-scheme preference live, updating immediately if you change it while the app is open — no refresh needed.

---

## Known Limitations

- Authentication uses a simple base64 token (`id:email:role`), not JWT. Not suitable for production.
- The `x-user-role` / `x-user-id` headers are trusted from the client (no cryptographic verification) — fine for a learning project, not for production.
- AI generation requires an active Groq API key with available quota.
- Socket.IO rooms are in-memory; they reset on server restart.
- There's no frontend UI for admin-to-admin management yet — only the `/api/admins` endpoints exist; managing other admin accounts currently requires calling the API directly.
