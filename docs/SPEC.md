# OpenQuad - project plan

## Idea

Zoom calls are a grid of boxes. There's no way to wander over to a group, have a side
conversation, or just bump into someone. OpenQuad puts everyone on a 3D campus instead.
You walk around, and voice chat works by distance - people get louder as you get closer
and fade out as you walk away, like real life.

Demo goal: the whole class joins from their laptops, and I walk my avatar over to the
professor's and start talking.

## How it works

```
 browser (each player)                     server (Node + ws)
 ---------------------                     ------------------
 React Three Fiber scene   <-- positions -->  room state, 20 ticks/sec
 WebRTC audio (p2p)        <-- signaling -->  relays offer/answer/ice
 Web Audio PannerNode                          /health
```

- **Position sync** - clients send their position when they move, server batches
  everything that changed and broadcasts 20 times a second. Clients interpolate between
  updates so other players don't look jittery.
- **Voice** - WebRTC peer to peer. The server is only used for signaling (passing the
  offer/answer/ICE messages between two players), audio never goes through it.
- **Proximity** - each remote voice goes through a Web Audio `PannerNode` placed at that
  player's position, so it gets quieter with distance and comes from the right direction.
- **Only connect to people nearby.** Full mesh with 30 people is 435 connections, which
  won't work. Instead a client only opens a voice connection to players within
  `VOICE_MAX_DISTANCE` (with a little buffer so it doesn't flap on the edge), and closes it
  when they walk away. Plus a hard cap on connections. If this still isn't enough for a
  full class, fallback is an SFU like LiveKit.

## Message protocol

Everything is JSON over one websocket. Types live in `packages/shared/src/protocol.ts`.

| client -> server |                                     |
| ---------------- | ----------------------------------- |
| `join`           | name                                |
| `move`           | position + heading                  |
| `signal`         | WebRTC data for one specific player |

| server -> client |                                 |
| ---------------- | ------------------------------- |
| `welcome`        | your id + everyone already here |
| `player-joined`  | new player                      |
| `player-left`    | id                              |
| `state`          | positions of players who moved  |
| `signal`         | WebRTC data from another player |

The server validates every message (`apps/server/src/messages.ts`) and drops anything
malformed.

## Milestones

1. **Setup** - monorepo, CI, basic scene deployed somewhere
2. **Walking** - third person avatar, WASD, camera follows, can't walk through buildings
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
- e2e with Playwright once multiplayer works (two browser contexts, check A sees B move)
- CI runs format, lint, typecheck, tests and build on every push
