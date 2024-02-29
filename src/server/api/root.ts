import { createTRPCRouter } from '~/server/api/trpc'
import { serviceRouter } from './routers/service'
import { networkRouter } from './routers/network'
import { imageRouter } from './routers/image'
import { swarmRouter } from './routers/swarm'

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
    swarm: swarmRouter,
    service: serviceRouter,
    network: networkRouter,
    image: imageRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter
