import { toasts } from '~/components/Toasts'
import { v4 as uuidv4 } from 'uuid'
import { LogData } from '~/server/logEmitterTypes'

export async function tryProcedure<T>(
    action: () => T,
    errorMessage?: string
): Promise<T | undefined> {
    try {
        return await action()
    } catch (err) {
        toasts.store.setToast({
            text:
                (err instanceof Error ? err.message ?? errorMessage : errorMessage) ??
                'An error occured',
            type: 'error',
        })
    }
}

export type WithLogSocketRef = {
    close?: () => void
}

export async function withLogSocket<T extends (input: any) => Promise<R>, R>(
    mutation: T,
    input: Parameters<T>[0],
    config: {
        onOpen?: (event: Event) => void
        onClose?: (event: CloseEvent) => void
        onError?: (event: Event) => void
        onData?: (data: LogData) => void
        keepOpen?: boolean
        ref?: WithLogSocketRef
    }
): Promise<R | undefined> {
    const logId = uuidv4()
    const socket = new WebSocket(`ws://0.0.0.0:3003/subscribe-logs/${logId}`)

    // if (config.onClose) socket.onclose = config.onClose
    socket.onclose = event => {
        console.log('socket closing', event.code)
        if (config.onClose) config.onClose(event)
    }
    if (config.onError) socket.onerror = config.onError
    if (config.onData) {
        socket.onmessage = event =>
            event.data !== 'tick' &&
            config.onData &&
            config.onData(JSON.parse(event.data) as LogData)
    }

    enum OpenRes {
        OPENED = 0,
        TIMEOUT = 1,
        CANCELLED = 2,
    }

    // wait for socket to open before performing mutation
    const opened = await new Promise<OpenRes>(resolve => {
        // cancel when opening socket takes longer than 15 seconds
        const timeout = setTimeout(() => {
            socket.close()
            resolve(OpenRes.TIMEOUT)
        }, 15000)

        socket.onopen = ev => {
            clearTimeout(timeout)
            resolve(OpenRes.OPENED)
            if (config.onOpen) config.onOpen(ev)
        }

        if (config.ref)
            config.ref.close = () => {
                clearTimeout(timeout)
                console.log('ref close called')
                socket.close()
                resolve(OpenRes.CANCELLED)
            }
    })
    if (opened === OpenRes.CANCELLED) return
    if (opened === OpenRes.TIMEOUT)
        throw new Error('Opening WebSocket connection timed out (15 sec)')

    return await new Promise<R>(async (resolve, reject) => {
        let error: Error | undefined

        try {
            resolve(await mutation({ ...input, logId }))
        } catch (err) {
            error = err as Error
        } finally {
            if (!config.keepOpen) socket.close()
        }

        if (error) reject(error)
    })
}
