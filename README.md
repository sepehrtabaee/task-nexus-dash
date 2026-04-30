# task-manager-dashboard

> **Part of a larger project.** The main README, architecture overview, and full system documentation live here:
> **[sepehrtabaee/task-nexus-core](https://github.com/sepehrtabaee/task-nexus-core)**
>
> The AI-powered Telegram bot that feeds this dashboard is here:
> **[sepehrtabaee/task-nexus-bot](https://github.com/sepehrtabaee/task-nexus-bot)**

---

## Role in Ecosystem

> **"The persistent visual anchor for TaskNexus."**

This repo is the always-on kiosk frontend for the TaskNexus system. It was built to run on a personal Raspberry Pi — mounted to a wall/desk, always on, always in sync. That said, there's nothing Pi-specific about the app itself; it's a standard Vite build that can be hosted on any web platform if you want to use it outside a local setup.

---

## Tech Stack

| Layer | Choice |
|---|---|
| UI framework | React 18 |
| Build tool | Vite |
| Styling | Plain CSS with CSS custom properties |
| Auth + reads + realtime | `@supabase/supabase-js` ([src/supabase.js](src/supabase.js)) — email/password sign-in, RLS-scoped queries, WebSocket realtime |
| Writes | `fetch` via a thin wrapper ([src/api.js](src/api.js)) that hits the backend directly with the cached Supabase access token (the backend validates the JWT) |

---

## Kiosk Optimization

The dashboard is built to run unattended 24/7 on a small screen with no keyboard or mouse input from a regular user.

The layout fills the viewport exactly with `overflow: hidden` on `html`, `body`, and `#root` — nothing can scroll out of frame. The color palette is high contrast dark so it's readable at arm's length. Lists and tasks update in real time via Supabase's `postgres_changes` channel, with a "last data refresh" timestamp in the header so you can confirm the connection is healthy at a glance. A concise mode (`C` key) filters the task list to only incomplete tasks and those completed today, and the entire UI is keyboard-navigable for use with a remote or keypad.

### Why Supabase realtime (and not polling)

The dashboard originally polled the REST backend every 15 seconds. That worked, but tasks created from Telegram took up to 15s to appear — noticeable on a wall display you're standing in front of — and produced constant network chatter even when nothing was happening.

Switching to Supabase realtime (a single WebSocket subscribed to `postgres_changes` on `taskmanager_lists` and `taskmanager_tasks`, scoped by RLS to the signed-in user) gets us instant updates with effectively zero standing overhead, and the reconnect logic is handled by `@supabase/supabase-js`. Per-list incomplete-task counts are maintained incrementally from the event stream rather than re-queried, so a task toggle is one round-trip end-to-end. See [src/App.jsx](src/App.jsx) for the channel setup.

### Keyboard shortcuts

| Key | Action |
|---|---|
| `Tab` / `←` `→` | Switch focus between Lists and Tasks panels |
| `↑` `↓` | Navigate within the focused panel |
| `Enter` | Select a list / toggle a task as done |
| `N` | Create a new list or task |
| `E` | Edit selected list or task |
| `D` / `Delete` | Delete selected item (with confirmation) |
| `C` | Toggle concise view |
| `+` / `-` | Increase / decrease task font size |
| `Esc` | Close any open modal |

---

## Raspberry Pi Setup

The dashboard runs in Chromium kiosk mode on a Raspberry Pi, launching automatically on boot.

### Boot into Chromium Kiosk Mode

The autostart file for the LXDE desktop session calls `start_dashboard.sh` directly — the script handles everything: killing stale processes, building the app, disabling the screensaver, and launching Chromium.

Edit the autostart file:

```bash
sudo nano /etc/xdg/lxsession/LXDE-pi/autostart
```

Add this line at the bottom:

```bash
@/home/lordstz/start-dashboard.sh
```

The script then launches Chromium with:

```bash
nohup chromium --kiosk http://localhost:5173 > /dev/null 2>&1 &
```

**Pro-tip — flags explained:**

| Flag | Why it matters |
|---|---|
| `--kiosk` | Fullscreen, no browser chrome, no way to exit via UI |
| `nohup ... &` | Detaches Chromium from the shell so it keeps running after the script exits |
| `> /dev/null 2>&1` | Suppresses all Chromium log output — nothing to clog up the Pi's storage |

### Running the dashboard process on boot

The deploy workflow calls [start_dashboard.sh](start_dashboard.sh) on the Pi after every push. It runs in sequence:

1. Sets `DISPLAY=:0` so X11 commands work over an SSH session
2. Disables the screensaver and DPMS power management via `xset` so the screen never blanks unattended
3. Kills any stale Chromium, Node, and Vite processes to ensure a clean slate
4. Runs `npm install` and `npm run build` to produce a fresh production bundle
5. Starts the built app with `npm run preview` (lighter than the dev server — no HMR, lower memory)
6. Waits briefly for the server to bind, then launches Chromium in kiosk mode

---

## CI/CD — Deploy via Tailscale

[.github/workflows/deploy.yml](.github/workflows/deploy.yml)

Every push to `main` triggers a GitHub Actions workflow that deploys directly to the Raspberry Pi over a private [Tailscale](https://tailscale.com) tunnel — no port-forwarding, no public IP required.

### How it works

```
GitHub Actions runner
      │
      │  (Tailscale VPN tunnel)
      ▼
Raspberry Pi  ←─ scp all files ─── runner
      │
      └─ ssh → ~/start-dashboard.sh
```

**Steps in the workflow:**

1. **Install Tailscale** — The `tailscale/github-action@v2` action authenticates the runner into your Tailnet using `TAILSCALE_AUTHKEY`.
2. **Test connection** — `ping` the Pi by its Tailscale hostname to confirm the tunnel is up before attempting a transfer.
3. **Copy files** — `scp` the entire repo to `~/task-manager-pi` on the Pi using an ed25519 SSH key stored in secrets.
4. **Restart dashboard** — `ssh` into the Pi and run `start-dashboard.sh` with `nohup` so it survives the SSH session closing.

### Required GitHub secrets

| Secret | Description |
|---|---|
| `TAILSCALE_AUTHKEY` | Tailscale auth key for the Actions runner |
| `PI_HOST` | Tailscale hostname or IP of the Raspberry Pi |
| `PI_USER` | SSH username on the Pi |
| `PI_SSH_KEY` | Private ed25519 SSH key (matching a public key in `~/.ssh/authorized_keys` on the Pi) |

---

## Local Development

```bash
npm install
npm run dev
```

The Vite dev server starts on `http://localhost:5173`. Reads, realtime, and auth go directly to Supabase from the browser; writes hit the backend via the Vite `/api` proxy. Configure both via env vars:

```bash
# .env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_API_TARGET=http://<your-backend-host>:3000
```

To point at a remote backend (e.g. the Pi itself over Tailscale):

```bash
VITE_API_TARGET=http://<pi-tailscale-ip>:3000 npm run dev
```
