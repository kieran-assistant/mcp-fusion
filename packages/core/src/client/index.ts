/** Client Bounded Context — Barrel Export */
export { createVurbClient, VurbClientError } from './VurbClient.js';
export type {
    VurbClient,
    VurbTransport,
    RouterMap,
    FluentProxy,
    ClientMiddleware,
    VurbClientOptions,
} from './VurbClient.js';
export { createTypedRegistry } from './createTypedRegistry.js';
export type { InferRouter, TypedToolRegistry } from './InferRouter.js';
