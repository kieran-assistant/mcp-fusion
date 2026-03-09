/**
 * Tests for SkillParser — YAML frontmatter parsing.
 */

import { describe, it, expect } from 'vitest';
import { parseSkillMd, extractFrontmatter, toSkillFrontmatter } from '../src/parser/SkillParser.js';

// ── extractFrontmatter ───────────────────────────────────

describe('extractFrontmatter', () => {
    it('extracts frontmatter and body from valid SKILL.md', () => {
        const raw = `---
name: test-skill
description: A test skill.
---
# Instructions
Step 1: Do something.`;

        const result = extractFrontmatter(raw);
        expect(result).not.toBeNull();
        expect(result!.frontmatter['name']).toBe('test-skill');
        expect(result!.frontmatter['description']).toBe('A test skill.');
        expect(result!.body).toBe('# Instructions\nStep 1: Do something.');
    });

    it('returns null for content without frontmatter', () => {
        const raw = '# Just markdown\nNo frontmatter here.';
        expect(extractFrontmatter(raw)).toBeNull();
    });

    it('handles multiline description with >', () => {
        const raw = `---
name: multi
description: >
  First line
  second line.
---
Body here.`;

        const result = extractFrontmatter(raw);
        expect(result).not.toBeNull();
        expect(result!.frontmatter['description']).toBe('First line second line.');
    });

    it('handles flow-style arrays', () => {
        const raw = `---
name: with-tools
description: Skill with tools.
allowed-tools: [tool-a, tool-b, tool-c]
---
Body.`;

        const result = extractFrontmatter(raw);
        expect(result).not.toBeNull();
        const tools = result!.frontmatter['allowed-tools'] as string[];
        expect(tools).toEqual(['tool-a', 'tool-b', 'tool-c']);
    });

    it('handles nested metadata map', () => {
        const raw = `---
name: meta-skill
description: Has metadata.
metadata:
  author: team-x
  version: "1.0"
---
Instructions.`;

        const result = extractFrontmatter(raw);
        expect(result).not.toBeNull();
        const metadata = result!.frontmatter['metadata'] as Record<string, string>;
        expect(metadata).toEqual({ author: 'team-x', version: '1.0' });
    });

    it('handles literal block | preserving newlines', () => {
        const raw = `---
name: literal
description: |
  Line one.
  Line two.
  Line three.
---
Body.`;

        const result = extractFrontmatter(raw);
        expect(result).not.toBeNull();
        expect(result!.frontmatter['description']).toBe('Line one.\nLine two.\nLine three.');
    });

    it('handles block-style YAML lists', () => {
        const raw = `---
name: block-list
description: Skill with block list.
allowed-tools:
  - Bash(git:*)
  - Read
  - Write
---
Body.`;

        const result = extractFrontmatter(raw);
        expect(result).not.toBeNull();
        const tools = result!.frontmatter['allowed-tools'] as string[];
        expect(tools).toEqual(['Bash(git:*)', 'Read', 'Write']);
    });

    it('handles allowed-tools as space-delimited string', () => {
        const raw = `---
name: space-tools
description: Skill with space-delimited tools.
allowed-tools: Bash(git:*) Bash(jq:*) Read
---
Body.`;

        const result = extractFrontmatter(raw);
        expect(result).not.toBeNull();
        // toSkillFrontmatter will split this by whitespace
        expect(result!.frontmatter['allowed-tools']).toBe('Bash(git:*) Bash(jq:*) Read');
    });

    it('handles quoted strings with colons', () => {
        const raw = `---
name: colon-test
description: "A skill: with colons in the description"
---
Body.`;

        const result = extractFrontmatter(raw);
        expect(result).not.toBeNull();
        expect(result!.frontmatter['description']).toBe('A skill: with colons in the description');
    });
});

// ── toSkillFrontmatter ───────────────────────────────────

describe('toSkillFrontmatter', () => {
    it('converts raw object to typed SkillFrontmatter', () => {
        const fm = toSkillFrontmatter({
            name: 'deploy-app',
            description: 'Deploy an application.',
            license: 'MIT',
            metadata: { author: 'dev', version: '2.0' },
        });

        expect(fm.name).toBe('deploy-app');
        expect(fm.description).toBe('Deploy an application.');
        expect(fm.license).toBe('MIT');
        expect(fm.metadata).toEqual({ author: 'dev', version: '2.0' });
    });

    it('throws if name is missing', () => {
        expect(() => toSkillFrontmatter({ description: 'No name' })).toThrow('name');
    });

    it('throws if description is missing', () => {
        expect(() => toSkillFrontmatter({ name: 'test' })).toThrow('description');
    });

    it('joins compatibility array to comma-separated string', () => {
        const fm = toSkillFrontmatter({
            name: 'compat-test',
            description: 'Test compatibility array.',
            compatibility: ['Claude', 'GPT-4', 'Gemini'],
        });

        expect(fm.compatibility).toBe('Claude, GPT-4, Gemini');
    });

    it('preserves compatibility as string when already a string', () => {
        const fm = toSkillFrontmatter({
            name: 'compat-str',
            description: 'Test compatibility string.',
            compatibility: 'Claude Desktop',
        });

        expect(fm.compatibility).toBe('Claude Desktop');
    });
});

// ── parseSkillMd ─────────────────────────────────────────

describe('parseSkillMd', () => {
    it('returns a complete Skill object', () => {
        const raw = `---
name: pdf-processing
description: Extract text from PDF files.
metadata:
  author: team-data
---
# Steps
1. Use pdftotext to extract text.
2. Parse the output.`;

        const skill = parseSkillMd(raw, '/srv/skills/pdf-processing', ['scripts/extract.sh']);

        expect(skill.id).toBe('pdf-processing');
        expect(skill.name).toBe('pdf-processing');
        expect(skill.description).toBe('Extract text from PDF files.');
        expect(skill.instructions).toContain('pdftotext');
        expect(skill.path).toBe('/srv/skills/pdf-processing');
        expect(skill.files).toEqual(['scripts/extract.sh']);
        expect(skill.frontmatter.metadata).toEqual({ author: 'team-data' });
    });

    it('throws for invalid SKILL.md content', () => {
        expect(() => parseSkillMd('No frontmatter', '/path')).toThrow('no YAML frontmatter');
    });
});
