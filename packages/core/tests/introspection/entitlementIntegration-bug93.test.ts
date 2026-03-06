import { describe, it, expect } from 'vitest';
import { materializeContract } from '../../src/introspection/ToolContract.js';

// ── Minimal builder stub ─────────────────────────────────

function createBuilder(handlers: Array<(...args: unknown[]) => unknown>) {
    const actions = handlers.map((handler, i) => ({
        name: `action_${i}`,
        handler,
        requiredFields: {},
        hasMiddleware: false,
    }));

    return {
        getName: () => 'test-tool',
        getTags: () => ['test'],
        getActionNames: () => actions.map(a => a.name),
        getActionMetadata: () => actions.map(a => ({
            name: a.name,
            description: `Action ${a.name}`,
            readOnly: false,
            params: {},
        })),
        buildToolDefinition: () => ({
            name: 'test-tool',
            description: 'A test tool',
            inputSchema: { type: 'object', properties: {} },
        }),
        getActions: () => actions,
    };
}

// ── Tests ────────────────────────────────────────────────

describe('Bug #93 — EntitlementScanner integration in materializeContract', () => {
    it('detects network entitlement from handler using fetch', async () => {
        const builder = createBuilder([
            async function handler() {
                const res = await fetch('https://api.example.com/data');
                return res.json();
            },
        ]);

        const contract = await materializeContract(builder as any);
        expect(contract.entitlements.network).toBe(true);
        expect(contract.entitlements.raw.length).toBeGreaterThan(0);
    });

    it('detects filesystem entitlement from handler using fs', async () => {
        const builder = createBuilder([
            async function handler() {
                const fs = require('fs');
                return fs.readFileSync('/etc/hosts', 'utf-8');
            },
        ]);

        const contract = await materializeContract(builder as any);
        expect(contract.entitlements.filesystem).toBe(true);
    });

    it('detects subprocess entitlement from handler using child_process', async () => {
        const builder = createBuilder([
            async function handler() {
                const { execSync } = require('child_process');
                return execSync('ls').toString();
            },
        ]);

        const contract = await materializeContract(builder as any);
        expect(contract.entitlements.subprocess).toBe(true);
    });

    it('returns all-false entitlements for clean handler', async () => {
        const builder = createBuilder([
            async function handler() {
                return { result: 1 + 2 };
            },
        ]);

        const contract = await materializeContract(builder as any);
        expect(contract.entitlements.filesystem).toBe(false);
        expect(contract.entitlements.network).toBe(false);
        expect(contract.entitlements.subprocess).toBe(false);
        expect(contract.entitlements.crypto).toBe(false);
        expect(contract.entitlements.codeEvaluation).toBe(false);
        expect(contract.entitlements.raw).toEqual([]);
    });

    it('returns all-false when builder has no getActions', async () => {
        const builder = {
            getName: () => 'no-actions-tool',
            getTags: () => [],
            getActionNames: () => ['default'],
            getActionMetadata: () => [{
                name: 'default',
                description: 'Default action',
                readOnly: true,
                params: {},
            }],
            buildToolDefinition: () => ({
                name: 'no-actions-tool',
                description: 'Tool without getActions',
                inputSchema: { type: 'object', properties: {} },
            }),
        };

        const contract = await materializeContract(builder as any);
        expect(contract.entitlements.filesystem).toBe(false);
        expect(contract.entitlements.network).toBe(false);
    });
});
