import { type ServerWebSocket } from 'bun'
import { LogEvent, type LogEmitter } from './logEmitterTypes'

export const startWsServer = (logEmitter: LogEmitter, port = 3003) => {
    type Listener = Parameters<typeof logEmitter.on>[1]
    type SocketData = { id: string; listener?: Listener }
    type ServerSocket = ServerWebSocket<SocketData>

    return Bun.serve({
        fetch(req, server) {
            const id = req.url.split('/subscribe-logs/').at(-1)?.split('/')[0]
            if (!id) return new Response('Not found', { status: 404 })

            // upgrade the request to a WebSocket
            if (server.upgrade<SocketData>(req, { data: { id } })) return

            return new Response('Upgrade failed :(', { status: 500 })
        },
        websocket: {
            open(ws: ServerSocket) {
                const listener: Listener = val => {
                    if (val.event === LogEvent.DATA)
                        ws.send(JSON.stringify({ type: val.type, data: val.data }))
                }

                logEmitter.on(ws.data.id, listener)
                ws.data.listener = listener

                // const timer = setInterval(() => ws.send('tick'), 500)
                // setTimeout(() => {
                //     clearInterval(timer)
                //     ws.close()
                // }, 5050)
            },
            message(ws, message) {
                // console.log('WS: message: ', message)
            },
            close(ws, code, reason) {
                // console.log(`WS-Server: close socket for logId "${ws.data.id}"`)
                if (ws.data.listener) logEmitter.removeListener(ws.data.id, ws.data.listener)
            },
        },
        port,
    })
}
