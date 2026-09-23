# OpenQuad - project plan

## Idea

Zoom calls are a grid of boxes. There's no way to wander over to a group, have a side
conversation, or just bump into someone. OpenQuad puts everyone on a 3D campus instead.
You walk around, and voice chat works by distance - people get louder as you get closer
and fade out as you walk away, like real life.

Demo goal: the whole class joins from their laptops, and I walk my avatar over to the
professor's and start talking.

## Look and feel

Realistic downtown Atlanta, as close as a browser on a school laptop can do.
(First version was pokemon-style toon shading. Didn't like it next to real buildings.)

- **Buildings** - windows aren't modeled, a shader draws them from the world position: a
  row every floor (3.5m), a column every meter and a half, bigger shop windows on the ground
  floor, frames, a shadow under the top of each window (they sit back in the wall) and a sill
  under it. Anything taller than ~14 floors becomes a glass tower. Walls are brick or
  concrete photo textures with normal maps, roofs are gravel. (`apps/web/src/campus/facade.ts`)
- **Glass** is shiny and metallic so it reflects the sky. The sky is drei's physical `<Sky>`,
  rendered once into a cube map with `<Environment>` for the reflections and ambient light.
- **Ground** - asphalt with lane lines drawn in the shader (dashed yellow down the middle,
  white near the edges, only on wider roads), concrete sidewalks, grass.
- **Effects** - ambient occlusion (N8AO, soft shadows in corners and where walls meet the
  ground), SMAA, a light vignette, AgX tone mapping.
- **Quality** - drei's `PerformanceMonitor` drops to low quality if the framerate stays bad:
  no shadows, no effects, 1x resolution. `?quality=low` forces it (the e2e tests use this).
- Textures are CC0 from Poly Haven, shrunk to 512px webp (700kb for all of them instead of
  ~12mb).
- **People** - Microsoft's Rocketbox avatars (MIT): realistic, textured, and all on the same
  80 bone skeleton, so one animation file per body type (idle/walk/run/wave, from Rocketbox's
  own mocap) works for every avatar. Converted from FBX with FBX2glTF, textures attached and
  shrunk to webp with gltf-transform, ~500kb per avatar. Each one is scaled to 1.8m when it
  loads. Everyone gets an avatar picked from their id for now.
- **Scale** - 1 unit = 1 meter. The map started out at half size so walking across was
  faster, but with realistic people that made everyone as tall as a floor of a building.
  Walking is 1.6 m/s and running 4.2 m/s, close to the mocap speeds.
- **Animations** - Rocketbox's "in place" walk and run still move the hips forward about
  1.5m per loop and then snap back, which looked like a moonwalk glitch on top of our own
  movement. The build step flattens that out (keeps the up/down bob) and measures how fast
  the actor was going, so walk/run play at `our speed / mocap speed` and feet don't slide.
  The four clips also have to share one skeleton in the file: three renames duplicate bone
  names, and then walk/run silently didn't play at all. `avatars.test.ts` checks both files.

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

## The campus

The real GSU campus from OpenStreetMap: 242 buildings (55 of them GSU's), streets,
footpaths and parks, in a 1km square around Hurt Park.

- `scripts/build-campus.mjs` downloads it once from the Overpass API and writes
  `apps/web/src/campus/campus.json` (~40kb gzipped). The game never calls a map service.
- Real size (1 unit = 1 meter). Hurt Park is (0, 0) and where everyone spawns. North is -z.
- Heights come from the `height` tag, else `building:levels` x 3.5m, else 14m (only about a
  third of buildings have either tag).
- OSM has almost no trees mapped, so the script plants them in parks on a jittered grid,
  staying off paths. Same result every run.
- GSU buildings get name labels (only shown within 70m).
- **Rendering** - all buildings are merged into one mesh (1 draw call instead of 242), with
  per-vertex style/height/seed for the facade shader. roads/paths/parks the same, trees are
  two instanced meshes.
- **Collision** - buildings are polygons now, not boxes. Circle vs polygon: find the closest
  point on the outline, push out from there (or through it if you ended up inside).
  Bounding boxes skip most buildings. Two passes, since being pushed out of one building
  can push you into the next one on packed blocks.
- **See-through buildings** - downtown buildings are tall enough to hide you from the
  camera. Instead of pulling the camera in (tried it, you end up with your face filling
  the screen), buildings get a hole cut in them anywhere between the camera and the player,
  like a lot of top down games do. It's a few lines added to the building shader with `onBeforeCompile`:
  discard pixels near the camera -> player line, with a dithered edge.
- **Sun follows you** - the shadow map can't cover the whole map, so the light and its
  shadow area move with the player.
- **Go to menu** - teleport spots are found by searching outward from each building's
  middle for open ground. Other players' interpolation treats any jump over 10m as a
  teleport instead of sliding them across the map.

## Polish (part 7)

- **Avatar picker** - pick one of the six people on the join screen, everyone sees it
  (`avatar` in `join` and `PlayerInfo`, server falls back to the default for unknown ids).
  The picker is real radio buttons and join reads the choice from the form, not React
  state. While the city loads the page is busy and React can be a second behind, so
  "pick then click join" used to join as the default avatar. There's a test for exactly that.
- **Chat** - Enter to type, Enter to send, Esc to cancel. Shows in a log and as a bubble over
  the person's head for 6 seconds. 200 characters max, and the server drops anything past
  5 messages in 5 seconds per person. Movement keys are ignored while typing.
- **Minimap** - the campus is drawn once to an offscreen canvas at 1px per meter, then the
  minimap shows 260m around you, rotated so up is the way W walks. Others are dots.
- **Touch** - on touch screens: joystick bottom left (push it all the way to run), drag
  anywhere else to turn the camera.
- **Reconnect** - if the connection drops while you're in, the game stays on screen with a
  "Reconnecting..." banner and tries again after 0.5s, 1s, 2s, 4s, then every 8s. It rejoins
  with the same name and avatar at the spot you were standing (`position` in `join`).

## Part 8

- **Emotes** - 1-5 or the buttons: wave, clap, cheer, laugh, shrug. Rocketbox mocap, trimmed
  to a few seconds each (some of the recordings were 25s long). Server sends them to everyone
  including you, so you only emote if it got through, and ignores more than one per 1.5s.
  Walking cancels an emote.
- **Voice range** - a "!" pops over someone when they come close enough to hear you, and name
  tags are faded for people who are too far away.
- **Day and night** - the sun is where it really is over GSU right now (standard solar
  position math, tested against the equinox, sunrise times and summer vs winter). At night the
  sun turns into dim blue moonlight, stars come out and some of the windows light up (plus a
  bit of bloom on high quality). There's a picker to force morning/noon/sunset/night for
  showing it off in a daytime class.
- **Load test** - see [LOAD_TEST.md](LOAD_TEST.md). It found that bandwidth, not CPU, was the
  limit, which led to compact position updates, short ids and only sending updates about
  people within 200m. 200 players spread over campus went from 538 KB/s to 17 KB/s each.

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
| `join`           | name, avatar, position (only when reconnecting)  |
| `move`           | position + heading                               |
| `signal`         | WebRTC offer/answer/candidate/bye for one player |
| `ping`           | keepalive, ignored                               |
| `chat`           | text (server rate limits it)                     |
| `emote`          | name (one of 5, rate limited)                    |

| server -> client |                                                |
| ---------------- | ---------------------------------------------- |
| `welcome`        | you (id + spawn) + everyone already here       |
| `player-joined`  | new player                                     |
| `player-left`    | id                                             |
| `state`          | [id, x, z, heading] of nearby people who moved |
| `out-of-view`    | ids that went past 200m, stop drawing them     |
| `signal`         | WebRTC data from another player                |
| `chat`           | from, name, text                               |
| `emote`          | from, name                                     |

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
5. **Real campus** - buildings from OpenStreetMap footprints around GSU instead of boxes,
   see-through buildings, go-to menu
6. **Polish** - join screen with avatar picker, mobile controls, chat, minimap
7. **Stretch** - emotes, day/night from real Atlanta time, load test with bots

## Testing

- unit tests for the math and room logic (vitest)
- integration tests that start the real server and connect sockets to it
- e2e with Playwright (`e2e/`): two browser contexts join, one walks, check the other sees
  it. Runs with 1 worker since all tests share the same server. The page exposes
  `window.quad` in dev builds so tests can read positions (it's all a canvas otherwise)
- e2e pages load with `?quality=low&nocity`: the city isn't drawn (ci has no gpu and drawing it on
  the cpu made every test time out), but the map is still loaded for collisions. A separate
  test (`e2e/city.spec.ts`) loads the full city and fails on any page or shader error
- walking takes small steps on long frames (`walk()` in movement.ts) instead of capping the
  frame time, otherwise slow laptops (and ci) walk in slow motion
- to reproduce ci locally: run the e2e tests in the `mcr.microsoft.com/playwright` docker image
  with `--cpus=2`
- voice e2e uses Chromium's fake mic, which beeps about once a second. Tests check "did Bob
  hear anything from Alice in the last second" instead of reading the level at one instant,
  since that can keep landing between beeps
- CI runs format, lint, typecheck, tests and build on every push
