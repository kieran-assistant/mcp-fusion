/**
 * Skill — Domain Model
 *
 * Represents an Agent Skill parsed from a SKILL.md file.
 * Follows the Agent Skills specification (agentskills.io).
 *
 * @module
 */

// ── Types ────────────────────────────────────────────────

/**
 * Metadata from SKILL.md YAML frontmatter.
 *
 * @see https://agentskills.io/specification
 */
export interface SkillFrontmatter {
    /** Unique identifier (1-64 chars, lowercase + hyphens) */
    readonly name: string;
    /** What the skill does and when to use it (1-1024 chars) */
    readonly description: string;
    /** License applied to the skill */
    readonly license?: string | undefined;
    /** Environment requirements */
    readonly compatibility?: string | undefined;
    /** Free-form key-value metadata */
    readonly metadata?: Readonly<Record<string, string>> | undefined;
    /** Pre-approved tools (experimental) */
    readonly allowedTools?: readonly string[] | undefined;
}

/**
 * A fully parsed Agent Skill, ready for indexing and serving.
 */
export interface Skill {
    /** Unique identifier (matches `name` from frontmatter) */
    readonly id: string;
    /** Display name */
    readonly name: string;
    /** Description for search discovery */
    readonly description: string;
    /** Full SKILL.md body (markdown instructions) */
    readonly instructions: string;
    /** Absolute path to the skill directory on the server filesystem */
    readonly path: string;
    /** YAML frontmatter metadata */
    readonly frontmatter: SkillFrontmatter;
    /** Relative paths of auxiliary files (scripts/, references/, assets/) */
    readonly files: readonly string[];
}

/**
 * Lightweight metadata used for search indexing (Layer 1 — ~100 tokens).
 * Full instructions are loaded on demand via `load_skill`.
 */
export interface SkillMetadata {
    readonly id: string;
    readonly name: string;
    readonly description: string;
}

/**
 * Search result with relevance score.
 */
export interface SkillSearchResult {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly score: number;
}

/**
 * File content returned by `read_skill_file`.
 */
export interface SkillFileContent {
    /** File content (text or base64-encoded binary) */
    readonly content: string;
    /** Relative path inside the skill directory */
    readonly path: string;
    /** Size in bytes */
    readonly size: number;
    /** "utf-8" for text, "base64" for binary */
    readonly encoding: 'utf-8' | 'base64';
    /** MIME type (e.g. "text/plain", "application/pdf") */
    readonly mimeType: string;
}
