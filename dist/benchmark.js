"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeTargetFingerprint = computeTargetFingerprint;
exports.loadTargets = loadTargets;
exports.seed = seed;
exports.loadManifest = loadManifest;
exports.readSnapshot = readSnapshot;
exports.run = run;
exports.loadAllRuns = loadAllRuns;
exports.findBestComparableRun = findBestComparableRun;
const crypto_1 = require("crypto");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const zlib_1 = require("zlib");
// ANSI color helpers
const useColor = process.stdout.isTTY ?? false;
const ansi = {
    red: (s) => useColor ? `\x1b[31m${s}\x1b[39m` : s,
    green: (s) => useColor ? `\x1b[32m${s}\x1b[39m` : s,
    yellow: (s) => useColor ? `\x1b[33m${s}\x1b[39m` : s,
    cyan: (s) => useColor ? `\x1b[36m${s}\x1b[39m` : s,
    dim: (s) => useColor ? `\x1b[2m${s}\x1b[22m` : s,
    bold: (s) => useColor ? `\x1b[1m${s}\x1b[22m` : s,
};
// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const BENCHMARKS_DIR = (0, path_1.resolve)(__dirname, '..', 'benchmarks');
const CORPUS_DIR = (0, path_1.join)(BENCHMARKS_DIR, 'corpus');
const PAGES_DIR = (0, path_1.join)(CORPUS_DIR, 'pages');
const RUNS_DIR = (0, path_1.join)(BENCHMARKS_DIR, 'runs');
const MANIFEST_PATH = (0, path_1.join)(CORPUS_DIR, 'manifest.json');
const TARGETS_PATH = (0, path_1.join)(BENCHMARKS_DIR, 'targets.default.json');
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sha256hex(data) {
    return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
}
function snapshotFilename(url) {
    return sha256hex(url) + '.html.gz';
}
function computeTargetFingerprint(urls) {
    return sha256hex(urls.join('\n')).slice(0, 16);
}
function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}
function generateRunId() {
    const now = new Date();
    const ts = now.toISOString().replace(/[-:T]/g, '').replace(/\.\d+Z/, '');
    const rand = Math.random().toString(36).slice(2, 8);
    return `${ts}_${rand}`;
}
function formatMs(ms) {
    return ms.toFixed(2) + 'ms';
}
function formatDelta(current, best) {
    const diff = current - best;
    const pct = best > 0 ? ((diff / best) * 100).toFixed(1) : '0.0';
    if (diff > 0) {
        return ansi.red(`+${formatMs(diff)} (+${pct}%)`);
    }
    else if (diff < 0) {
        return ansi.green(`${formatMs(diff)} (${pct}%)`);
    }
    return ansi.dim('same');
}
async function fetchHtml(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    return response.text();
}
// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
async function loadTargets() {
    const raw = await (0, promises_1.readFile)(TARGETS_PATH, 'utf-8');
    return JSON.parse(raw);
}
async function seed(options = {}) {
    const targets = await loadTargets();
    let existingManifest = null;
    try {
        const raw = await (0, promises_1.readFile)(MANIFEST_PATH, 'utf-8');
        existingManifest = JSON.parse(raw);
    }
    catch {
        // no manifest yet
    }
    await (0, promises_1.mkdir)(PAGES_DIR, { recursive: true });
    const entries = [];
    for (const url of targets) {
        const filename = snapshotFilename(url);
        const filepath = (0, path_1.join)(PAGES_DIR, filename);
        // Skip if already fetched and not forcing
        if (!options.force && existingManifest) {
            const existing = existingManifest.entries.find(e => e.url === url);
            if (existing) {
                try {
                    await (0, promises_1.stat)(filepath);
                    console.log(ansi.dim(`  skip: ${url}`));
                    entries.push(existing);
                    continue;
                }
                catch {
                    // file missing, re-fetch
                }
            }
        }
        console.log(`  fetch: ${url}`);
        const html = await fetchHtml(url);
        const htmlBytes = new Uint8Array(Buffer.from(html, 'utf-8'));
        const compressed = (0, zlib_1.gzipSync)(htmlBytes);
        await (0, promises_1.writeFile)(filepath, compressed);
        entries.push({
            url,
            sha256: sha256hex(html),
            fetchedAt: new Date().toISOString(),
            sizeBytes: htmlBytes.length,
        });
        console.log(ansi.green(`  saved: ${filename} (${(htmlBytes.length / 1024).toFixed(1)} KB)`));
    }
    const manifest = { version: 1, entries };
    await (0, promises_1.writeFile)(MANIFEST_PATH, JSON.stringify(manifest, null, '\t'), 'utf-8');
    console.log(ansi.green(`\nManifest written with ${entries.length} entries.`));
}
// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
async function loadManifest() {
    try {
        const raw = await (0, promises_1.readFile)(MANIFEST_PATH, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        throw new Error('Corpus manifest not found. Run `defuddle benchmark seed` first.');
    }
}
async function readSnapshot(url) {
    const filename = snapshotFilename(url);
    const filepath = (0, path_1.join)(PAGES_DIR, filename);
    try {
        const compressed = await (0, promises_1.readFile)(filepath);
        return (0, zlib_1.gunzipSync)(new Uint8Array(compressed)).toString('utf-8');
    }
    catch {
        throw new Error(`Snapshot missing for ${url}. Run \`defuddle benchmark seed\` first.`);
    }
}
async function run(options) {
    const runs = options.runs ?? 1;
    const label = options.label ?? null;
    const manifest = await loadManifest();
    const targets = manifest.entries.map(e => e.url);
    const targetFingerprint = computeTargetFingerprint(targets);
    // Validate corpus completeness
    for (const entry of manifest.entries) {
        const filename = snapshotFilename(entry.url);
        const filepath = (0, path_1.join)(PAGES_DIR, filename);
        try {
            await (0, promises_1.stat)(filepath);
        }
        catch {
            throw new Error(`Corpus incomplete: missing snapshot for ${entry.url}. Run \`defuddle benchmark seed\` first.`);
        }
    }
    const { Defuddle } = await Promise.resolve().then(() => __importStar(require('./node')));
    const startedAt = new Date().toISOString();
    const urlMetrics = [];
    console.log(ansi.bold(`\nBenchmark: ${runs} run(s), ${targets.length} target(s)\n`));
    for (const url of targets) {
        const html = await readSnapshot(url);
        const timings = [];
        for (let i = 0; i < runs; i++) {
            const t0 = performance.now();
            await Defuddle(html, url);
            const t1 = performance.now();
            timings.push(t1 - t0);
        }
        const metrics = {
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
    const sumMedianTotalMs = Math.round(urlMetrics.reduce((sum, m) => sum + m.medianMs, 0) * 100) / 100;
    const completedAt = new Date().toISOString();
    const runId = generateRunId();
    const artifact = {
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
    await (0, promises_1.mkdir)(RUNS_DIR, { recursive: true });
    const artifactPath = (0, path_1.join)(RUNS_DIR, `${runId}.json`);
    await (0, promises_1.writeFile)(artifactPath, JSON.stringify(artifact, null, '\t'), 'utf-8');
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
    }
    else {
        console.log(ansi.yellow('\n  Baseline initialized (no prior comparable run).'));
    }
    console.log(ansi.dim(`\n  Saved: ${artifactPath}`));
    return artifact;
}
// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------
async function loadAllRuns() {
    try {
        const files = await (0, promises_1.readdir)(RUNS_DIR);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        const runs = [];
        for (const f of jsonFiles) {
            const raw = await (0, promises_1.readFile)((0, path_1.join)(RUNS_DIR, f), 'utf-8');
            runs.push(JSON.parse(raw));
        }
        return runs;
    }
    catch {
        return [];
    }
}
async function findBestComparableRun(targetFingerprint, excludeId) {
    const allRuns = await loadAllRuns();
    const comparable = allRuns.filter(r => r.mode === 'frozen' &&
        r.targetFingerprint === targetFingerprint &&
        r.id !== excludeId);
    if (comparable.length === 0)
        return null;
    comparable.sort((a, b) => a.sumMedianTotalMs - b.sumMedianTotalMs);
    return comparable[0];
}
//# sourceMappingURL=benchmark.js.map