/**
 * Tests for createSkillTools — MCP Tool Factory.
 */

import { describe, it, expect } from 'vitest';
import { createSkillTools } from '../src/tools/createSkillTools.js';
import { SkillRegistry } from '../src/registry/SkillRegistry.js';
import { type Skill } from '../src/domain/Skill.js';

// ── Stub Vurb Builder ────────────────────────────────────

interface StubTool {
    name: string;
    description: string;
    params: { name: string; desc: string; type: string }[];
    handler: (input: Record<string, unknown>) => unknown | Promise<unknown>;
}

function createStubVurb() {
    const tools: StubTool[] = [];

    return {
        query(name: string) {
            const tool: StubTool = { name, description: '', params: [], handler: () => null };
            tools.push(tool);

            const builder = {
                describe(desc: string) { tool.description = desc; return builder; },
                withString(n: string, d: string) { tool.params.push({ name: n, desc: d, type: 'string' }); return builder; },
                withNumber(n: string, d: string) { tool.params.push({ name: n, desc: d, type: 'number' }); return builder; },
                handle(handler: (input: Record<string, unknown>) => unknown) {
                    tool.handler = handler;
                    return {
                        getName() { return tool.name; },
                        buildToolDefinition() { return tool; },
                    };
                },
            };
            return builder;
        },
        tools,
    };
}

// ── Test Helpers ─────────────────────────────────────────

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

function registryWith(...skills: Skill[]): SkillRegistry {
    const registry = new SkillRegistry({ validate: false });
    if (skills.length > 0) {
        registry.registerAll(skills);
    }
    return registry;
}

// ── Tests ────────────────────────────────────────────────

