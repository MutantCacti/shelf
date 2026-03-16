# Shelf

A simple online transfer tool.

## What is Shelf?

Ever needed a sentence moved from your phone to your laptop? How about a file?

Shelf is a personal transfer tool for moving stuff between your devices. You can send yourself anything, including reminders, photos, links, and long OTPs.

![Shelf interface](docs/screenshot.png)

## Features

- Text and file transfers with drag-and-drop, paste, and upload.
- Send text directly from the toolbar.
- Multi-user with per-user passwords.
- Thumbnails for images, PDFs, and SVGs.
- Lasso selection and full keyboard shortcuts (press `?` in-app).
- Mobile UI with paste, upload, download, and delete.
- 1GB file upload limit.

## Tech stack

- **Frontend**: React 19, Zustand, Tailwind CSS v4, Vite.
- **Backend**: Litestar (Python), SQLAlchemy, SQLite.

## Getting started

Requires **Python 3.12+** and **Node 20+**.

### API

```bash
cd api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python setup_user.py
uvicorn main:app --host 127.0.0.1 --port 8000
```

### Frontend

```bash
npm install
npm run dev
```

The dev server proxies `/api` requests to the backend at `localhost:8000`.

## API reference

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | Login with password |
| `POST` | `/auth/logout` | End session |
| `POST` | `/auth/change-password` | Change password |
| `GET` | `/auth/check` | Check auth status |
| `POST` | `/auth/api-keys` | Create API key |
| `GET` | `/auth/api-keys` | List API keys |
| `DELETE` | `/auth/api-keys/:id` | Revoke API key |

### Transfers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/transfers` | List all transfers |
| `POST` | `/transfers` | Create text transfer |
| `POST` | `/transfers/upload` | Upload file |
| `GET` | `/transfers/:id/download` | Download file |
| `GET` | `/transfers/:id/thumbnail` | Get thumbnail |
| `PATCH` | `/transfers/:id` | Rename transfer |
| `DELETE` | `/transfers/:id` | Delete transfer |
| `POST` | `/transfers/batch-delete` | Delete multiple |
| `POST` | `/transfers/batch-download` | Download as ZIP |

### Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/stats` | Request counts per route |
| `GET` | `/health` | Health check |

## Feedback

[Open an issue](https://github.com/MutantCacti/shelf/issues/new) on GitHub.
