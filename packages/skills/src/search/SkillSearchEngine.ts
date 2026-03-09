/**
 * SkillSearchEngine — Full-Text Search via MiniSearch
 *
 * Pluggable interface with a MiniSearch-powered default implementation.
 * Indexes skill metadata (name + description) for progressive disclosure
 * Layer 1 discovery (~100 tokens per skill).
 *
 * @module
 */

import MiniSearch from 'minisearch';
import { type SkillMetadata, type SkillSearchResult } from '../domain/Skill.js';

// ── Interface ────────────────────────────────────────────

/**
 * Pluggable search engine interface.
 * Swap the implementation to add semantic/embedding search later.
 */
export interface SkillSearchEngine {
    /** Index (or re-index) a list of skill metadata entries. */
    index(skills: readonly SkillMetadata[]): void;
    /** Search by natural-language query. Returns scored results. */
    search(query: string, limit: number): SkillSearchResult[];
    /** Return all indexed skills (for listing). */
    listAll(): SkillMetadata[];
    /** Number of indexed skills. */
    readonly size: number;
}

// ── MiniSearch Implementation ────────────────────────────

/**
 * Full-text search engine backed by MiniSearch (~10KB, zero native deps).
 *
 * Supports prefix search, fuzzy matching, and field boosting.
 * Sufficient for up to ~5,000 skills.
 */
export class FullTextSearchEngine implements SkillSearchEngine {
    private _minisearch: MiniSearch<SkillMetadata>;
    private _skills: SkillMetadata[] = [];

    public constructor() {
        this._minisearch = new MiniSearch<SkillMetadata>({
            fields: ['name', 'description'],
            storeFields: ['id', 'name', 'description'],
            searchOptions: {
                boost: { name: 2, description: 1 },
                prefix: true,
                fuzzy: 0.2,
            },
            idField: 'id',
        });
    }

    public index(skills: readonly SkillMetadata[]): void {
        this._minisearch.removeAll();
        this._skills = [...skills];
        this._minisearch.addAll(this._skills);
    }

    public search(query: string, limit: number): SkillSearchResult[] {
        // Empty or wildcard query → return all
        if (!query.trim() || query.trim() === '*') {
            return this._skills.slice(0, limit).map(s => ({
                id: s.id,
                name: s.name,
                description: s.description,
                score: 1,
            }));
        }

        return this._minisearch
            .search(query)
            .slice(0, limit)
            .map(hit => ({
                id: String(hit.id),
                name: String(hit['name'] ?? ''),
                description: String(hit['description'] ?? ''),
                score: Math.round(hit.score * 100) / 100,
            }));
    }

    public listAll(): SkillMetadata[] {
        return [...this._skills];
    }

    public get size(): number {
        return this._skills.length;
    }
}
