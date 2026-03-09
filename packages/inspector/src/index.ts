/**
 * @vurb/inspector
 *
 * Optional TUI (Terminal User Interface) for real-time Vurb
 * server observability. Connects via Shadow Socket IPC for zero
 * stdio interference.
 *
 * ## Quick Start
 *
 * ```bash
 * # Interactive TUI (auto-discover server)
 * vurb inspect
 * vurb insp
 *
 * # Built-in simulator for demo/testing
 * vurb inspect --demo
 *
 * # Headless stderr output (ECS/K8s/CI)
 * vurb inspect --out stderr
 * vurb inspect --out stderr --demo
 * ```
 *
 * ## Programmatic API
 *
 * ```typescript
 * import { commandTop, startSimulator, streamToStderr } from '@vurb/inspector';
 *
 * // Launch TUI
 * await commandTop({ pid: 12345 });
 *
 * // Start simulator
 * const bus = await startSimulator({ rps: 5 });
 *
 * // Stream to stderr (headless)
 * await streamToStderr({ pid: 12345 });
 * ```
 *
 * @module
 */

// ── TUI Engine ──────────────────────────────────────────────
export { commandTop, type TopOptions } from './CommandTop.js';

// ── Headless Output ─────────────────────────────────────────
export { streamToStderr, formatEvent, formatEventJson, type StreamLoggerOptions } from './StreamLogger.js';

// ── Simulator ───────────────────────────────────────────────
export { startSimulator, type SimulatorOptions } from './Simulator.js';

// ── CLI ─────────────────────────────────────────────────────
export {
    runInspector, parseInspectorArgs, INSPECTOR_HELP,
    type InspectorArgs, type OutputMode,
} from './cli/inspector.js';

// ── Rendering Utilities ─────────────────────────────────────
export {
    ansi, ScreenManager, box,
    hline, pad, truncate, progressBar, stringWidth,
} from './AnsiRenderer.js';

// ── Data Structures ─────────────────────────────────────────
export { RingBuffer } from './RingBuffer.js';
