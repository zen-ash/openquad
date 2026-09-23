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

Web runs on http://localhost:5173 and the server on port 2567.

Other scripts:

```sh
pnpm test        # unit + integration tests
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

## Credits

- Character models from the [Ultimate Modular Men Pack](https://poly.pizza/bundle/Ultimate-Modular-Men-Pack-ZiH8muWqwQ) by Quaternius (CC0)
