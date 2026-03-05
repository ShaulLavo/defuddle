import { createHash } from 'crypto';
import { readFile, writeFile, mkdir, readdir, stat } from 'fs/promises';
import { Window } from 'happy-dom';
import { resolve, join } from 'path';
import { gzipSync, gunzipSync } from 'zlib';

// ANSI color helpers
const useColor = process.stdout.isTTY ?? false;
const ansi = {
	red: (s: string) => useColor ? `\x1b[31m${s}\x1b[39m` : s,
	green: (s: string) => useColor ? `\x1b[32m${s}\x1b[39m` : s,
	yellow: (s: string) => useColor ? `\x1b[33m${s}\x1b[39m` : s,
	cyan: (s: string) => useColor ? `\x1b[36m${s}\x1b[39m` : s,
	dim: (s: string) => useColor ? `\x1b[2m${s}\x1b[22m` : s,
	bold: (s: string) => useColor ? `\x1b[1m${s}\x1b[22m` : s,
};

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const BENCHMARKS_DIR = resolve(__dirname, '..', 'benchmarks');
const CORPUS_DIR = join(BENCHMARKS_DIR, 'corpus');
const PAGES_DIR = join(CORPUS_DIR, 'pages');
const RUNS_DIR = join(BENCHMARKS_DIR, 'runs');
const MANIFEST_PATH = join(CORPUS_DIR, 'manifest.json');
const TARGETS_PATH = join(BENCHMARKS_DIR, 'targets.default.json');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ManifestEntry {
	url: string;
	sha256: string;
	fetchedAt: string;
	sizeBytes: number;
}

export interface Manifest {
	version: 1;
	entries: ManifestEntry[];
}

export interface UrlMetrics {
	url: string;
	timingsMs: number[];
	medianMs: number;
	minMs: number;
	maxMs: number;
}

export interface RunArtifact {
	id: string;
	mode: 'frozen';
	label: string | null;
	runs: number;
	targetFingerprint: string;
	startedAt: string;
	completedAt: string;
	urlMetrics: UrlMetrics[];
	sumMedianTotalMs: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256hex(data: string): string {
	return createHash('sha256').update(data).digest('hex');
}

function snapshotFilename(url: string): string {
	return sha256hex(url) + '.html.gz';
}

export function computeTargetFingerprint(urls: string[]): string {
	return sha256hex(urls.join('\n')).slice(0, 16);
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0
		? sorted[mid]
		: (sorted[mid - 1] + sorted[mid]) / 2;
}

function generateRunId(): string {
	const now = new Date();
	const ts = now.toISOString().replace(/[-:T]/g, '').replace(/\.\d+Z/, '');
	const rand = Math.random().toString(36).slice(2, 8);
	return `${ts}_${rand}`;
}

function formatMs(ms: number): string {
	return ms.toFixed(2) + 'ms';
}

function formatDelta(current: number, best: number): string {
	const diff = current - best;
	const pct = best > 0 ? ((diff / best) * 100).toFixed(1) : '0.0';
	if (diff > 0) {
		return ansi.red(`+${formatMs(diff)} (+${pct}%)`);
	} else if (diff < 0) {
		return ansi.green(`${formatMs(diff)} (${pct}%)`);
	}
	return ansi.dim('same');
}

async function fetchHtml(url: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
	}
	return response.text();
}

function createWindow(html: string, url: string): Window {
	const window = new Window({ url });
	window.document.write(html);
	window.document.close();
	return window;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

export async function loadTargets(): Promise<string[]> {
	const raw = await readFile(TARGETS_PATH, 'utf-8');
	return JSON.parse(raw) as string[];
}

export async function seed(options: { force?: boolean } = {}): Promise<void> {
	const targets = await loadTargets();

	let existingManifest: Manifest | null = null;
	try {
		const raw = await readFile(MANIFEST_PATH, 'utf-8');
		existingManifest = JSON.parse(raw) as Manifest;
	} catch {
		// no manifest yet
	}

	await mkdir(PAGES_DIR, { recursive: true });

	const entries: ManifestEntry[] = [];

	for (const url of targets) {
		const filename = snapshotFilename(url);
		const filepath = join(PAGES_DIR, filename);

		// Skip if already fetched and not forcing
		if (!options.force && existingManifest) {
			const existing = existingManifest.entries.find(e => e.url === url);
			if (existing) {
				try {
					await stat(filepath);
					console.log(ansi.dim(`  skip: ${url}`));
					entries.push(existing);
					continue;
				} catch {
					// file missing, re-fetch
				}
			}
		}

		console.log(`  fetch: ${url}`);

		const html = await fetchHtml(url);
		const htmlBytes = new Uint8Array(Buffer.from(html, 'utf-8'));
		const compressed = gzipSync(htmlBytes);

		await writeFile(filepath, compressed);

		entries.push({
			url,
			sha256: sha256hex(html),
			fetchedAt: new Date().toISOString(),
			sizeBytes: htmlBytes.length,
		});

		console.log(ansi.green(`  saved: ${filename} (${(htmlBytes.length / 1024).toFixed(1)} KB)`));
	}

	const manifest: Manifest = { version: 1, entries };
	await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, '\t'), 'utf-8');
	console.log(ansi.green(`\nManifest written with ${entries.length} entries.`));
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

