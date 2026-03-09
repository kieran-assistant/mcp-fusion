/**
 * SkillParser — SKILL.md File Parser
 *
 * Parses SKILL.md files into Skill domain objects.
 * Handles YAML frontmatter extraction and markdown body separation.
 *
 * @module
 */

import { type Skill, type SkillFrontmatter } from '../domain/Skill.js';

// ── YAML Frontmatter Parser ──────────────────────────────

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Parse a simple YAML string into a key-value object.
 *
 * Handles:
 * - Simple key: value pairs
 * - Nested maps (one level: metadata.key)
 * - Arrays in flow style [a, b, c]
 * - Multiline strings with >
 *
 * @internal
 */
function parseSimpleYaml(yaml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = yaml.split(/\r?\n/);
    let currentKey: string | undefined;
    let nestedMap: Record<string, string> | undefined;
    let multilineKey: string | undefined;
    let multilineValue = '';
    let multilineMode: '>' | '|' | undefined;
    let blockListKey: string | undefined;
    let blockListItems: string[] | undefined;

    for (const line of lines) {
        // Skip comments
        if (line.trim().startsWith('#')) continue;

        // Skip empty lines (but accumulate separator for multiline)
        if (line.trim() === '') {
            if (multilineKey) {
                multilineValue += multilineMode === '|' ? '\n' : ' ';
            }
            continue;
        }

        // Block-style list item continuation: `  - value`
        if (blockListKey && /^\s{2,}-\s+/.test(line)) {
            if (!blockListItems) blockListItems = [];
            blockListItems.push(line.trim().slice(2).trim().replace(/^["']|["']$/g, ''));
            continue;
        }

        // If we had blockListKey but this indented line is NOT a list item,
        // it must be a nested map entry instead — convert to map mode
        if (blockListKey && !blockListItems && /^\s{2,}\S/.test(line)) {
            blockListKey = undefined;
            // Fall through to nested map handler below
        }

        // Multiline continuation (indented line while in > or | mode)
        if (multilineKey && /^\s{2,}/.test(line)) {
            const separator = multilineMode === '|' ? '\n' : ' ';
            multilineValue += line.trim() + separator;
            continue;
        }

        // Nested map entry (2+ spaces indentation, has colon)
        if (/^\s{2,}\S/.test(line) && currentKey) {
            const match = line.trim().match(/^([^:]+):\s*(.*)$/);
            if (match) {
                if (!nestedMap) nestedMap = {};
                nestedMap[match[1]!.trim()] = match[2]!.trim().replace(/^["']|["']$/g, '');
            }
            continue;
        }

        // Flush pending states before processing new top-level key
        if (nestedMap && currentKey) {
            result[currentKey] = nestedMap;
            nestedMap = undefined;
        }
        if (multilineKey) {
            result[multilineKey] = multilineValue.trim();
            multilineKey = undefined;
            multilineValue = '';
            multilineMode = undefined;
        }
        if (blockListKey && blockListItems) {
            result[blockListKey] = blockListItems;
            blockListKey = undefined;
            blockListItems = undefined;
        }

        // Top-level key: value
        // Use a non-greedy match for the key to correctly handle quoted values with colons
        // e.g., `description: "key: value"` → key='description', value='"key: value"'
        const topMatch = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
        if (topMatch) {
            currentKey = topMatch[1]!.trim();
            const rawValue = topMatch[2]!.trim();

            if (rawValue === '>' || rawValue === '|') {
                multilineKey = currentKey;
                multilineValue = '';
                multilineMode = rawValue as '>' | '|';
            } else if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
                // Flow-style array: [a, b, c]
                result[currentKey] = rawValue
                    .slice(1, -1)
                    .split(',')
                    .map(s => s.trim().replace(/^["']|["']$/g, ''));
            } else if (rawValue === '') {
                // Could be nested map OR block-style list — peek will disambiguate
                blockListKey = currentKey;
                blockListItems = undefined;
                nestedMap = undefined;
            } else {
                result[currentKey] = rawValue.replace(/^["']|["']$/g, '');
            }
        }
    }

    // Flush remaining
    if (nestedMap && currentKey) result[currentKey] = nestedMap;
    if (multilineKey) result[multilineKey] = multilineValue.trim();
    if (blockListKey && blockListItems) result[blockListKey] = blockListItems;

    return result;
}

// ── Frontmatter Extraction ───────────────────────────────

/**
 * Extract YAML frontmatter and markdown body from raw SKILL.md content.
 *
 * @param raw - Raw file content
 * @returns Parsed frontmatter + body, or null if no frontmatter found
 */
export function extractFrontmatter(raw: string): { frontmatter: Record<string, unknown>; body: string } | null {
    const match = FRONTMATTER_REGEX.exec(raw);
    if (!match) return null;

    const yamlStr = match[1]!;
    const body = match[2]!.trim();
    const frontmatter = parseSimpleYaml(yamlStr);

    return { frontmatter, body };
}

/**
 * Convert a raw frontmatter object into a typed SkillFrontmatter.
 *
 * @param raw - Object from YAML parsing
 * @returns Typed frontmatter
 * @throws If required fields (name, description) are missing
 */
export function toSkillFrontmatter(raw: Record<string, unknown>): SkillFrontmatter {
    const name = raw['name'];
    const description = raw['description'];
    const allowedToolsRaw = raw['allowed-tools'] ?? raw['allowedTools'];

    if (typeof name !== 'string' || name.length === 0) {
        throw new Error('SKILL.md frontmatter missing required "name" field');
    }
    if (typeof description !== 'string' || description.length === 0) {
        throw new Error('SKILL.md frontmatter missing required "description" field');
    }

    let allowedTools: string[] | undefined;
    if (typeof allowedToolsRaw === 'string') {
        allowedTools = allowedToolsRaw.split(/\s+/).filter(Boolean);
    } else if (Array.isArray(allowedToolsRaw)) {
        allowedTools = allowedToolsRaw.filter((s): s is string => typeof s === 'string');
    }

    return {
        name,
        description,
        license: typeof raw['license'] === 'string' ? raw['license'] : undefined,
        compatibility: coerceToString(raw['compatibility']),
        metadata: isStringRecord(raw['metadata']) ? raw['metadata'] : undefined,
        allowedTools,
    };
}

/**
 * Parse a SKILL.md file into a Skill domain object.
 *
 * @param content - Raw SKILL.md content
 * @param skillPath - Absolute path to the skill directory
 * @param files - Relative paths of auxiliary files in the skill directory
 * @returns Parsed Skill object
 * @throws If frontmatter is invalid or missing
 */
export function parseSkillMd(content: string, skillPath: string, files: readonly string[] = []): Skill {
    const extracted = extractFrontmatter(content);
    if (!extracted) {
        throw new Error('Invalid SKILL.md: no YAML frontmatter found');
    }

    const frontmatter = toSkillFrontmatter(extracted.frontmatter);

    return {
        id: frontmatter.name,
        name: frontmatter.name,
        description: frontmatter.description,
        instructions: extracted.body,
        path: skillPath,
        frontmatter,
        files,
    };
}

// ── Helpers ──────────────────────────────────────────────

function isStringRecord(value: unknown): value is Record<string, string> {
    if (typeof value !== 'object' || value === null) return false;
    return Object.values(value).every(v => typeof v === 'string');
}

/**
 * Coerce a value to string:
 *  - string → as-is
 *  - string[] → join with ", "
 *  - anything else → undefined
 *
 * Used to handle YAML compatibility field which may be written as
 * either a single string or a block-style list.
 * @internal
 */
function coerceToString(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.filter(v => typeof v === 'string').join(', ') || undefined;
    return undefined;
}
