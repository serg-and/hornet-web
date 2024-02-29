import EventEmitter from 'events'
import { Hornet } from '~/hornet'
import { LogEmitter } from './logEmitterTypes'
import { Server } from 'bun'
import { startWsServer } from './wsServer'

const globalObj = globalThis as unknown as {
    logEmitter: LogEmitter | undefined
    hornet: Hornet | undefined
    wsServer: Server | undefined
}

export const logEmitter = globalObj.logEmitter ?? (new EventEmitter() as LogEmitter)

export const hornet =
    globalObj.hornet ??
    new Hornet(
        {
            initSwarm: true,
            discoverDockerRuntime: false,
            logCommands: true,
        },
        logEmitter
    )

export const wsServer = globalObj.wsServer ?? startWsServer(logEmitter)

globalObj.hornet = hornet
globalObj.logEmitter = logEmitter
globalObj.wsServer = wsServer
