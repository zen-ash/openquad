import { fileURLToPath } from 'node:url'
import { SERVER_PORT } from '@quad/shared'
import { startServer } from './server'

const port = Number(process.env.PORT) || SERVER_PORT
// the built site, relative to this file once it's bundled into apps/server/dist
const webDir = process.env.WEB_DIR ?? fileURLToPath(new URL('../../web/dist', import.meta.url))

await startServer(port, { webDir })
console.log(`server listening on :${port}`)
