import { swarmConfigSchema } from '~/hornet/models'
import { createTRPCRouter, publicProcedure, withLogsProcedure } from '~/server/api/trpc'
import { hornet } from '~/server/hornet'

const on: { current: (() => void)[] } = { current: [] }

export const swarmRouter = createTRPCRouter({
    dumpConfig: publicProcedure.mutation(() => hornet.dumpSwarmConfig()),
    loadConfig: withLogsProcedure
        .input(swarmConfigSchema)
        .mutation(({ input }) => hornet.loadSwarmConfig(input, input.logId)),
})
