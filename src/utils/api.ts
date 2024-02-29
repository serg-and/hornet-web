/**
 * This is the client-side entrypoint for your tRPC API. It is used to create the `api` object which
 * contains the Next.js App-wrapper, as well as your type-safe React Query hooks.
 *
 * We also create a few inference helpers for input and output types.
 */
import {
    createTRPCProxyClient,
    createWSClient,
    httpBatchLink,
    loggerLink,
    splitLink,
    wsLink,
} from '@trpc/client'
import { createTRPCNext } from '@trpc/next'
import { type inferRouterInputs, type inferRouterOutputs } from '@trpc/server'
import superjson from 'superjson'

import { type AppRouter } from '~/server/api/root'

// const WS_URL = `ws://0.0.0.0:3003`

const getBaseUrl = () => {
    if (typeof window !== 'undefined') return '' // browser should use relative url
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}` // SSR should use vercel url
    return `http://localhost:${process.env.PORT ?? 3000}` // dev SSR should use localhost
}

function getTrpcConfig() {
    return {
        /**
         * Transformer used for data de-serialization from the server.
         *
         * @see https://trpc.io/docs/data-transformers
         */
        transformer: superjson,

        /**
         * Links used to determine request flow from client to server.
         *
         * @see https://trpc.io/docs/links
         */
        links: [
            loggerLink({
                enabled: opts =>
                    process.env.NODE_ENV === 'development' ||
                    (opts.direction === 'down' && opts.result instanceof Error),
            }),
            httpBatchLink({
                url: `${getBaseUrl()}/api/trpc`,
            }),
            // splitLink({
            //     // * only use the web socket link if the operation is a subscription
            //     condition: operation => operation.type === 'subscription',
            //     true: wsLink({
            //         client: createWSClient({
            //             url: WS_URL,
            //         }),
            //     }),
            //     false: httpBatchLink({
            //         url: `${getBaseUrl()}/api/trpc`,
            //     }),
            // }),
        ],
    }
}

/** A set of type-safe react-query hooks for your tRPC API. */
export const api = createTRPCProxyClient<AppRouter>(getTrpcConfig())

/** A set of type-safe react-query hooks for your tRPC API. */
export const apiHooks = createTRPCNext<AppRouter>({
    config() {
        return getTrpcConfig()
    },
    /**
     * Whether tRPC should await queries when server rendering pages.
     *
     * @see https://trpc.io/docs/nextjs#ssr-boolean-default-false
     */
    ssr: false,
})

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>
