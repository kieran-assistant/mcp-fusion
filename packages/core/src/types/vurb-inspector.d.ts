/**
 * Ambient type declaration for the optional inspector package.
 * This prevents TS2307 when `@vurb/inspector`
 * is dynamically imported but not installed (e.g. CI builds).
 */
declare module '@vurb/inspector' {
    export function runInspector(argv: string[]): Promise<void>;
    export function parseInspectorArgs(argv: string[]): {
        pid: number | undefined;
        path: string | undefined;
        out: 'tui' | 'stderr';
        demo: boolean;
        help: boolean;
    };
    export const INSPECTOR_HELP: string;
}
