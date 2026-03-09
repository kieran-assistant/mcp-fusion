/**
 * Bug #79 — HTTP template async unhandled rejection
 *
 * Verifies that the generated Streamable HTTP server template wraps the
 * async HTTP handler body in try/catch to prevent
 * unhandled rejection crashes from Node's http.createServer.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { serverTs } from '../../src/cli/templates/core.js';
import type { ProjectConfig } from '../../src/cli/types.js';

const sseConfig: ProjectConfig = {
    name: 'test-sse',
    transport: 'sse',
    vector: 'vanilla',
    testing: false,
};

describe('Bug #79 — HTTP template try/catch guard', () => {
    const output = serverTs(sseConfig);

    it('should wrap the createServer async handler in try/catch', () => {
        // The handler must have a try block inside the async callback
        expect(output).toContain('try {');
        expect(output).toContain('} catch');
    });

    it('should emit a catch block that sends 500 when headers not yet sent', () => {
        expect(output).toContain('res.writeHead(500)');
        expect(output).toContain('headersSent');
    });

    it('should log the error to stderr for observability', () => {
        expect(output).toContain('console.error');
    });

    it('should include POST, GET, DELETE, and 404 branches', () => {
        expect(output).toContain("req.method === 'POST'");
        expect(output).toContain("req.method === 'GET'");
        expect(output).toContain("req.method === 'DELETE'");
        expect(output).toContain("res.writeHead(404)");
        expect(output).toContain("res.writeHead(400)");
    });

    it('should use StreamableHTTPServerTransport instead of SSEServerTransport', () => {
        expect(output).toContain('StreamableHTTPServerTransport');
        expect(output).not.toContain('SSEServerTransport');
    });

    it('should NOT have try/catch in stdio template (only HTTP needs it)', () => {
        const stdioConfig: ProjectConfig = {
            name: 'test-stdio',
            transport: 'stdio',
            vector: 'vanilla',
            testing: false,
        };
        const stdioOutput = serverTs(stdioConfig);
        // stdio template uses startServer() — no createServer, no try/catch needed
        expect(stdioOutput).not.toContain('createServer');
    });
});
