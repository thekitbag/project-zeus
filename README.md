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
- Tailscale on the Pi and on each phone

### Deploy

Copy the project to the Pi (or clone it), then:

```bash
docker compose up -d --build
```

The app will be available at `http://<pi-ip>:3000`.

### Remote access (Tailscale + HTTPS)

Phones reach the app over Tailscale at `https://<pi-name>.<tailnet>.ts.net`. Install the PWA from **this** URL — Chrome won't install a PWA from plain `http://`.

One-time setup:

1. In the Tailscale admin console → **DNS**, enable **MagicDNS** and **HTTPS Certificates**.
2. On the Pi:
   ```bash
   sudo tailscale serve --bg 3000   # HTTPS on :443 → app on :3000, persists across reboots
   sudo tailscale set --accept-dns=false
   ```

`http://<pi-ip>:3000` still works in a browser, but not as an installed app. `.local` mDNS names don't resolve over Tailscale.

### Troubleshooting

Run the doctor on the Pi. It checks each layer in order; the first FAIL is usually the cause:

```bash
./scripts/pi-doctor.sh
```

**PWA shows "invalid response"** — almost always the TLS cert. Let's Encrypt certs last 90 days and Tailscale renews them in the background, which needs working DNS on the Pi. If DNS breaks, renewal fails silently and the app dies when the cert expires. Fix DNS, then force a renewal:

```bash
nmcli -t -f NAME,DEVICE con show --active          # find the wlan0/eth0 connection
sudo nmcli con mod "<connection>" ipv4.dns "1.1.1.1 8.8.8.8" ipv4.ignore-auto-dns yes
sudo nmcli con up "<connection>"                    # drops SSH briefly; reconnect via Tailscale IP
sudo tailscale cert <pi-name>.<tailnet>.ts.net
```

Also check you're not on `https://...:3000` — that sends TLS straight to the plain-HTTP app and gives the same error.

### Groceries email

The app emails the uncompleted items on the **Groceries** list to `SHANNON_EMAIL` itself; no host cron is needed. It checks every 15 minutes and sends once on each scheduled day, from the scheduled hour onwards (London time), so a send missed while the Pi was off still goes out later that day. An empty list is skipped. It only runs in production builds.

Needs `GMAIL_USER`, `GMAIL_APP_PASSWORD` (a Gmail app password) and `SHANNON_EMAIL` in `.env` / `.env.local` on the Pi. Optional: `SHOPPING_EMAIL_DAYS` (default `Mon,Thu`) and `SHOPPING_EMAIL_HOUR` (default `18`, i.e. 6pm). Check it with `docker compose logs zeus | grep shopping-email`.

To send one now: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/send-shopping-email`. That counts as the day's send.

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
