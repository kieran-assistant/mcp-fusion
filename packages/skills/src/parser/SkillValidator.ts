/**
 * SkillValidator — Agent Skills Specification Compliance
 *
 * Validates SKILL.md frontmatter against the agentskills.io specification.
 * Returns structured validation results with warnings for non-critical issues.
 *
 * @see https://agentskills.io/specification
 * @module
 */

import { type SkillFrontmatter } from '../domain/Skill.js';

// ── Types ────────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
    readonly field: string;
    readonly severity: ValidationSeverity;
    readonly message: string;
}

export interface ValidationResult {
    readonly valid: boolean;
    readonly issues: readonly ValidationIssue[];
}

// ── Name Rules ───────────────────────────────────────────

const NAME_MIN_LENGTH = 1;
const NAME_MAX_LENGTH = 64;
const NAME_PATTERN = /^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/;
const CONSECUTIVE_HYPHEN = /--/;

// ── Description Rules ────────────────────────────────────

const DESC_MIN_LENGTH = 1;
const DESC_MAX_LENGTH = 1024;

// ── Compatibility Rules ──────────────────────────────────

const COMPAT_MAX_LENGTH = 500;

// ── Validator ────────────────────────────────────────────

/**
 * Validate a skill's frontmatter against the Agent Skills specification.
 *
 * @param fm - Parsed frontmatter
 * @param dirName - Directory name (should match `name` field)
 * @returns Validation result with issues
 */
export function validateSkill(fm: SkillFrontmatter, dirName?: string): ValidationResult {
    const issues: ValidationIssue[] = [];

    // ── Name Validation ──
    if (fm.name.length < NAME_MIN_LENGTH) {
        issues.push({ field: 'name', severity: 'error', message: 'Name must not be empty' });
    } else if (fm.name.length > NAME_MAX_LENGTH) {
        issues.push({ field: 'name', severity: 'error', message: `Name must be ≤${NAME_MAX_LENGTH} characters (got ${fm.name.length})` });
    } else {
        if (!NAME_PATTERN.test(fm.name)) {
            issues.push({ field: 'name', severity: 'error', message: 'Name must contain only lowercase alphanumeric characters and hyphens (a-z, 0-9, -)' });
        }
        if (CONSECUTIVE_HYPHEN.test(fm.name)) {
            issues.push({ field: 'name', severity: 'error', message: 'Name must not contain consecutive hyphens (--)' });
        }
        if (fm.name.startsWith('-') || fm.name.endsWith('-')) {
            issues.push({ field: 'name', severity: 'error', message: 'Name must not start or end with a hyphen' });
        }
    }

    // ── Directory Name Match (spec: "Must match the parent directory name") ──
    if (dirName !== undefined && dirName !== fm.name) {
        issues.push({ field: 'name', severity: 'error', message: `Name "${fm.name}" must match directory name "${dirName}"` });
    }

    // ── Description Validation ──
    if (fm.description.length < DESC_MIN_LENGTH) {
        issues.push({ field: 'description', severity: 'error', message: 'Description must not be empty' });
    } else if (fm.description.length > DESC_MAX_LENGTH) {
        issues.push({ field: 'description', severity: 'warning', message: `Description exceeds recommended ${DESC_MAX_LENGTH} characters (got ${fm.description.length})` });
    }

    // ── Compatibility Validation ──
    if (fm.compatibility !== undefined && fm.compatibility.length > COMPAT_MAX_LENGTH) {
        issues.push({ field: 'compatibility', severity: 'warning', message: `Compatibility exceeds recommended ${COMPAT_MAX_LENGTH} characters` });
    }

    return {
        valid: issues.every(i => i.severity !== 'error'),
        issues,
    };
}

/**
 * Format validation issues as human-readable log lines.
 *
 * @param skillId - Skill identifier for context
 * @param result - Validation result
 * @returns Formatted lines (empty array if no issues)
 */
export function formatValidationIssues(skillId: string, result: ValidationResult): string[] {
    return result.issues.map(issue => {
        const icon = issue.severity === 'error' ? '✗' : '⚠';
        return `[${icon}] ${skillId} → ${issue.field}: ${issue.message}`;
    });
}
