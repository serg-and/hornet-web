import { z } from 'zod'

export class HornetError extends Error {}

export const safeString = z.string().min(1).trim()
export const optionalString = z.preprocess(x => (x ? x : undefined), safeString.optional())
export const acceptedNetworkDrivers = ['bridge', 'overlay'] as const
export const logIdSchema = z.object({ logId: z.string().optional() })

export const hostSchema = z.object({})

export const networkSchema = z.object({
    name: safeString,
    driver: z.enum(acceptedNetworkDrivers).default('overlay'),
})

export const serviceSchema = z.object({
    name: safeString,
    image: safeString,
    expose: z
        .object({
            publish: z.number().min(0).max(65535),
            target: z.number().min(0).max(65535),
        })
        .optional(),
    network: optionalString,
    mode: z.enum(['replicated', 'global']).default('replicated'),
    replicas: z.number().min(1).optional(),
    command: optionalString,
    commandArgs: z.array(z.string()).optional(),
})

export const imageSchema = z
    .object({
        name: safeString,
        publicTag: optionalString,
        build: z
            .object({
                dockerfile: safeString,
                dataZipPath: optionalString,
            })
            .optional(),
    })
    .refine(arg => !!(arg.publicTag ?? arg.build), {
        message: 'Either `publicTag` or `build` must be provided for image',
    })

export const swarmConfigSchema = z.object({
    networks: z.array(networkSchema).optional(),
    images: z.array(imageSchema).optional(),
    services: z.array(serviceSchema),
})

export const hornetConfigSchema = z.object({
    initSwarm: z.boolean().optional(),
    defaultNetwork: optionalString,
    registry: safeString.optional(),
    localRegistryPort: z.number().min(0).max(65535).optional(),
    discoverDockerRuntime: z.boolean().optional().default(true),
    logCommands: z.boolean().optional(),
})

export const buildContextSchema = z.object({ buildId: z.string(), buildPath: safeString })

export type HornetConfig = z.infer<typeof hornetConfigSchema>
export type SwarmConfig = z.infer<typeof swarmConfigSchema>
export type Host = z.infer<typeof hostSchema>
export type Network = z.infer<typeof networkSchema>
export type Service = z.infer<typeof serviceSchema>
export type Image = z.infer<typeof imageSchema>

// export type ServiceLog = { type: 'stdout' | 'stderr'; log: string }
// export type SwarmLog = ServiceLog & { service: string }
export type BuildContext = z.infer<typeof buildContextSchema>
