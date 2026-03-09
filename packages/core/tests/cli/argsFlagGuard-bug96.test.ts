import { describe, it, expect } from 'vitest';
import { parseArgs } from '../../src/cli/args.js';

describe('Bug #96 — flag-value args guard against consuming flags', () => {
    it('throws when --server is followed by another flag', () => {
        expect(() => parseArgs(['node', 'vurb', 'dev', '--server', '--dir', './src']))
            .toThrow(/missing value/i);
    });

    it('throws when --name is followed by another flag', () => {
        expect(() => parseArgs(['node', 'vurb', 'create', '--name', '--transport']))
            .toThrow(/missing value/i);
    });

    it('throws when --cwd is followed by another flag', () => {
        expect(() => parseArgs(['node', 'vurb', 'dev', '--cwd', '--check']))
            .toThrow(/missing value/i);
    });

    it('throws when --transport is followed by another flag', () => {
        expect(() => parseArgs(['node', 'vurb', 'create', '--transport', '--vector']))
            .toThrow(/missing value/i);
    });

    it('throws when --vector is followed by another flag', () => {
        expect(() => parseArgs(['node', 'vurb', 'create', '--vector', '--testing']))
            .toThrow(/missing value/i);
    });

    it('throws when --dir is followed by another flag', () => {
        expect(() => parseArgs(['node', 'vurb', 'dev', '--dir', '--server']))
            .toThrow(/missing value/i);
    });

    it('throws when --token is followed by another flag', () => {
        expect(() => parseArgs(['node', 'vurb', 'deploy', '--token', '--server-id']))
            .toThrow(/missing value/i);
    });

    it('throws when --server-id is followed by another flag', () => {
        expect(() => parseArgs(['node', 'vurb', 'deploy', '--server-id', '--token']))
            .toThrow(/missing value/i);
    });

    it('throws when flag is at end of argv (missing value)', () => {
        expect(() => parseArgs(['node', 'vurb', 'dev', '--server']))
            .toThrow(/missing value/i);
    });

    it('accepts valid flag-value pairs as before', () => {
        const result = parseArgs(['node', 'vurb', 'dev', '--server', './src/server.ts', '--dir', './src']);
        expect(result.server).toBe('./src/server.ts');
        expect(result.dir).toBe('./src');
    });

    it('accepts shorthand flags with values', () => {
        const result = parseArgs(['node', 'vurb', 'dev', '-s', './server.ts', '-d', './dist']);
        expect(result.server).toBe('./server.ts');
        expect(result.dir).toBe('./dist');
    });
});
