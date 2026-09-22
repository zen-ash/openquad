import { SERVER_PORT } from '@quad/shared'
import { startServer } from './server'

const port = Number(process.env.PORT) || SERVER_PORT

await startServer(port)
console.log(`server listening on :${port}`)
