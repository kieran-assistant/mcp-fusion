/**
 * Bug #74 Regression: isCLI detection must handle Windows shims
 *
 * BUG: The guard checked `process.argv[1]?.endsWith('vurb')` or
 * `endsWith('vurb.js')`, missing Windows-specific extensions like
 * `.cmd`, `.ps1`, `.cjs`, `.mjs`, `.exe` created by npm/pnpm/yarn.
 * On Windows via npx, `argv[1]` is typically `…\node_modules\.bin\vurb.cmd`
 * or `vurb.ps1`. The guard silently failed — `main()` was never called,
 * producing zero output.
 *
 * FIX: Extract basename, strip any extension, compare against `'vurb'`.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';

// Replicate the fixed detection logic to test it in isolation
// (importing vurb.ts directly would trigger the CLI guard)
function detectCLI(argv1: string | undefined): boolean {
    if (!argv1) return false;
    const base = argv1.replace(/\\/g, '/').split('/').pop() ?? '';
    const name = base.replace(/\.[a-z0-9]+$/i, '');
    return name === 'vurb';
}

describe('Bug #74: isCLI detection for Windows shims', () => {

    it('detects bare "vurb" (POSIX)', () => {
        expect(detectCLI('/usr/local/bin/vurb')).toBe(true);
    });

    it('detects vurb.js', () => {
        expect(detectCLI('/project/node_modules/.bin/vurb.js')).toBe(true);
    });

    it('detects vurb.cmd (Windows npm)', () => {
        expect(detectCLI('C:\\Users\\dev\\node_modules\\.bin\\vurb.cmd')).toBe(true);
    });

    it('detects vurb.ps1 (Windows PowerShell)', () => {
        expect(detectCLI('C:\\Users\\dev\\node_modules\\.bin\\vurb.ps1')).toBe(true);
    });

    it('detects vurb.cjs (pnpm)', () => {
        expect(detectCLI('/home/user/.pnpm/vurb.cjs')).toBe(true);
    });

    it('detects vurb.mjs (ESM shim)', () => {
        expect(detectCLI('/usr/local/bin/vurb.mjs')).toBe(true);
    });

    it('detects vurb.exe (Windows compiled)', () => {
        expect(detectCLI('C:\\Program Files\\vurb.exe')).toBe(true);
    });

    it('rejects unrelated binary', () => {
        expect(detectCLI('/usr/local/bin/node')).toBe(false);
    });

    it('rejects undefined argv[1]', () => {
        expect(detectCLI(undefined)).toBe(false);
    });

    it('rejects names containing "vurb" as substring', () => {
        expect(detectCLI('/usr/local/bin/vurb-extra')).toBe(false);
        expect(detectCLI('/usr/local/bin/myvurb')).toBe(false);
    });
});
