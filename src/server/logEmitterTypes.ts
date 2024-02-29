import type EventEmitter from 'events'

export enum LogEvent {
    CLOSE = 0,
    OPEN = 1,
    DATA = 2,
}

export type LogData = { type: 'data' | 'error'; data: string }

export type LogEventData = { event: LogEvent } & (
    | { event: LogEvent.CLOSE }
    | { event: LogEvent.OPEN }
    | ({ event: LogEvent.DATA } & LogData)
)

export interface LogEmitter extends EventEmitter {
    emit: (logId: string, logEventData: LogEventData) => boolean
    on: (logId: string, listener: (logEventData: LogEventData) => void) => this
}
