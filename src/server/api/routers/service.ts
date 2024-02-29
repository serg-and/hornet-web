import { z } from 'zod'
import { serviceSchema } from '~/hornet/models'
import { createTRPCRouter, publicProcedure, withLogsProcedure } from '~/server/api/trpc'
import { hornet } from '~/server/hornet'

export const serviceRouter = createTRPCRouter({
    getServices: publicProcedure.query(() => hornet.getServices()),
    getService: publicProcedure.input(z.string()).query(({ input }) => hornet.getService(input)),
    restartService: publicProcedure
        .input(z.object({ name: z.string() }))
        .mutation(({ input }) => hornet.restartService(input.name)),
    restartSwarm: publicProcedure.mutation(() => hornet.restartSwarm()),
    removeService: publicProcedure
        .input(z.object({ name: z.string() }))
        .mutation(({ input }) => hornet.removeServices([input.name])),
    addService: withLogsProcedure
        .input(serviceSchema)
        .mutation(({ input }) => hornet.addService(input, input.logId)),
    serviceLogs: publicProcedure
        .input(z.object({ name: z.string(), logId: z.string() }))
        .mutation(({ input }) => {
            hornet.emitServiceLogs(input.name, input.logId)
        }),
    servicesLogs: publicProcedure.input(z.object({ logId: z.string() })).mutation(({ input }) => {
        hornet.emitServicesLogs(input.logId)
    }),
})