describe('createSkillTools', () => {
    describe('tool creation', () => {
        it('creates exactly 3 tools', () => {
            const f = createStubVurb();
            const registry = registryWith(createSkill());
            const result = createSkillTools(f, registry);

            expect(result).toHaveLength(3);
        });

        it('names tools with default prefix "skills"', () => {
            const f = createStubVurb();
            const registry = registryWith(createSkill());
            const [search, load, readFile] = createSkillTools(f, registry);

            expect(search.getName()).toBe('skills.search');
            expect(load.getName()).toBe('skills.load');
            expect(readFile.getName()).toBe('skills.read_file');
        });

        it('uses custom prefix when provided', () => {
            const f = createStubVurb();
            const registry = registryWith(createSkill());
            const [search, load, readFile] = createSkillTools(f, registry, { prefix: 'abilities' });

            expect(search.getName()).toBe('abilities.search');
            expect(load.getName()).toBe('abilities.load');
            expect(readFile.getName()).toBe('abilities.read_file');
        });
    });

    describe('skills.search', () => {
        it('returns matching skills by query', () => {
            const f = createStubVurb();
            const registry = registryWith(
                createSkill({ id: 'k8s', name: 'k8s', description: 'Deploy to Kubernetes', frontmatter: { name: 'k8s', description: 'Deploy to Kubernetes' } }),
                createSkill({ id: 'pdf', name: 'pdf', description: 'Extract PDF text', frontmatter: { name: 'pdf', description: 'Extract PDF text' } }),
            );
            createSkillTools(f, registry);

            const tool = f.tools.find(t => t.name === 'skills.search')!;
            const result = tool.handler({ query: 'kubernetes' }) as { skills: unknown[]; total: number };

            expect(result.skills.length).toBeGreaterThan(0);
            expect(result.total).toBe(2);
        });

        it('returns all skills for empty query', () => {
            const f = createStubVurb();
            const registry = registryWith(
                createSkill({ id: 'a', name: 'a', description: 'Skill A', frontmatter: { name: 'a', description: 'Skill A' } }),
                createSkill({ id: 'b', name: 'b', description: 'Skill B', frontmatter: { name: 'b', description: 'Skill B' } }),
            );
            createSkillTools(f, registry);

            const tool = f.tools.find(t => t.name === 'skills.search')!;
            const result = tool.handler({ query: '' }) as { skills: unknown[]; total: number };

            expect(result.skills).toHaveLength(2);
            expect(result.total).toBe(2);
        });

        it('returns all skills for wildcard query', () => {
            const f = createStubVurb();
            const registry = registryWith(
                createSkill({ id: 'x', name: 'x', description: 'X', frontmatter: { name: 'x', description: 'X' } }),
            );
            createSkillTools(f, registry);

            const tool = f.tools.find(t => t.name === 'skills.search')!;
            const result = tool.handler({ query: '*' }) as { skills: unknown[]; total: number };

            expect(result.skills).toHaveLength(1);
        });

        it('coerces missing query to empty string', () => {
            const f = createStubVurb();
            const registry = registryWith(
                createSkill({ id: 'y', name: 'y', description: 'Y', frontmatter: { name: 'y', description: 'Y' } }),
            );
            createSkillTools(f, registry);

            const tool = f.tools.find(t => t.name === 'skills.search')!;
            // input with no "query" key at all
            const result = tool.handler({}) as { skills: unknown[]; total: number };

            expect(result.skills).toHaveLength(1);
        });

        it('omits name from result when it matches id', () => {
            const f = createStubVurb();
            const registry = registryWith(
                createSkill({ id: 'same-name', name: 'same-name', description: 'Same', frontmatter: { name: 'same-name', description: 'Same' } }),
            );
            createSkillTools(f, registry);

            const tool = f.tools.find(t => t.name === 'skills.search')!;
            const result = tool.handler({ query: '*' }) as { skills: Array<{ id: string; name?: string }> };

            // When name === id, the name field should be omitted to reduce payload
            expect(result.skills[0]!.name).toBeUndefined();
        });
    });

    describe('skills.load', () => {
        it('loads a skill by valid ID', () => {
            const f = createStubVurb();
            const skill = createSkill();
            const registry = registryWith(skill);
            createSkillTools(f, registry);

            const tool = f.tools.find(t => t.name === 'skills.load')!;
            const result = tool.handler({ skill_id: 'test-skill' }) as { id: string; instructions: string; files: string[] };

            expect(result.id).toBe('test-skill');
            expect(result.instructions).toContain('Do something');
            expect(result.files).toEqual(['scripts/run.sh']);
        });

        it('returns error hint for unknown skill ID', () => {
            const f = createStubVurb();
            const registry = registryWith(createSkill());
            createSkillTools(f, registry);

            const tool = f.tools.find(t => t.name === 'skills.load')!;
            const result = tool.handler({ skill_id: 'nonexistent' }) as { error: string; hint: string };

            expect(result.error).toContain('nonexistent');
            expect(result.hint).toContain('skills.search');
        });

        it('returns error hint for empty skill ID', () => {
            const f = createStubVurb();
            const registry = registryWith(createSkill());
            createSkillTools(f, registry);

            const tool = f.tools.find(t => t.name === 'skills.load')!;
            const result = tool.handler({}) as { error: string; hint: string };

            expect(result.error).toBeDefined();
            expect(result.hint).toBeDefined();
        });
    });

    describe('skills.read_file', () => {
        it('returns sanitized error for unknown skill', async () => {
            const f = createStubVurb();
            const registry = registryWith(createSkill());
            createSkillTools(f, registry);

            const tool = f.tools.find(t => t.name === 'skills.read_file')!;
            const result = await tool.handler({ skill_id: 'unknown', file_path: 'foo.txt' }) as { error: string; hint: string };

            expect(result.error).toBeDefined();
            expect(result.hint).toContain('skills.load');
        });

        it('returns sanitized error for path traversal', async () => {
            const f = createStubVurb();
            const registry = registryWith(createSkill());
            createSkillTools(f, registry);

            const tool = f.tools.find(t => t.name === 'skills.read_file')!;
            const result = await tool.handler({ skill_id: 'test-skill', file_path: '../../../etc/passwd' }) as { error: string };

            expect(result.error).toBeDefined();
            // Error message should NOT contain absolute server paths
            expect(result.error).not.toMatch(/[A-Z]:[\\/]/);
        });

        it('returns sanitized error for SKILL.md access', async () => {
            const f = createStubVurb();
            const registry = registryWith(createSkill());
            createSkillTools(f, registry);

            const tool = f.tools.find(t => t.name === 'skills.read_file')!;
            const result = await tool.handler({ skill_id: 'test-skill', file_path: 'SKILL.md' }) as { error: string };

            expect(result.error).toContain('skills.load');
        });

        it('returns sanitized error for empty inputs', async () => {
            const f = createStubVurb();
            const registry = registryWith(createSkill());
            createSkillTools(f, registry);

            const tool = f.tools.find(t => t.name === 'skills.read_file')!;

            const result1 = await tool.handler({ skill_id: '', file_path: 'foo.txt' }) as { error: string };
            expect(result1.error).toBeDefined();

            const result2 = await tool.handler({ skill_id: 'test-skill', file_path: '' }) as { error: string };
            expect(result2.error).toBeDefined();
        });

        it('never exposes absolute server paths in errors', async () => {
            const f = createStubVurb();
            const registry = registryWith(createSkill());
            createSkillTools(f, registry);

            const tool = f.tools.find(t => t.name === 'skills.read_file')!;
            // Try a file that doesn't exist
            const result = await tool.handler({ skill_id: 'test-skill', file_path: 'nonexistent.txt' }) as { error: string };

            expect(result.error).toBeDefined();
            // Must not leak server paths like C:\Users\... or /srv/...
            expect(result.error).not.toMatch(/[A-Z]:[\\/]/i);
            expect(result.error).not.toMatch(/\/srv\//);
        });
    });
});
