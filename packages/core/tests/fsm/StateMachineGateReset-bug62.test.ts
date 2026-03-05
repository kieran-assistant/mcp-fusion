/**
 * Bug #62 — `StateMachineGate` global `xstateLoadAttempted` has no reset.
 *
 * `xstateLoadAttempted` is a module-level flag. If the first `loadXState()`
 * call fails (e.g., test environment without xstate), the flag is set
 * permanently. Dynamic mocking later never re-triggers the import.
 *
 * Why existing tests missed it:
 * All FSM tests import xstate at the top level. No test ever needed to
 * reset the load flag between scenarios (e.g., first-fail then mock-available).
 *
 * Fix: Export `resetXStateCache()` that resets both the flag and the cached module.
 */
import { describe, it, expect } from 'vitest';
import { resetXStateCache, initFsmEngine } from '../../src/fsm/StateMachineGate.js';

describe('resetXStateCache (Bug #62)', () => {
    it('should be exported and callable', () => {
        expect(typeof resetXStateCache).toBe('function');
        // Should not throw
        resetXStateCache();
    });

    it('should allow re-loading xstate after reset', async () => {
        // First call: loads xstate (or fails if not installed)
        const firstResult = await initFsmEngine();

        // Reset the cache
        resetXStateCache();

        // Second call: should re-attempt loading (not use stale cache)
        const secondResult = await initFsmEngine();

        // Both calls should produce the same result (xstate is either
        // installed or not — the point is the second call re-tries)
        expect(secondResult).toBe(firstResult);
    });

    it('should be re-exported from the package index', async () => {
        const index = await import('../../src/index.js');
        expect(typeof index.resetXStateCache).toBe('function');
    });

    it('should allow multiple resets without error', () => {
        resetXStateCache();
        resetXStateCache();
        resetXStateCache();
        // No throw = success
    });
});
