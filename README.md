# OpenQuad

A multiplayer 3D campus in the browser with proximity voice chat. Walk up to someone and you can hear them, walk away and they fade out.

It's the real Georgia State campus, built from OpenStreetMap. You can walk into any of the 56
GSU buildings, get walking directions to one, and people inside sound muffled from the street.
Library North, Dahlberg Hall, Arts & Humanities, the new Research Tower and Hurt Park's
fountain are rebuilt by hand from photos of the real ones. You can walk anywhere in the
middle of campus (the fence is in `packages/shared/src/fence.ts`, the server checks it
too), and past that the rest of downtown is Google's Photorealistic 3D Tiles, lined up
with the map.

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

For the real buildings, get a Google Maps Platform key with the Map Tiles API turned on,
copy `apps/web/.env.example` to `apps/web/.env` and put it there. Without one it draws its
own box buildings instead.

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
pnpm bots        # load test with fake players, see docs/LOAD_TEST.md
pnpm terrain     # ground heights for flattening google's tiles (usgs lidar)
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
3. It also asks for `VITE_GOOGLE_MAPS_API_KEY`. That one gets built into the page, so anyone
   can read it: in Google Cloud, restrict it to the Map Tiles API and your site's address.
4. Deploy. After that it redeploys on its own whenever CI passes on `main`.

The free tier sleeps after 15 minutes with nobody on it and takes about a minute to wake
up, so open it a couple of minutes before showing it to anyone.

To try the production build locally:

```sh
docker build --build-arg VITE_GOOGLE_MAPS_API_KEY=your-key -t openquad .
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
scripts/     build-campus.mjs pulls the campus from OpenStreetMap, build-terrain.mjs the
             ground heights from USGS
```

See [docs/SPEC.md](docs/SPEC.md) for the plan.

## Controls

- WASD / arrow keys to walk
- Shift to run
- Drag with the mouse (or Q / E) to turn the camera, scroll to zoom
- G for places: walking directions to a building, or teleport there
- Walk through a building's front door to go in
- M to mute / unmute
- Enter to chat
- 1-5 for emotes (wave, clap, cheer, laugh, shrug)
- P for photo mode (hides everything on screen)
- H to see all of these in the game
- Time of day in the top right: follows the real time in Atlanta, or pick morning, noon,
  sunset or night. `?time=night` in the url works too
- On a phone or tablet: joystick in the bottom left, drag anywhere else to turn

## Credits

- Map data (c) [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, available under the Open Database License. `apps/web/src/campus/campus.json` is built from it with `pnpm campus`
- 3D buildings from Google's [Photorealistic 3D Tiles](https://developers.google.com/maps/documentation/tile/3d-tiles), streamed live and never stored. Their credits are shown in the game. Drawn with [3DTilesRendererJS](https://github.com/NASA-AMMOS/3DTilesRendererJS) (Apache 2.0)
- Ground heights from the USGS [3D Elevation Program](https://www.usgs.gov/3d-elevation-program) (public domain), `apps/web/src/campus/terrain.json` is built from it with `pnpm terrain`
- Textures, furniture and tree bark from [Poly Haven](https://polyhaven.com) (CC0)
- Trees made with [EZ-Tree](https://github.com/dgreenheck/ez-tree) by Daniel Greenheck (MIT), the leaves are drawn by me
- Heights for some GSU buildings from [Overture Maps](https://overturemaps.org) (USGS lidar and Microsoft building footprints, ODbL)
- People from Microsoft's [Rocketbox Avatar Library](https://github.com/microsoft/Microsoft-Rocketbox) (MIT, license in `apps/web/public/models/people/LICENSE.txt`)
