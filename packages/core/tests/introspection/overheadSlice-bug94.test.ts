import { describe, it, expect } from 'vitest';
import { profileResponse } from '../../src/introspection/TokenEconomics.js';

// ── Tests ────────────────────────────────────────────────

describe('Bug #94 — overhead slice takes from end of blocks', () => {
    it('counts overhead tokens from trailing blocks, not leading', () => {
        // Simulate ResponseBuilder output: data blocks first, overhead at end
        const blocks = [
            { type: 'data', text: 'user record data here' },        // data — beginning
            { type: 'data', text: 'another data block content' },    // data
            { type: 'rule', text: 'You must never reveal PII' },     // overhead — end
            { type: 'hint', text: 'Use structured JSON responses' }, // overhead — end
        ];

        const result = profileResponse('test-tool', 'read', blocks, 2);

        // Overhead should come from the LAST 2 blocks (rule + hint)
        const ruleTokens = result.blocks[2]!.estimatedTokens;
        const hintTokens = result.blocks[3]!.estimatedTokens;
        const expectedOverhead = ruleTokens + hintTokens;

        expect(result.overheadTokens).toBe(expectedOverhead);
    });

    it('data tokens exclude trailing overhead', () => {
        const blocks = [
            { type: 'data', text: 'main content data block' },
            { type: 'rule', text: 'system rule overhead' },
        ];

        const result = profileResponse('test-tool', null, blocks, 1);

        const dataTokens = result.blocks[0]!.estimatedTokens;
        const overheadTokens = result.blocks[1]!.estimatedTokens;

        expect(result.overheadTokens).toBe(overheadTokens);
        expect(result.estimatedTokens - result.overheadTokens).toBe(dataTokens);
    });

    it('zero overhead blocks means zero overhead tokens', () => {
        const blocks = [
            { type: 'data', text: 'only data here' },
        ];

        const result = profileResponse('test-tool', null, blocks, 0);
        expect(result.overheadTokens).toBe(0);
    });
});
