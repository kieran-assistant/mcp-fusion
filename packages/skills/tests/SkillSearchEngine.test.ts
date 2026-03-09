/**
 * Tests for SkillSearchEngine — MiniSearch-powered full-text search.
 */

import { describe, it, expect } from 'vitest';
import { FullTextSearchEngine } from '../src/search/SkillSearchEngine.js';

function createEngine() {
    const engine = new FullTextSearchEngine();
    engine.index([
        { id: 'k8s-deploy', name: 'k8s-deploy', description: 'Deploy applications to Kubernetes clusters.' },
        { id: 'pdf-extract', name: 'pdf-extract', description: 'Extract text and tables from PDF files.' },
        { id: 'docker-build', name: 'docker-build', description: 'Build container images with Docker or Podman.' },
        { id: 'api-test', name: 'api-test', description: 'Test REST APIs with curl and jq.' },
    ]);
    return engine;
}

describe('FullTextSearchEngine', () => {
    it('finds skills by keyword', () => {
        const engine = createEngine();
        const results = engine.search('kubernetes', 10);
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]!.id).toBe('k8s-deploy');
    });

    it('finds skills by partial match (prefix)', () => {
        const engine = createEngine();
        const results = engine.search('kube', 10);
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]!.id).toBe('k8s-deploy');
    });

    it('finds skills by description keywords', () => {
        const engine = createEngine();
        const results = engine.search('PDF text', 10);
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]!.id).toBe('pdf-extract');
    });

    it('returns empty for non-matching query', () => {
        const engine = createEngine();
        const results = engine.search('quantum-computing', 10);
        expect(results).toHaveLength(0);
    });

    it('respects limit parameter', () => {
        const engine = createEngine();
        const results = engine.search('*', 2);
        expect(results.length).toBeLessThanOrEqual(2);
    });

    it('returns all skills for wildcard query', () => {
        const engine = createEngine();
        const results = engine.search('*', 100);
        expect(results).toHaveLength(4);
    });

    it('returns all skills for empty query', () => {
        const engine = createEngine();
        const results = engine.search('', 100);
        expect(results).toHaveLength(4);
    });

    it('reports correct size', () => {
        const engine = createEngine();
        expect(engine.size).toBe(4);
    });

    it('listAll returns all metadata', () => {
        const engine = createEngine();
        const all = engine.listAll();
        expect(all).toHaveLength(4);
        expect(all.map(s => s.id).sort()).toEqual(['api-test', 'docker-build', 'k8s-deploy', 'pdf-extract']);
    });

    it('re-indexes correctly', () => {
        const engine = createEngine();
        engine.index([
            { id: 'new-skill', name: 'new-skill', description: 'A brand new skill.' },
        ]);
        expect(engine.size).toBe(1);
        expect(engine.search('brand new', 10)).toHaveLength(1);
    });

    it('boosts name matches over description', () => {
        const engine = new FullTextSearchEngine();
        engine.index([
            { id: 'docker', name: 'docker', description: 'Generic container management.' },
            { id: 'generic-tool', name: 'generic-tool', description: 'Uses docker under the hood.' },
        ]);
        const results = engine.search('docker', 10);
        expect(results[0]!.id).toBe('docker');
    });
});
