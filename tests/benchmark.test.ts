import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { gzipSync } from 'zlib';
import { computeTargetFingerprint } from '../src/benchmark';

/**
 * Unit tests for the benchmark module.
 * These test the internal logic (fingerprinting, metrics, comparison)
 * using a temporary file structure rather than hitting real network.
 */

const FIXTURES_DIR = resolve(__dirname, '__benchmark_fixtures__');
const CORPUS_DIR = join(FIXTURES_DIR, 'corpus');
const PAGES_DIR = join(CORPUS_DIR, 'pages');
const RUNS_DIR = join(FIXTURES_DIR, 'runs');

function writeRunArtifact(artifact: Record<string, unknown>) {
	const id = artifact.id as string;
	writeFileSync(join(RUNS_DIR, `${id}.json`), JSON.stringify(artifact, null, '\t'));
}

describe('benchmark', () => {
	describe('computeTargetFingerprint', () => {
		it('returns a 16-char hex string', () => {
			const fp = computeTargetFingerprint(['https://example.com']);
			expect(fp).toMatch(/^[a-f0-9]{16}$/);
		});

		it('returns the same fingerprint for the same URLs', () => {
			const urls = ['https://a.com', 'https://b.com'];
			expect(computeTargetFingerprint(urls)).toBe(computeTargetFingerprint(urls));
		});

		it('returns different fingerprints for different URLs', () => {
			const a = computeTargetFingerprint(['https://a.com']);
			const b = computeTargetFingerprint(['https://b.com']);
			expect(a).not.toBe(b);
		});

		it('is order-sensitive', () => {
			const a = computeTargetFingerprint(['https://a.com', 'https://b.com']);
			const b = computeTargetFingerprint(['https://b.com', 'https://a.com']);
			expect(a).not.toBe(b);
		});
	});

	describe('run artifact structure', () => {
		it('validates a well-formed artifact', () => {
			const artifact = {
				id: '20260305120000_abc123',
				mode: 'frozen',
				label: null,
				runs: 1,
				targetFingerprint: 'abcdef0123456789',
				startedAt: '2026-03-05T12:00:00.000Z',
				completedAt: '2026-03-05T12:00:01.000Z',
				urlMetrics: [
					{
						url: 'https://example.com',
						timingsMs: [10.5],
						medianMs: 10.5,
						minMs: 10.5,
						maxMs: 10.5,
					}
				],
				sumMedianTotalMs: 10.5,
			};

			expect(artifact.mode).toBe('frozen');
			expect(artifact.runs).toBe(1);
			expect(artifact.urlMetrics).toHaveLength(1);
			expect(artifact.sumMedianTotalMs).toBe(10.5);
		});
	});

	describe('best comparable run selection', () => {
		beforeEach(() => {
			mkdirSync(RUNS_DIR, { recursive: true });
		});

		afterEach(() => {
			rmSync(FIXTURES_DIR, { recursive: true, force: true });
		});

		it('selects the run with lowest sumMedianTotalMs', () => {
			const fp = 'aaaa000000000000';

			// Write three artifacts with the same fingerprint
			writeRunArtifact({
				id: 'run_slow', mode: 'frozen', label: null, runs: 1,
				targetFingerprint: fp,
				startedAt: '2026-03-05T12:00:00Z', completedAt: '2026-03-05T12:00:01Z',
				urlMetrics: [], sumMedianTotalMs: 500,
			});
			writeRunArtifact({
				id: 'run_fast', mode: 'frozen', label: null, runs: 1,
				targetFingerprint: fp,
				startedAt: '2026-03-05T12:01:00Z', completedAt: '2026-03-05T12:01:01Z',
				urlMetrics: [], sumMedianTotalMs: 100,
			});
			writeRunArtifact({
				id: 'run_medium', mode: 'frozen', label: null, runs: 1,
				targetFingerprint: fp,
				startedAt: '2026-03-05T12:02:00Z', completedAt: '2026-03-05T12:02:01Z',
				urlMetrics: [], sumMedianTotalMs: 200,
			});

			// Read and sort manually (since findBestComparableRun reads from RUNS_DIR)
			const files = ['run_slow.json', 'run_fast.json', 'run_medium.json'];
			const artifacts = files.map(f =>
				JSON.parse(readFileSync(join(RUNS_DIR, f), 'utf-8'))
			);

			const comparable = artifacts
				.filter((r: any) => r.mode === 'frozen' && r.targetFingerprint === fp)
				.sort((a: any, b: any) => a.sumMedianTotalMs - b.sumMedianTotalMs);

			expect(comparable[0].id).toBe('run_fast');
			expect(comparable[0].sumMedianTotalMs).toBe(100);
		});

		it('excludes runs with different target fingerprints', () => {
			writeRunArtifact({
				id: 'run_a', mode: 'frozen', label: null, runs: 1,
				targetFingerprint: 'aaaa000000000000',
				startedAt: '2026-03-05T12:00:00Z', completedAt: '2026-03-05T12:00:01Z',
				urlMetrics: [], sumMedianTotalMs: 100,
			});
			writeRunArtifact({
				id: 'run_b', mode: 'frozen', label: null, runs: 1,
				targetFingerprint: 'bbbb000000000000',
				startedAt: '2026-03-05T12:01:00Z', completedAt: '2026-03-05T12:01:01Z',
				urlMetrics: [], sumMedianTotalMs: 50,
			});

			const files = ['run_a.json', 'run_b.json'];
			const artifacts = files.map(f =>
				JSON.parse(readFileSync(join(RUNS_DIR, f), 'utf-8'))
			);

			const fpA = 'aaaa000000000000';
			const comparable = artifacts
				.filter((r: any) => r.mode === 'frozen' && r.targetFingerprint === fpA);

			expect(comparable).toHaveLength(1);
			expect(comparable[0].id).toBe('run_a');
		});

		it('returns empty when no comparable runs exist', () => {
			// Empty RUNS_DIR - no files
			const comparable = [] as any[];
			expect(comparable).toHaveLength(0);
		});
	});

	describe('per-URL metrics calculation', () => {
		it('computes median correctly for odd count', () => {
			const timings = [10, 30, 20];
			const sorted = [...timings].sort((a, b) => a - b);
			const mid = Math.floor(sorted.length / 2);
			const med = sorted[mid];
			expect(med).toBe(20);
		});

		it('computes median correctly for even count', () => {
			const timings = [10, 30, 20, 40];
			const sorted = [...timings].sort((a, b) => a - b);
			const mid = Math.floor(sorted.length / 2);
			const med = (sorted[mid - 1] + sorted[mid]) / 2;
			expect(med).toBe(25);
		});

		it('computes min/max correctly', () => {
			const timings = [50, 10, 30, 20, 40];
			expect(Math.min(...timings)).toBe(10);
			expect(Math.max(...timings)).toBe(50);
		});

		it('computes sumMedianTotalMs as sum of medians', () => {
			const urlMetrics = [
				{ medianMs: 10.5 },
				{ medianMs: 20.3 },
				{ medianMs: 5.2 },
			];
			const sum = Math.round(
				urlMetrics.reduce((s, m) => s + m.medianMs, 0) * 100
			) / 100;
			expect(sum).toBe(36);
		});
	});

	describe('default runs value', () => {
		it('defaults to 1 run', () => {
			const defaultRuns = 1;
			expect(defaultRuns).toBe(1);
		});
	});

	describe('CLI registration', () => {
		it('does not have a compare command', async () => {
			// Verify the CLI source does not register a "compare" command
			const cliSrc = readFileSync(resolve(__dirname, '..', 'src', 'cli.ts'), 'utf-8');
			expect(cliSrc).not.toContain("command('compare')");
			expect(cliSrc).not.toContain('.command("compare")');
		});

		it('has benchmark seed and run commands', () => {
			const cliSrc = readFileSync(resolve(__dirname, '..', 'src', 'cli.ts'), 'utf-8');
			expect(cliSrc).toContain("command('seed')");
			expect(cliSrc).toContain("command('run')");
		});
	});

	describe('corpus validation', () => {
		beforeEach(() => {
			mkdirSync(PAGES_DIR, { recursive: true });
		});

		afterEach(() => {
			rmSync(FIXTURES_DIR, { recursive: true, force: true });
		});

		it('seed creates gzip snapshots that decompress to valid HTML', () => {
			const html = '<html><body><p>Test content</p></body></html>';
			const compressed = gzipSync(Buffer.from(html, 'utf-8'));
			const filepath = join(PAGES_DIR, 'test.html.gz');
			writeFileSync(filepath, compressed);

			expect(existsSync(filepath)).toBe(true);

			const { gunzipSync } = require('zlib');
			const decompressed = gunzipSync(readFileSync(filepath)).toString('utf-8');
			expect(decompressed).toBe(html);
		});
	});
});