export async function loadManifest(): Promise<Manifest> {
	try {
		const raw = await readFile(MANIFEST_PATH, 'utf-8');
		return JSON.parse(raw) as Manifest;
	} catch {
		throw new Error(
			'Corpus manifest not found. Run `defuddle benchmark seed` first.'
		);
	}
}

export async function readSnapshot(url: string): Promise<string> {
	const filename = snapshotFilename(url);
	const filepath = join(PAGES_DIR, filename);
	try {
		const compressed = await readFile(filepath);
		return gunzipSync(new Uint8Array(compressed)).toString('utf-8');
	} catch {
		throw new Error(
			`Snapshot missing for ${url}. Run \`defuddle benchmark seed\` first.`
		);
	}
}

export async function run(options: {
	runs?: number;
	label?: string | null;
}): Promise<RunArtifact> {
	const runs = options.runs ?? 1;
	const label = options.label ?? null;

	const manifest = await loadManifest();
	const targets = manifest.entries.map(e => e.url);
	const targetFingerprint = computeTargetFingerprint(targets);

	// Validate corpus completeness
	for (const entry of manifest.entries) {
		const filename = snapshotFilename(entry.url);
		const filepath = join(PAGES_DIR, filename);
		try {
			await stat(filepath);
		} catch {
			throw new Error(
				`Corpus incomplete: missing snapshot for ${entry.url}. Run \`defuddle benchmark seed\` first.`
			);
		}
	}

	const { Defuddle } = await import('./node');

	const startedAt = new Date().toISOString();
	const urlMetrics: UrlMetrics[] = [];

	console.log(ansi.bold(`\nBenchmark: ${runs} run(s), ${targets.length} target(s)\n`));

	for (const url of targets) {
		const html = await readSnapshot(url);
		const timings: number[] = [];

		for (let i = 0; i < runs; i++) {
			const window = createWindow(html, url);
			const t0 = performance.now();
			await Defuddle(window, url);
			const t1 = performance.now();
			timings.push(t1 - t0);
		}

		const metrics: UrlMetrics = {
			url,
			timingsMs: timings.map(t => Math.round(t * 100) / 100),
			medianMs: Math.round(median(timings) * 100) / 100,
			minMs: Math.round(Math.min(...timings) * 100) / 100,
			maxMs: Math.round(Math.max(...timings) * 100) / 100,
		};
		urlMetrics.push(metrics);

		const timingStr = runs === 1
			? formatMs(metrics.medianMs)
			: `median=${formatMs(metrics.medianMs)} min=${formatMs(metrics.minMs)} max=${formatMs(metrics.maxMs)}`;
		console.log(`  ${ansi.cyan(url)}`);
		console.log(`    ${timingStr}`);
	}

	const sumMedianTotalMs = Math.round(
		urlMetrics.reduce((sum, m) => sum + m.medianMs, 0) * 100
	) / 100;

	const completedAt = new Date().toISOString();
	const runId = generateRunId();

	const artifact: RunArtifact = {
		id: runId,
		mode: 'frozen',
		label,
		runs,
		targetFingerprint,
		startedAt,
		completedAt,
		urlMetrics,
		sumMedianTotalMs,
	};

	// Save artifact
	await mkdir(RUNS_DIR, { recursive: true });
	const artifactPath = join(RUNS_DIR, `${runId}.json`);
	await writeFile(artifactPath, JSON.stringify(artifact, null, '\t'), 'utf-8');

	// Print totals
	console.log(ansi.bold(`\n  Total: ${formatMs(sumMedianTotalMs)}`));

	// Auto-compare vs best
	const bestRun = await findBestComparableRun(targetFingerprint, runId);
	if (bestRun) {
		console.log(ansi.bold(`\n  vs best (${bestRun.id}):`));
		console.log(`    Total: ${formatDelta(sumMedianTotalMs, bestRun.sumMedianTotalMs)}`);

		// Per-URL deltas
		for (const m of urlMetrics) {
			const bestUrl = bestRun.urlMetrics.find(bm => bm.url === m.url);
			if (bestUrl) {
				console.log(`    ${ansi.dim(m.url)}`);
				console.log(`      ${formatDelta(m.medianMs, bestUrl.medianMs)}`);
			}
		}
	} else {
		console.log(ansi.yellow('\n  Baseline initialized (no prior comparable run).'));
	}

	console.log(ansi.dim(`\n  Saved: ${artifactPath}`));

	return artifact;
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

export async function loadAllRuns(): Promise<RunArtifact[]> {
	try {
		const files = await readdir(RUNS_DIR);
		const jsonFiles = files.filter(f => f.endsWith('.json'));
		const runs: RunArtifact[] = [];
		for (const f of jsonFiles) {
			const raw = await readFile(join(RUNS_DIR, f), 'utf-8');
			runs.push(JSON.parse(raw) as RunArtifact);
		}
		return runs;
	} catch {
		return [];
	}
}

export async function findBestComparableRun(
	targetFingerprint: string,
	excludeId?: string
): Promise<RunArtifact | null> {
	const allRuns = await loadAllRuns();
	const comparable = allRuns.filter(
		r =>
			r.mode === 'frozen' &&
			r.targetFingerprint === targetFingerprint &&
			r.id !== excludeId
	);
	if (comparable.length === 0) return null;

	comparable.sort((a, b) => a.sumMedianTotalMs - b.sumMedianTotalMs);
	return comparable[0];
}
