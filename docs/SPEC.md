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
  ground), SMAA, a light vignette, ACES tone mapping (was AgX, see part 11).
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
- **Places menu** (G) - directions or teleport. Teleport lands you in front of the
  building's door (a couple of meters of random spread so a group doesn't stack up).
  Other players' interpolation treats any jump over 10m as a teleport instead of sliding
  them across the map.

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

## Part 9 - making it feel real

I didn't want it to turn into a game, just to make walking around campus feel more like
being there.

- **HUD** - where you are (building, park or street, worked out from your position in
  `game/location.ts`), how many people are online and how many can hear you, a compass,
  the time in Atlanta and a round minimap. H shows the controls.
- **Location titles** - the name of a new place fades in at the bottom of the screen once
  you've been there for a moment, so walking past a row of buildings doesn't spam it.
- **Cinematic camera** - drag to orbit, scroll to zoom. The point the camera looks at
  glides after you and the camera glides after that, which is what makes it feel filmed
  instead of glued to you. It pulls back a bit when you run. Indoors it comes lower and
  closer so it stays under the ceiling, and moves in front of bookshelves instead of
  filming the back of one. P hides the interface for screenshots.
- **GPS** - Directions in the places menu draws the route on the ground and on the
  minimap. The walking graph is OSM sidewalks, footpaths and crosswalks. Roads are in it
  too but cost 2.5x, so it only uses them where there's no sidewalk. Long segments get a
  node every 5m, ends closer than 3m get joined, and only the biggest connected piece is
  kept (OSM has little islands of path that don't connect to anything). A* with a binary
  heap over ~14k nodes takes about 3ms. It reroutes if you get 10m off the route. There's
  a test that routes from Hurt Park to every GSU door without going through a building.
- **Going inside** - all 55 GSU buildings have a ground floor built from their real
  outline. The map script puts a door on the side facing the nearest sidewalk, at least
  2.4m from a corner so the sliding doors have room. The walls are line segments with a
  gap at the door, so you just walk in. Windows are cut out of the inside walls with the
  same grid the outside uses, so the street you see through them lines up. The glass doors
  slide open for anyone within 3m.
- **Furniture** - generated per building, the same every time. The floor is split into 5m
  squares lined up with the front wall: study tables and chairs, armchairs around coffee
  tables, plants, and rows of bookshelves in the libraries. The column straight in from the
  door stays empty as a walkway and parking decks stay empty. Only the building you're in
  (or at the door of) is drawn. Each shelf of books is one box, and a shader splits it
  into books of random colors and heights. Library North has hundreds of shelves, so a box
  per book was way too many.
- **Light indoors** - the ceiling casts the shadow that keeps the sun out, except through
  the windows. Inside, the sky light turns into warm ceiling light and the sky reflections
  get turned down. That took a while: three.js ignores a material's `envMapIntensity`
  when it uses `scene.environment`, so turning it down per material did nothing and every
  room looked foggy.
- **Walls muffle voices** - if you're in different places (different buildings, or one
  in and one out) the other person goes through a 500Hz lowpass at half volume. Both
  standing at the open door counts as the same place.
- **Low quality** also turns off the blur behind the HUD panels. On CI (no gpu) it cost
  about a third of the framerate and made the movement test flaky.

## Part 10 - real buildings, starting with Library North

Every building so far is its OpenStreetMap footprint pulled up to a height, with windows
drawn by a shader. That looks like a city, not like GSU. So I'm redoing the important ones
by hand from photos, one at a time. Library North is the first.

- **Footprint** - OSM's outline was from before the 2022 renovation (it still had the old
  plaza stairs). The build script replaces it: the brick box (OSM's own corner nodes, about
  53m square) plus the new curved glass lobby on the northeast side, facing the greenway.
  OSM has no height for it, so it got the 14m default. It's 26m going by the photos.
