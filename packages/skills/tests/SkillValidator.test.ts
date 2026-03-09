/**
 * Tests for SkillValidator — agentskills.io spec compliance.
 */

import { describe, it, expect } from 'vitest';
import { validateSkill, formatValidationIssues } from '../src/parser/SkillValidator.js';
import { type SkillFrontmatter } from '../src/domain/Skill.js';

function fm(overrides: Partial<SkillFrontmatter> = {}): SkillFrontmatter {
    return {
        name: 'valid-skill',
        description: 'A valid skill for testing.',
        ...overrides,
    };
}

describe('validateSkill', () => {
    it('passes for valid frontmatter', () => {
        const result = validateSkill(fm());
        expect(result.valid).toBe(true);
        expect(result.issues).toHaveLength(0);
    });

    it('fails for empty name', () => {
        const result = validateSkill(fm({ name: '' }));
        expect(result.valid).toBe(false);
        expect(result.issues.some(i => i.field === 'name')).toBe(true);
    });

    it('fails for name with uppercase', () => {
        const result = validateSkill(fm({ name: 'Invalid-Name' }));
        expect(result.valid).toBe(false);
    });

    it('fails for name with consecutive hyphens', () => {
        const result = validateSkill(fm({ name: 'bad--name' }));
        expect(result.valid).toBe(false);
    });

    it('fails for name starting with hyphen', () => {
        const result = validateSkill(fm({ name: '-bad-name' }));
        expect(result.valid).toBe(false);
    });

    it('fails for name exceeding 64 chars', () => {
        const result = validateSkill(fm({ name: 'a'.repeat(65) }));
        expect(result.valid).toBe(false);
    });

    it('warns for description exceeding 1024 chars', () => {
        const result = validateSkill(fm({ description: 'x'.repeat(1025) }));
        expect(result.valid).toBe(true); // warning, not error
        expect(result.issues.some(i => i.severity === 'warning')).toBe(true);
    });

    it('fails when dir name does not match skill name', () => {
        const result = validateSkill(fm({ name: 'skill-a' }), 'skill-b');
        expect(result.valid).toBe(false);
        expect(result.issues.some(i => i.severity === 'error' && i.message.includes('must match'))).toBe(true);
    });

    it('accepts single-char name', () => {
        const result = validateSkill(fm({ name: 'a' }));
        expect(result.valid).toBe(true);
    });
});

describe('formatValidationIssues', () => {
    it('formats error issues with ✗', () => {
        const result = validateSkill(fm({ name: '' }));
        const lines = formatValidationIssues('bad-skill', result);
        expect(lines.length).toBeGreaterThan(0);
        expect(lines[0]).toContain('✗');
    });

    it('returns empty array for valid skills', () => {
        const result = validateSkill(fm());
        const lines = formatValidationIssues('good-skill', result);
        expect(lines).toHaveLength(0);
    });
});
