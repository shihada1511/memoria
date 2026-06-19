# Memoria Frontend

A React frontend for the Memoria flashcard study app, connected to the Memoria backend REST API.

## Prerequisites

- Node.js and npm installed
- The Memoria backend running (see "Running the backend" below)

## How to install dependencies

```bash
npm install
```

## How to start the frontend

```bash
npm start
```

This starts the React development server at **http://localhost:3000**.

## Running the backend

The backend is included in this repository (`server.js`) and runs separately on its own port:

```bash
npm run server
```

This starts the Express API at **http://localhost:5173**.

## API Base URL

The frontend communicates with the backend REST API at:

```
http://localhost:5173/api
```

This is configured in `src/services/api.js`.

## Test login

Use one of the mock accounts to sign in:

| Email              | Password      | Role    |
|--------------------|---------------|---------|
| mohammad@gmail.com | password123   | admin   |
| jane@outlook.com   | password123   | user    |
| alice@hotmail.com  | password123   | manager |

## Project structure

- `src/components/` - Reusable UI elements (Navbar, Footer, Card, Table, Layout)
- `src/pages/` - Main route views (Login, Dashboard, Settings)
- `src/services/` - API communication logic (axios instance + service modules)
- `src/App.js` - Main entry point and routing configuration