- **Door** - moved to the real entrance, under the canopy in the lobby.
- **Look** (`campus/libraryNorth.ts`) - brown brick with almost no windows, a stone band
  around the top, the white wavy panel (a shader, it's just shading), a row of small windows
  above it that light up at night, dark window slots, and the lobby: glass with frames,
  a terrace with tables and a planted bit on its roof, the limestone block, the canopy and
  the sign. Roof has the penthouse, the round patch and AC units. It's left out of the
  regular buildings mesh.
- **Inside** - the brick walls have no windows (the real ones don't), the lobby is all glass.
- **References** - the builder's project photos (Macallan Construction), a Wikimedia
  Commons photo, and satellite imagery to check the footprint. None of them are in the repo.
- **Panther Quad** - GSU tore down Sparks Hall at the end of 2025 and closed Gilmer Street
  between Peachtree Center and Courtland, so Hurt Park, the Sparks Hall site and the greenway
  are one quad now. OSM doesn't have it yet. The build script drops that bit of Gilmer, turns
  it into lawn with a row of trees, and lays out the quad by eye from GSU's campus map: tan
  pavers, lawns, the triangle planter (solid, you can't walk through it), the monument and
  the flags. It's a named GSU place, so the location title says Panther Quad even right
  next to Arts & Humanities. I only use GSU's map as a reference, none of its data is in the repo.
- **Only the downtown campus** - GSU's campus map shows which buildings are part of the
  downtown campus. The map now reaches far enough north for Piedmont North (660m north of
  Hurt Park, 480m south, 540m either side). Only buildings on GSU's map count as GSU (you can
  go into those), with the names GSU uses (25 Park Place, not the Trust Company of Georgia
  Building). Georgia Hall and Piedmont Hall were tagged GSU on OSM but aren't on GSU's map.
- **Research Tower** - opened in September 2026, too new for OSM. Traced from satellite
  images, 9 floors.
- **Heights** - OSM has no height for a lot of GSU buildings, so they all came out 14m. For
  the ones it had, Overture Maps has real heights (USGS lidar, or Microsoft's estimates from
  aerial photos). Langdale Hall went from 14m to 29m.
- Gotcha: three.js caches a material's shader by its `onBeforeCompile` source. All the
  library's materials share one wrapper function, so without a `customProgramCacheKey` each
  they could end up sharing a shader.

## Part 11 - more of the real campus

Library North on its own didn't make the rest look like GSU, so this part redoes the things
you see first: everything around Hurt Park and the quad.

- **Dahlberg Hall** (`campus/dahlberg.ts`) - the old Municipal Auditorium, next to spawn. The
  white marble front is from 1943: a corner block with three huge windows on each side,
  pairs of ribs down the piers between them and a row of little windows above, then the
  entrance with the dark canopy and three tall strips of windows, then a lower wing along
  Courtland. 18m at the corner, 14m past the entrance, going by photos. OSM's outline was
  already right. The door is moved to the real entrance.
- **Arts & Humanities** (`campus/artsHumanities.ts`) - big white marble boxes with hardly any
  windows, three long bands of them on Peachtree Center, and the glass entrance to the
  Kopleff Recital Hall with the blue glass canopy at the Gilmer corner. The side on the
  greenway is grey panels. GSU is putting a new front on it in 2027, this is it before that.
- **Research Tower** (`campus/researchTower.ts`) - opened Sept 22 2026. Dark grey panels,
  thin slots of windows, a wide band of blue glass slanting up the side toward Decatur St, a
  light metal screen around the top, ribbed metal by the doors. From GSU's and Urbanize
  Atlanta's photos of the opening.
- **Shared code for hand-built buildings** (`campus/landmark.ts`, `landmarks.ts`) - walls with
  real holes in them for windows (the glass is set back and has mullions drawn by a shader,
  the sides of the hole are real faces), and the inside of the ground floor walls comes
  from the same holes, so from inside you see out of the real windows. The white marble is
  a shader too (slabs, clouds, faint veins), Poly Haven doesn't have one like it. A shared
  test checks every hand-built building: triangles face out, and the inside walls go all
  the way round except for the doorway (that one caught a doorway in the wrong wall).
- **Hurt Park's fountain** (`campus/fountain.ts`) - at OSM's fountain node. Raised marble basin
  with eight stepped blocks round the rim and the jet rings, a pool painted pale blue, a ring
  of cannas and flowers, and the curved memorial wall to Joel Hurt with its inscription. It
  hasn't run in years, so there's just some water sitting in the basin. Paved all round.
- **Trees** - the blobs are gone. Three kinds made with EZ-Tree (willow oak, magnolia, a
  younger street tree), about 3-7k triangles each, bark from Poly Haven and leaves I drew as
  SVG (a twig with leaves on it, rendered into a texture). The canopy normals point out from
  the middle of the tree, so the light falls on it like one soft shape instead of on every
  card. Instanced, one draw call per kind and part. They sway a little. Past 80m from the
  camera they switch to a ~1.3k triangle version with no shadow. All full detail was 1.4M
  triangles, fine on a real GPU but the full-city e2e tests timed out on CI's cpu rendering.
- **Benches, bins, lamp posts, street lights** (`game/streetFurniture.ts`) - OSM doesn't map
  them, so they go every so often along the park paths (off to the side, facing the path)
  and both sides of the bigger roads. You bump into benches. The lamps come on at night
  with a pool of light on the ground.
- **Real facades for more GSU buildings** (`campus/facades.ts`) - the window shader used to
  have one grid for everything. Now each building has its own wall color, window size and
  spacing and frame color: buff brick and big windows on Aderhold, strips of windows on the
  Science Annex, red brick with white frames on Haas-Howell, and so on, from photos. The
  rest get random but plausible ones. Parking decks (38 of them, tagged on OSM) get open
  floors behind a concrete wall instead of windows.
- **Heights** - Aderhold, 58 Edgewood, the Science Annex and both Student Centers had the 14m
  default, now from Overture's lidar or floors counted in photos.
- **Ground** - downtown is paved, not a lawn. The ground is concrete now, with OSM's grass,
  gardens and pitches on top, and surface parking lots in asphalt. With more different
  layers the ground started flickering from far away (the join screen), they're only a few
  cm apart. Each layer gets a polygon offset now and the camera's near plane went from 0.1
  to 0.3, which gives the depth buffer three times the precision.
- **Light** - less light from the sky and more from the sun, and ACES tone mapping. Before,
  shade was nearly as bright as sun and everything looked hazy and flat.
- **Camera** - it used to back into the building behind you and show its insides. Now it
  stops just short of the wall, unless it's up over the roof (then there's nothing to hide
  behind) or that would put it in your face (then the see-through cutout does it).
  `cameraReach` in `game/occlusion.ts`, tested. The insides of buildings get the cutout too.
- **Dev tools** - `window.quad.lookFrom([x, y, z], [x, y, z])` puts the camera anywhere, for
  lining up a screenshot with a photo.
- References (none in the repo): Wikimedia Commons photos of Dahlberg, Hurt Park, the Student
  Center and more, GSU's news and event pages, Urbanize Atlanta's July and September 2026
  articles, Esri's August 2026 satellite images.

## Part 12 - Google's 3D tiles

Hand-building every building would take forever, so the rest of downtown now comes from
Google's Photorealistic 3D Tiles (the 3D city from Google Earth), streamed while you play
with NASA-AMMOS' `3d-tiles-renderer`. Our own buildings are still there for walls, directions
and insides, they're just not drawn. `scene/Tiles.tsx`.

- **Lining up** - `ReorientationPlugin` puts Hurt Park at (0, 0, 0), turned so x is east and z
  south like campus.json. campus.json uses a flat meters-per-degree approximation that comes
  out ~2m short at the north edge, so the tiles get squeezed by the same amount
  (`campus/tilesFrame.ts`, tested against the real ellipsoid). Checked by drawing every OSM
  footprint on top from above (`?outlines`): they sit on the tile buildings, under 1m off
  anywhere on the map.
- **Flattening** - the game is flat, downtown isn't: Peachtree Center is ~7m above Hurt Park
  and the east side of campus ~5m below. Every tile is flattened as it loads: each point goes
  down by the real ground height there, from a USGS lidar grid (`pnpm terrain`,
  `campus/terrain.json`, 20m apart). Google's heights go by the global EGM2008 geoid, not the
  US one USGS comes with. That's a meter, and with the wrong one every tile street was a
  meter under ours.
- **Only the buildings** - up close the tiles' trees, cars and hedges are dark blobs, and they
  were on top of our grass and trees. On the map the tiles only draw on OSM footprints (plus
  2m), minus the hand-built buildings so there's no second copy of them
  (`campus/tileMask.ts`, a 1px-per-meter mask the tile shader checks). Past the edge of the
  map they draw everything and our ground stops, so you see real downtown out to the Capitol.
- **Detail** - error target 6px, less far away (`errorFalloff`), 300mb of tiles max. About 1ms
  a frame on an M4.
- **Rules** (Google's terms) - their credits on screen, nothing saved (no tile data in the
  repo or on disk, it only streams), and nothing we build may be traced or measured from the
  tiles. The key is in the built js (it has to be, the browser calls Google), so it's locked
  to our domains in Google Cloud.
- Dev: the Layers box (top right in dev, or `?debug`) turns the tiles, our box buildings, the
  tiles' trees/ground and the outlines on and off. `?notiles` turns the tiles off.

## Part 13 - a fence round the middle of campus

The whole map was walkable, but most of it is Google's tiles now and only the middle is
really built. So there's a fence round the main downtown campus: Hurt Park, the library,
Langdale, Classroom South, the Student Centers, the Sports Arena and the Research Tower.
The housing across Piedmont Ave, the Woodruff Park buildings and the Park Place block are
outside it for now.

- **Where** - `packages/shared/src/fence.ts`, 20 corners in campus.json coordinates, along
  the far curb of Edgewood, Piedmont, Gilmer, Jesse Hill, Wall, Pryor and Decatur, so the
  streets round the edge are ours too. Edgewood bends and widens at the corners, so it has
  a few extra points. It's meant to be edited by hand. Picked by looking at GSU's campus map, but the corners are
  OSM street crossings (and a gap between two parking decks), nothing traced off the map.
  Tests check no building is half in and half out.
- **Walking** - the fence is just walls in the collision world, so you slide along it like
  any other wall, no bounce. Directions only use paths at least 1.5m inside it (tested
  from four corners of campus to every door). The places menu only has spots inside.
- **Server** - moves past the fence are ignored, and a reconnect from out there puts you
  back at spawn. So a modified client can walk off, but nobody else sees it.
- **Looks** - inside it's our buildings and hand-built landmarks only, the tiles throw
  away everything there. Past it is the far sidewalk: our ground fades out over 5m there and
  theirs shows through, and their trees, cars and poles are thrown away too (their
  buildings are kept, OSM footprints say where), so their clutter starts past the sidewalk.
  Our trees and lamps go out to there as well.
  Near the fence there's a bit of haze and a faint line on the ground, only when you're
  close. The distance to the fence for the shaders is baked into a small texture once,
  working it out per pixel cost a millisecond.
- The see-through ground at the fence is slower on macs (the gpu can't skip ground hidden
  behind buildings), so it's only see-through with the tiles on. Without tiles it's the
  whole map like before, just with the fence.
- Checked GSU's map against campus.json: six pieces of GSU buildings with no name on OSM
  were 3d on the map but not tagged, `GSU_PARTS` in build-campus.mjs tags them by way id.
- **The library link** over Decatur St was a 14m block across the street. OSM only has
  `level=1` and `layer=1` for it, so it now starts a floor up (3.5m, Library South's floors)
  and is a floor tall. A photo taken from it looking down Decatur St puts the floor at about
  3.3-4.4m, which fits. You walk under it, and Decatur St isn't cut in two under it anymore
  (build-campus used to cut roads wherever there was a building). `min_height` or
  `building:min_level` would win if OSM had them.
- **"GSU Daycare"** in Dahlberg's courtyard was a 14m round tower. It's a paved yard with a
  low wall on the satellite images, the daycare (Suttles Child Development Center) is inside
  Dahlberg Hall. Taken out (`NOT_BUILDINGS`).
- **Tiles inside the fence aren't downloaded** (`SkipInsidePlugin`, tiles whose bounding box
  is all inside). For one view with no memory limit that's 16% fewer requests, 10% less
  downloaded and 12% less memory. But a whole view would take over 1GB, the cache is always
  full at its 300MB, so in practice memory is the same and the room goes into sharper tiles
  further out. It can't go much lower: at 200MB a busy view got stuck on one blurry tile.

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
8. **Real life** - HUD, location titles, GPS directions, cinematic camera, going inside
   buildings
9. **Real buildings** - Library North rebuilt from photos, more to come
10. **More of the real campus** - Dahlberg, Arts & Humanities, Research Tower, the fountain,
    real trees, benches and lights, per-building facades
11. **Google's 3D tiles** - the real buildings of downtown, lined up with our map
12. **The fence** - a playable area round the middle of campus, ours inside, tiles outside

## Testing

- unit tests for the math and room logic (vitest)
- integration tests that start the real server and connect sockets to it
- e2e with Playwright (`e2e/`): two browser contexts join, one walks, check the other sees
  it. Runs with 1 worker since all tests share the same server. The page exposes
  `window.quad` in dev builds so tests can read positions (it's all a canvas otherwise)
- e2e pages load with `?quality=low&nocity`: the city isn't drawn (ci has no gpu and drawing it on
  the cpu made every test time out), but the map is still loaded for collisions. A separate
  test (`e2e/city.spec.ts`) loads the full city and fails on any page or shader error. It
  also walks into Library North, since the furniture and the inside only load near a door
- `e2e/fence.spec.ts` runs a player into the fence and checks they stop there, never go
  back, and the other player sees them inside
- `e2e/tiles.spec.ts` loads Google's tiles for real and fails on any error, and checks the
  tile streets are just under ours at Hurt Park and up the hill to the west. Skipped
  without a key (ci)
- walking takes small steps on long frames (`walk()` in movement.ts) instead of capping the
  frame time, otherwise slow laptops (and ci) walk in slow motion
- to reproduce ci locally: run the e2e tests in the `mcr.microsoft.com/playwright` docker image
  with `--cpus=2`
- voice e2e uses Chromium's fake mic, which beeps about once a second. Tests check "did Bob
  hear anything from Alice in the last second" instead of reading the level at one instant,
  since that can keep landing between beeps
- CI runs format, lint, typecheck, tests and build on every push
