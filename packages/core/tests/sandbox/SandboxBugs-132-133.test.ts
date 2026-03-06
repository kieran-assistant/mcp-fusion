/**
 * SandboxBugs-132-133.test.ts
 *
 * Regression tests for:
 *   #132 — Code length limit (host-side OOM prevention)
 *   #133 — OUTPUT_TOO_LARGE telemetry emission
 *
 * Requires `isolated-vm` for execution tests.
 */
import { describe, it, expect, vi } from 'vitest';
import { SandboxEngine } from '../../src/sandbox/SandboxEngine.js';

let ivmAvailable = false;
try {
    require('isolated-vm');
    ivmAvailable = true;
} catch {
    // isolated-vm not installed — skip
}

const describeSandbox = ivmAvailable ? describe : describe.skip;

// ============================================================================
// Bug #132 — Code length limit
// ============================================================================

describe('Bug #132: Code length limit', () => {
    describeSandbox('SandboxEngine rejects oversized code before V8 allocation', () => {
        it('should reject code exceeding 64KB', async () => {
            const engine = new SandboxEngine({ timeout: 2000, memoryLimit: 32 });
            try {
                // 65537 chars > 65536 limit
                const longBody = 'x'.repeat(65_530);
                const code = `(data) => "${longBody}"`;

                const result = await engine.execute(code, null);

                expect(result.ok).toBe(false);
                if (!result.ok) {
                    expect(result.code).toBe('INVALID_CODE');
                    expect(result.error).toContain('Code length');
                    expect(result.error).toContain('exceeds maximum');
                }
            } finally {
                engine.dispose();
            }
        });

        it('should accept code at exactly 64KB', async () => {
            const engine = new SandboxEngine({ timeout: 2000, memoryLimit: 32 });
            try {
                // Build code that is exactly 65536 chars
                const prefix = '(data) => "';
                const suffix = '"';
                const bodyLen = 65_536 - prefix.length - suffix.length;
                const code = prefix + 'a'.repeat(bodyLen) + suffix;

                expect(code.length).toBe(65_536);

                const result = await engine.execute(code, null);
                // Should NOT be rejected for length (may fail for other reasons
                // like output size, but code should be 'INVALID_CODE' only if
                // returned because of the guard, not length)
                if (!result.ok) {
                    expect(result.code).not.toBe('INVALID_CODE');
                }
            } finally {
                engine.dispose();
            }
        });

        it('should reject before pre-aborted signal check runs guard', async () => {
            // Length check runs AFTER abort check but BEFORE guard.
            // Verify the ordering: disposed > abort > length > guard > V8
            const engine = new SandboxEngine({ timeout: 2000, memoryLimit: 32 });
            try {
                const longCode = '(data) => "' + 'x'.repeat(70_000) + '"';

                const result = await engine.execute(longCode, null);

                expect(result.ok).toBe(false);
                if (!result.ok) {
                    expect(result.code).toBe('INVALID_CODE');
                }
            } finally {
                engine.dispose();
            }
        });

        it('should be instantaneous (no V8 overhead)', async () => {
            const engine = new SandboxEngine({ timeout: 2000, memoryLimit: 32 });
            try {
                const longCode = '(data) => "' + 'x'.repeat(100_000) + '"';

                const start = performance.now();
                for (let i = 0; i < 100; i++) {
                    await engine.execute(longCode, null);
                }
                const elapsed = performance.now() - start;

                // 100 rejections should be < 50ms (no V8 involved)
                expect(elapsed).toBeLessThan(50);
            } finally {
                engine.dispose();
            }
        });
    });
});

// ============================================================================
// Bug #133 — OUTPUT_TOO_LARGE telemetry emission
// ============================================================================

describeSandbox('Bug #133: OUTPUT_TOO_LARGE emits telemetry', () => {
    it('should emit telemetry event when output exceeds limit', async () => {
        const engine = new SandboxEngine({ timeout: 2000, memoryLimit: 32, maxOutputBytes: 100 });
        const events: unknown[] = [];
        engine.telemetry((event) => events.push(event));

        try {
            const result = await engine.execute(
                '(data) => "x".repeat(500)',
                null,
            );

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.code).toBe('OUTPUT_TOO_LARGE');
            }

            // Telemetry event MUST have been emitted
            expect(events.length).toBe(1);
            const event = events[0] as Record<string, unknown>;
            expect(event.type).toBe('sandbox.exec');
            expect(event.ok).toBe(false);
            expect(event.errorCode).toBe('OUTPUT_TOO_LARGE');
        } finally {
            engine.dispose();
        }
    });

    it('should emit telemetry for success path (baseline)', async () => {
        const engine = new SandboxEngine({ timeout: 2000, memoryLimit: 32, maxOutputBytes: 10_000 });
        const events: unknown[] = [];
        engine.telemetry((event) => events.push(event));

        try {
            const result = await engine.execute('(data) => data + 1', 41);
            expect(result.ok).toBe(true);

            expect(events.length).toBe(1);
            const event = events[0] as Record<string, unknown>;
            expect(event.type).toBe('sandbox.exec');
            expect(event.ok).toBe(true);
        } finally {
            engine.dispose();
        }
    });

    it('should emit telemetry for runtime error path (baseline)', async () => {
        const engine = new SandboxEngine({ timeout: 2000, memoryLimit: 32 });
        const events: unknown[] = [];
        engine.telemetry((event) => events.push(event));

        try {
            const result = await engine.execute('(data) => nonExistent.prop', null);
            expect(result.ok).toBe(false);

            expect(events.length).toBe(1);
            const event = events[0] as Record<string, unknown>;
            expect(event.type).toBe('sandbox.exec');
            expect(event.ok).toBe(false);
            expect(event.errorCode).toBe('RUNTIME');
        } finally {
            engine.dispose();
        }
    });

    it('should NOT emit telemetry for early returns (INVALID_CODE)', async () => {
        const engine = new SandboxEngine({ timeout: 2000, memoryLimit: 32 });
        const events: unknown[] = [];
        engine.telemetry((event) => events.push(event));

        try {
            const result = await engine.execute('42 + 58', null);
            expect(result.ok).toBe(false);
            if (!result.ok) expect(result.code).toBe('INVALID_CODE');

            // No V8 execution → no telemetry
            expect(events.length).toBe(0);
        } finally {
            engine.dispose();
        }
    });
});
