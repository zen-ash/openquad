# Load test

How many people can one server handle? `apps/server/scripts/bots.ts` connects a bunch of
fake players that act like real ones: join with a random avatar, wander around sending their
position 20 times a second, and every tenth one sends a chat message every 2 seconds (with the
time in it, to measure the round trip).

```sh
pnpm --filter @quad/server build
PORT=2600 node apps/server/dist/index.js
pnpm bots --count 100 --seconds 15 --spread 60 --url ws://localhost:2600/ws
```

`--spread` is how far from Hurt Park the bots wander. Small = everyone crowded together (a
class demo), big = spread over campus. The server's own numbers come from `/stats`.

## Results

Production build of the server, bots on the same laptop (M4). Numbers are for the middle of
the test, with everyone connected.

### Before

Same bots against the previous server build (it didn't have `/stats` yet, so these are the
bots' own numbers; total is just players x per player).

| players | spread | download per player | total the server sends |
| ------- | ------ | ------------------- | ---------------------- |
| 30      | 30m    | 81 KB/s             | ~2.4 MB/s              |
| 100     | 60m    | 269 KB/s            | ~26 MB/s               |
| 200     | 400m   | 538 KB/s            | ~105 MB/s              |

CPU wasn't the issue (an earlier run with the stats endpoint had ticks well under the 50ms
budget). The problem was bandwidth: everyone got everyone else's position
20 times a second, as `{"id":"<36 char uuid>","position":{"x":12.3456789,...},...}`. At 200
people that's over 4 Mbit/s per student, more than school wifi gives each person, and way
more than a free hosting plan can send.

### Fixes

1. **Compact updates** - `[id, x, z, heading]` rounded to centimeters instead of an object
   with 15 decimal places.
2. **Short ids** - `a3` instead of a uuid (the uuid alone was a third of every update).
3. **Area of interest** - you only get updates about people within 200m. They're specks past
   that and the minimap only shows ~130m. When someone leaves your range the server says so
   (`out-of-view`) so they don't stay frozen on your screen, and when they come back you get
   their position straight away.

### After

| players | spread | download per player | server upload | tick   | chat round trip p99 |
| ------- | ------ | ------------------- | ------------- | ------ | ------------------- |
| 30      | 30m    | **14 KB/s** (5.8x)  | 0.4 MB/s      | 2.5 ms | 2 ms                |
| 100     | 60m    | **47 KB/s** (5.7x)  | 4.7 MB/s      | 9.5 ms | 12 ms               |
| 200     | 400m   | **17 KB/s** (32x)   | 3.6 MB/s      | 9.2 ms | 13 ms               |

Everyone still gets 20 updates a second (p99 gap between updates 53-59ms). With people spread
out, the area of interest does most of the work. With everyone crowded into one spot it can't
help (everyone really is in view), so there it's the smaller updates.

Voice isn't part of this, it's peer to peer and never goes through the server.
