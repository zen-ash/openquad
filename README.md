# OpenQuad

A multiplayer 3D campus in the browser with proximity voice chat. Walk up to someone and you can hear them, walk away and they fade out.

Final project for CSC 4370 (Web Programming) at Georgia State.

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

## Layout

```
apps/
  web/       3D client
  server/    websocket server
packages/
  shared/    shared types and helpers
docs/        design notes
```

See [docs/SPEC.md](docs/SPEC.md) for the plan.

## Controls

- WASD / arrow keys to walk
- Shift to run
- Q / E to turn the camera
- M to mute / unmute

## Credits

- Character models from the [Ultimate Modular Men Pack](https://poly.pizza/bundle/Ultimate-Modular-Men-Pack-ZiH8muWqwQ) by Quaternius (CC0)
