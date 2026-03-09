/**
 * Bug #99 — VURB_VERSION reads from package.json at runtime
 *
 * Verifies the version constant matches the actual package.json version
 * instead of being a stale hardcoded '1.1.0'.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VURB_VERSION } from '../../src/cli/constants.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe('Bug #99 — VURB_VERSION dynamic from package.json', () => {
    it('matches the version in packages/core/package.json', () => {
        const pkgPath = resolve(__dirname, '../../package.json');
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        expect(VURB_VERSION).toBe(pkg.version);
    });

    it('is not the stale hardcoded value', () => {
        expect(VURB_VERSION).not.toBe('1.1.0');
    });

    it('looks like a valid semver string', () => {
        expect(VURB_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    });
});
