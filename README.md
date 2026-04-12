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
| API comms | `fetch` via a thin wrapper ([src/api.js](src/api.js)) |
| Dev proxy | Vite's built-in proxy (`/api` → backend) |

---

## Kiosk Optimization

The dashboard is built to run unattended 24/7 on a small screen with no keyboard or mouse input from a regular user.

The layout fills the viewport exactly with `overflow: hidden` on `html`, `body`, and `#root` — nothing can scroll out of frame. The color palette is high contrast dark so it's readable at arm's length. Lists and tasks poll the API every 5 seconds with a live timestamp in the header. A concise mode (`C` key) filters the task list to only incomplete tasks and those completed today, and the entire UI is keyboard-navigable for use with a remote or keypad.

### Why polling instead of WebSockets

Tasks change when someone messages the Telegram bot — not in milliseconds. A 5-second lag is invisible on a wall display, so the complexity of WebSockets isn't justified here. Plain `GET` requests are easier to debug, recover automatically from network blips without any reconnection logic, and add zero standing overhead on constrained Pi hardware.

### Keyboard shortcuts

| Key | Action |
|---|---|
| `Tab` / `←` `→` | Switch focus between Lists and Tasks panels |
| `↑` `↓` | Navigate within the focused panel |
| `Enter` | Select a list / toggle a task as done |
| `N` | Create a new list or task |
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

## Potential Improvements

**Telegram-based login verification** — Currently the dashboard logs a user in the moment they type their ID, with no confirmation step. A better flow would be: user enters their ID → the bot sends them a one-time code on Telegram → they enter the code to confirm they actually own that account. This would prevent anyone who knows a user's ID from viewing their tasks.

This wasn't implemented because the dashboard runs on a local network for personal use — there's no real threat model that makes it worth the added complexity. If this were ever hosted publicly, it would be the first thing to add.

---

## Local Development

```bash
npm install
npm run dev
```

The Vite dev server starts on `http://localhost:5173` and proxies `/api` requests to the backend. Set the backend target via environment variable:

```bash
# .env
VITE_API_TARGET=http://<your-backend-host>:3000
```

To point at a remote backend (e.g. the Pi itself over Tailscale):

```bash
VITE_API_TARGET=http://<pi-tailscale-ip>:3000 npm run dev
```
