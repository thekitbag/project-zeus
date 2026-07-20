# Project Zeus

Household operations. Broadly under control.

A self-hosted, mobile-first household coordination app. Runs on a Raspberry Pi. Has opinions.

## Stack

- **Next.js 16** (App Router, standalone output)
- **TypeScript** + **Tailwind CSS**
- **Drizzle ORM** + **SQLite** (better-sqlite3)
- **TanStack Query** for optimistic UI
- **Docker** single-container deployment

---

## Local Development

```bash
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The database is created automatically at `./data/project-zeus.db` on first run and seeded with three default lists (Groceries, Costco, Household).

---

## Raspberry Pi Deployment

### Prerequisites

- Raspberry Pi 4 (any RAM)
- Docker + Docker Compose installed on the Pi
- Pi accessible on local network

### Deploy

Copy the project to the Pi (or clone it), then:

```bash
docker compose up -d --build
```

The app will be available at `http://<pi-ip>:3000`.

### mDNS / friendly URL

To reach it at `http://project-zeus.local`, configure mDNS on the Pi:

```bash
sudo apt install avahi-daemon
sudo hostnamectl set-hostname project-zeus
sudo systemctl restart avahi-daemon
```

### Data persistence

SQLite data lives in a named Docker volume (`zeus-data`). It survives container restarts and rebuilds.

To back up the database, use SQLite's online backup — **never** `cp` the `.db`
file on its own. In WAL mode recent writes live in the `-wal` sidecar file, so a
bare copy of `project-zeus.db` captures a stale, possibly near-empty database.
`VACUUM INTO` produces one consistent, fully-checkpointed file:

```bash
docker exec project-zeus-zeus-1 \
  node -e "require('better-sqlite3')('/data/project-zeus.db').exec(\"VACUUM INTO '/data/backup.db'\")" \
&& docker cp project-zeus-zeus-1:/data/backup.db ./zeus-backup-$(date +%F).db \
&& docker exec project-zeus-zeus-1 rm /data/backup.db
```

Replace `project-zeus-zeus-1` with your container name from `docker ps` if it differs.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_PATH` | `./data/project-zeus.db` | Path to the SQLite database file (set to `/data/project-zeus.db` in Docker) |

---

## Project Structure

```
app/
  api/           # API routes (lists, items)
  shopping/      # Shopping module (active)
  tasks/         # Coming soon
  films/         # Coming soon
  memories/      # Coming soon
  quiz/          # Coming soon
components/      # Shared UI components
db/              # Drizzle schema + database init
lib/             # Utilities (useLongPress, queryClient)
data/            # SQLite database (gitignored)
```

---

## Adding a New Module

1. Create `app/<module>/page.tsx`
2. Add a nav entry to `components/BottomNav.tsx`
3. That's it for a coming-soon placeholder. Build from there.

---

## Usage Notes

- **Long press** any item to delete it
- **Tap** the circle to complete an item (it moves to the Done section)
- All updates are optimistic — the UI responds instantly
- Add to home screen on iOS/Android for the full app experience
