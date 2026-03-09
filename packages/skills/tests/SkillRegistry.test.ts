/**
 * Tests for SkillRegistry — centralized skill storage & retrieval.
 */

import { describe, it, expect, vi } from 'vitest';
import { SkillRegistry } from '../src/registry/SkillRegistry.js';
import { type Skill } from '../src/domain/Skill.js';

function createSkill(overrides: Partial<Skill> = {}): Skill {
    return {
        id: 'test-skill',
        name: 'test-skill',
        description: 'A test skill for unit testing.',
        instructions: '# Steps\n1. Do something.',
        path: '/srv/skills/test-skill',
        frontmatter: {
            name: 'test-skill',
            description: 'A test skill for unit testing.',
        },
        files: ['scripts/run.sh'],
        ...overrides,
    };
}

describe('SkillRegistry', () => {
    it('registers and retrieves a skill', () => {
        const registry = new SkillRegistry();
        registry.register(createSkill());

        expect(registry.size).toBe(1);
        expect(registry.has('test-skill')).toBe(true);
    });

    it('throws on duplicate registration', () => {
        const registry = new SkillRegistry();
        registry.register(createSkill());
        expect(() => registry.register(createSkill())).toThrow('already registered');
    });

    it('loads full skill by ID', () => {
        const registry = new SkillRegistry();
        registry.register(createSkill());

        const skill = registry.load('test-skill');
        expect(skill).not.toBeNull();
        expect(skill!.instructions).toContain('Do something');
    });

    it('returns null for unknown skill ID', () => {
        const registry = new SkillRegistry();
        expect(registry.load('nonexistent')).toBeNull();
    });

    it('searches skills by query', () => {
        const registry = new SkillRegistry();
        registry.register(createSkill({ id: 'k8s', name: 'k8s', description: 'Deploy to Kubernetes', frontmatter: { name: 'k8s', description: 'Deploy to Kubernetes' } }));
        registry.register(createSkill({ id: 'pdf', name: 'pdf', description: 'Extract PDF text', frontmatter: { name: 'pdf', description: 'Extract PDF text' } }));

        const result = registry.search('kubernetes');
        expect(result.skills.length).toBeGreaterThan(0);
        expect(result.skills[0]!.id).toBe('k8s');
        expect(result.total).toBe(2);
    });

    it('lists all skills', () => {
        const registry = new SkillRegistry();
        registry.register(createSkill({ id: 'a', name: 'a', description: 'Skill A', frontmatter: { name: 'a', description: 'Skill A' } }));
        registry.register(createSkill({ id: 'b', name: 'b', description: 'Skill B', frontmatter: { name: 'b', description: 'Skill B' } }));

        const all = registry.listAll();
        expect(all).toHaveLength(2);
    });

    it('clears all skills', () => {
        const registry = new SkillRegistry();
        registry.register(createSkill());
        registry.clear();
        expect(registry.size).toBe(0);
        expect(registry.has('test-skill')).toBe(false);
    });

    it('registerAll batch-registers skills', () => {
        const registry = new SkillRegistry();
        registry.registerAll([
            createSkill({ id: 'a', name: 'a', description: 'A', frontmatter: { name: 'a', description: 'A' } }),
            createSkill({ id: 'b', name: 'b', description: 'B', frontmatter: { name: 'b', description: 'B' } }),
        ]);
        expect(registry.size).toBe(2);
    });

    it('validates skills on registration by default', () => {
        const registry = new SkillRegistry();

        expect(() => registry.register(createSkill({
            id: 'Bad-Name',
            name: 'Bad-Name',
            frontmatter: { name: 'Bad-Name', description: 'Invalid name.' },
        }))).toThrow('failed validation');
    });

    it('skips validation when disabled', () => {
        const registry = new SkillRegistry({ validate: false });
        expect(() => registry.register(createSkill({
            id: 'Bad-Name',
            name: 'Bad-Name',
            frontmatter: { name: 'Bad-Name', description: 'Invalid name.' },
        }))).not.toThrow();
    });

    it('calls onValidation callback for errors', () => {
        const onValidation = vi.fn();
        const registry = new SkillRegistry({ onValidation });
        
        // Name doesn't match dir name → error (spec: MUST match)
        expect(() => registry.register(createSkill(), 'different-dir')).toThrow('failed validation');
        
        expect(onValidation).toHaveBeenCalled();
    });

    it('registerAll is atomic — no partial registration on error', () => {
        const registry = new SkillRegistry();
        const skills = [
            createSkill({ id: 'good-a', name: 'good-a', description: 'A', frontmatter: { name: 'good-a', description: 'A' } }),
            createSkill({ id: 'Bad-Name', name: 'Bad-Name', description: 'Invalid', frontmatter: { name: 'Bad-Name', description: 'Invalid' } }),
        ];

        expect(() => registry.registerAll(skills)).toThrow('failed validation');
        // Neither skill should be registered
        expect(registry.size).toBe(0);
        expect(registry.has('good-a')).toBe(false);
    });

    it('registerAll detects duplicates within the batch', () => {
        const registry = new SkillRegistry();
        const skills = [
            createSkill({ id: 'dup', name: 'dup', description: 'First', frontmatter: { name: 'dup', description: 'First' } }),
            createSkill({ id: 'dup', name: 'dup', description: 'Second', frontmatter: { name: 'dup', description: 'Second' } }),
        ];

        expect(() => registry.registerAll(skills)).toThrow('multiple times in batch');
    });

    it('readFile blocks access to SKILL.md', async () => {
        const registry = new SkillRegistry();
        registry.register(createSkill());

        await expect(registry.readFile('test-skill', 'SKILL.md')).rejects.toThrow('skills.load');
        await expect(registry.readFile('test-skill', 'sub/SKILL.md')).rejects.toThrow('skills.load');
    });

    it('readFile blocks case-insensitive SKILL.md variants', async () => {
        const registry = new SkillRegistry();
        registry.register(createSkill());

        await expect(registry.readFile('test-skill', 'skill.md')).rejects.toThrow('skills.load');
        await expect(registry.readFile('test-skill', 'Skill.MD')).rejects.toThrow('skills.load');
        await expect(registry.readFile('test-skill', 'sub/skill.md')).rejects.toThrow('skills.load');
    });

    it('readFile rejects empty inputs', async () => {
        const registry = new SkillRegistry();
        registry.register(createSkill());

        await expect(registry.readFile('', 'scripts/run.sh')).rejects.toThrow('skill_id is required');
        await expect(registry.readFile('test-skill', '')).rejects.toThrow('file_path is required');
    });
});
