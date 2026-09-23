# OpenQuad

A multiplayer 3D campus in the browser with proximity voice chat. Walk up to someone and you can hear them, walk away and they fade out.

Final project for CSC 4370 (Web Programming) at Georgia State.

**Try it: https://openquad.onrender.com** (open it in two windows, or send it to a friend)

## Stack

- **web** - React, React Three Fiber, Vite
- **server** - Node + `ws`, handles position sync and WebRTC signaling
- **shared** - types, message protocol and math used by both

## Running it locally

Needs Node 22 and pnpm.

```sh
pnpm install
pnpm dev
```

Web runs on http://localhost:5173 and the server on port 2567. Open it in two browser
windows side by side to see multiplayer working. Walk them close together and you can hear
yourself through the other one (use headphones or it'll feed back).

Add `?quality=low` to the url to turn off shadows and effects on a slow laptop. It also does
this on its own if the framerate stays bad.

The mic only works on localhost or https. Opening it from another device on your wifi
(http://your-ip:5173) works, but that device can only listen.

Other scripts:

```sh
pnpm test        # unit + integration tests
pnpm e2e         # playwright, opens two browsers and checks they see each other
pnpm typecheck
pnpm lint
pnpm build
```

## Deploying

The game server also serves the built site, so the whole thing is one service. It runs on
Render's free tier from the `Dockerfile`, set up by `render.yaml`.

1. On Render: **New > Blueprint**, pick this repo. It reads `render.yaml`.
2. It asks for `CF_TURN_KEY_ID` and `CF_TURN_API_TOKEN`. These are for Cloudflare's TURN
   server (free, Cloudflare dashboard > Realtime > TURN Server > Create). Without them voice
   still works on most networks, but not on ones that block direct connections, which
   includes a lot of school wifi.
3. Deploy. After that it redeploys on its own whenever CI passes on `main`.

The free tier sleeps after 15 minutes with nobody on it and takes about a minute to wake
up, so open it a couple of minutes before showing it to anyone.

To try the production build locally:

```sh
docker build -t openquad .
docker run -p 8080:2567 openquad
```

## Layout

```
apps/
  web/       3D client
  server/    websocket server
packages/
  shared/    shared types and helpers
docs/        design notes
scripts/     build-campus.mjs pulls the campus from OpenStreetMap
```

See [docs/SPEC.md](docs/SPEC.md) for the plan.

## Controls

- WASD / arrow keys to walk
- Shift to run
- Q / E to turn the camera
- M to mute / unmute
- "Go to..." in the top right to jump to a building

## Credits

- Map data (c) [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, available under the Open Database License. `apps/web/src/campus/campus.json` is built from it with `pnpm campus`
- Textures from [Poly Haven](https://polyhaven.com) (CC0)
- Character models from the [Ultimate Modular Men Pack](https://poly.pizza/bundle/Ultimate-Modular-Men-Pack-ZiH8muWqwQ) by Quaternius (CC0)
