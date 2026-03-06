/**
 * Regression test: timing-safe comparison must not leak length via early return.
 *
 * The fix replaces the early-return on length mismatch with a constant-time
 * XOR accumulation over both buffers, matching the CryptoAttestation pattern.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiKeyManager } from '../src/ApiKeyManager.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('ApiKeyManager — timing-safe comparison (bug #104)', () => {
    it('source must NOT contain early return on length mismatch', () => {
        const src = readFileSync(
            resolve(__dirname, '..', 'src', 'ApiKeyManager.ts'),
            'utf-8',
        );
        // Old pattern: `if (a.length !== b.length) return false;`
        expect(src).not.toMatch(/if\s*\(\s*a\.length\s*!==?\s*b\.length\s*\)\s*return\s+false/);
    });

    it('source must use XOR accumulation for constant-time comparison', () => {
        const src = readFileSync(
            resolve(__dirname, '..', 'src', 'ApiKeyManager.ts'),
            'utf-8',
        );
        // Ensure the constant-time XOR pattern is present
        expect(src).toMatch(/diff\s*\|=.*\^/);
        expect(src).toMatch(/diff\s*===\s*0/);
    });

    it('equal strings compare as true', async () => {
        const key = 'sk_test_equalLength12345';
        const mgr = new ApiKeyManager({ keys: [key] });
        const result = await mgr.validate(key);
        expect(result.valid).toBe(true);
    });

    it('different strings compare as false', async () => {
        const mgr = new ApiKeyManager({ keys: ['sk_test_correct_key_val'] });
        const result = await mgr.validate('sk_test_WRONG___key_val');
        expect(result.valid).toBe(false);
    });

    it('different-length strings compare as false without timing leak', async () => {
        const mgr = new ApiKeyManager({ keys: ['sk_test_longkey1234567'] });
        const result = await mgr.validate('sk_short');
        expect(result.valid).toBe(false);
    });
});
