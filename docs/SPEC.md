# OpenQuad - project plan

## Idea

Zoom calls are a grid of boxes. There's no way to wander over to a group, have a side
conversation, or just bump into someone. OpenQuad puts everyone on a 3D campus instead.
You walk around, and voice chat works by distance - people get louder as you get closer
and fade out as you walk away, like real life.

Demo goal: the whole class joins from their laptops, and I walk my avatar over to the
professor's and start talking.

## Look and feel

Going for the style of the 3D Pokemon games - low poly, bright colors, toon shading with
outlines, and a camera that sits up and behind the player looking down. Only the style
though, no actual Pokemon characters or assets (all models are CC0).

- toon shading: `MeshToonMaterial` with a 3 step gradient, drei `<Outlines>` on buildings/trees
- characters: Quaternius modular men pack, trimmed down to Idle/Walk/Run/Wave to keep the
  file small (~600kb instead of 2mb)
- later: a "!" over someone's head when they come into voice range

## How it works

```
 browser (each player)                     server (Node + ws)
 ---------------------                     ------------------
 React Three Fiber scene   <-- /ws ------>  room state, 20 ticks/sec
 WebRTC audio (p2p)        <-- /ws ------>  relays offer/answer/ice
                           <-- /ice -----   stun/turn servers
                           <-- /* -------   the built site
```

Everything is on one host and port. In dev, Vite proxies `/ws` and `/ice` to the game
server so the client code is the same either way.

- **Position sync** - clients send their position (at most 20 times a second, only if it
  changed), server batches everything that changed and broadcasts 20 times a second.
- **Interpolation** - other players are drawn 100ms (2 ticks) in the past, blending between
  the two snapshots around that time, so they move smoothly instead of jumping every tick.
  When someone starts moving after standing still, a fake "still here" snapshot is added
  first so they don't slide over in slow motion (`apps/web/src/game/interpolation.ts`).
  Their walk/run animation is picked from how fast they're moving.
- **Voice** - WebRTC peer to peer. The server is only used for signaling (passing the
  offer/answer/ICE messages between two players), audio never goes through it.
- **Only connect to people nearby.** Full mesh with 30 people is 435 connections, which
  won't work. A client calls players within 18m (a bit before you can hear them, so the call
  is ready) and hangs up past 25m. The gap stops it reconnecting over and over if someone
  walks along the edge. Max 8 calls at once, closest first. If this still isn't enough for a
  full class, fallback is an SFU like LiveKit.
- **Who calls who** - for each pair, only the player with the smaller id makes the call, so
  both sides don't call each other at the same time. The other side answers any offer. Hanging
  up sends a `bye` so the other side closes too. (`apps/web/src/voice/peers.ts`)
- **Proximity audio** - each remote voice goes mic stream -> gain -> `PannerNode` -> speakers.
  The gain comes from `voiceVolume()` (full volume under 2m, silent past 15m), the panner
  only does direction (HRTF, so it sounds like it comes from the left/right).
- **Speaking indicator** - an `AnalyserNode` on every stream, checked every frame. Name tag
  goes green while someone talks.
- Chrome quirk: audio from a remote WebRTC stream is silent in Web Audio unless the stream is
  also attached to an `<audio>` element, so there's a muted one per call.

## Deployment

- One Docker image: build the web app and bundle the server into a single file with esbuild
  (no node_modules at runtime), then the server serves the site with `sirv`. Render free
  tier, config in `render.yaml`, deploys after CI passes.
- **TURN** - STUN only works when both people can reach each other directly. On strict
  networks (a lot of school/work wifi) audio has to be relayed through a TURN server.
  The server gets short-lived credentials from Cloudflare's TURN (free up to 1000GB/month)
  and hands them to clients at `/ice`. The key stays on the server.
- **Dead connections** - the server pings every client every 30s and kicks anyone who
  didn't answer the last one (closed laptop, dropped wifi). Browsers answer pings on their
  own, even in background tabs.
- **Keepalive** - Render's free tier sleeps the server after 15 minutes without incoming
  traffic. Someone standing still and talking sends nothing, so clients send a `ping`
  message every minute.

## Message protocol

Everything is JSON over one websocket. Types live in `packages/shared/src/protocol.ts`.

| client -> server |                                                  |
| ---------------- | ------------------------------------------------ |
| `join`           | name                                             |
| `move`           | position + heading                               |
| `signal`         | WebRTC offer/answer/candidate/bye for one player |
| `ping`           | keepalive, ignored                               |

| server -> client |                                          |
| ---------------- | ---------------------------------------- |
| `welcome`        | you (id + spawn) + everyone already here |
| `player-joined`  | new player                               |
| `player-left`    | id                                       |
| `state`          | positions of players who moved           |
| `signal`         | WebRTC data from another player          |

The server validates every message (`apps/server/src/messages.ts`) and drops anything
malformed.

## Milestones

1. **Setup** - monorepo, CI, basic scene deployed somewhere
2. **Walking** - third person avatar, WASD, camera follows (Q/E to rotate), can't walk
   through buildings or trees
3. **Multiplayer** - see other people move, name tags, smooth interpolation.
   Playwright test with two browsers
4. **Voice** - mic permission, WebRTC between nearby players, distance falloff,
   speaking indicator, mute button
5. **Real campus** - buildings from OpenStreetMap footprints around GSU instead of boxes
6. **Polish** - join screen with avatar picker, mobile controls, chat, minimap
7. **Stretch** - emotes, day/night from real Atlanta time, load test with bots

## Testing

- unit tests for the math and room logic (vitest)
- integration tests that start the real server and connect sockets to it
- e2e with Playwright (`e2e/`): two browser contexts join, one walks, check the other sees
  it. Runs with 1 worker since all tests share the same server. The page exposes
  `window.quad` in dev builds so tests can read positions (it's all a canvas otherwise)
- voice e2e uses Chromium's fake mic, which beeps about once a second. Tests check "did Bob
  hear anything from Alice in the last second" instead of reading the level at one instant,
  since that can keep landing between beeps
- CI runs format, lint, typecheck, tests and build on every push
