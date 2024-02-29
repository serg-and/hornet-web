import { z } from 'zod'
import { buildContextSchema, imageSchema } from '~/hornet/models'
import { createTRPCRouter, publicProcedure, withLogsProcedure } from '~/server/api/trpc'
import { hornet } from '~/server/hornet'

export const imageRouter = createTRPCRouter({
    getImages: publicProcedure.query(() => hornet.getImages()),
    getImage: publicProcedure.input(z.string()).query(({ input }) => hornet.getImage(input)),
    createBuildContext: publicProcedure.mutation(() => hornet.createBuildContext()),
    addImage: withLogsProcedure
        .input(
            z.object({
                image: imageSchema,
                buildContext: buildContextSchema.optional(),
                zipUploaded: z.boolean().optional(),
            })
        )
        .mutation(({ input }) =>
            hornet.addImage(input.image, input.buildContext, input.zipUploaded, input.logId)
        ),
    removeImage: publicProcedure
        .input(z.object({ name: z.string() }))
        .mutation(({ input }) => hornet.removeImages([input.name])),
})
