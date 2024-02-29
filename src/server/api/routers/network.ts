import { z } from 'zod'
import { logIdSchema, networkSchema } from '~/hornet/models'
import { createTRPCRouter, publicProcedure, withLogsProcedure } from '~/server/api/trpc'
import { hornet } from '~/server/hornet'

export const networkRouter = createTRPCRouter({
    getNetworks: publicProcedure.query(() => hornet.getNetworks()),
    getNetwork: publicProcedure.input(z.string()).query(({ input }) => hornet.getNetwork(input)),
    addNetwork: withLogsProcedure
        .input(networkSchema)
        .mutation(({ input }) => hornet.addNetwork(input, input.logId)),
    removeNetwork: publicProcedure
        .input(z.object({ name: z.string() }))
        .mutation(({ input }) => hornet.removeNetworks([input.name])),
})
