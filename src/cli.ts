#!/usr/bin/env node

import { Command } from 'commander';
import { Defuddle } from './node';
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { seed, run } from './benchmark';

interface ParseOptions {
	output?: string;
	markdown?: boolean;
	md?: boolean;
	json?: boolean;
	debug?: boolean;
	property?: string;
}

// ANSI color helpers (avoids chalk dependency which is ESM-only)
const useColor = process.stdout.isTTY ?? false;
const ansi = {
	red: (s: string) => useColor ? `\x1b[31m${s}\x1b[39m` : s,
	green: (s: string) => useColor ? `\x1b[32m${s}\x1b[39m` : s,
};

function isHttpUrl(source: string): boolean {
	return source.startsWith('http://') || source.startsWith('https://');
}

async function fetchHtml(url: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
	}
	return response.text();
}

// Read version from package.json
const version = require('../package.json').version;

const program = new Command();

program
	.name('defuddle')
	.description('Extract article content from web pages')
	.version(version);

program
	.command('parse')
	.description('Parse HTML content from a file or URL')
	.argument('<source>', 'HTML file path or URL to parse')
	.option('-o, --output <file>', 'Output file path (default: stdout)')
	.option('-m, --markdown', 'Convert content to markdown format')
	.option('--md', 'Alias for --markdown')
	.option('-j, --json', 'Output as JSON with metadata and content')
	.option('-p, --property <name>', 'Extract a specific property (e.g., title, description, domain)')
	.option('--debug', 'Enable debug mode')
	.action(async (source: string, options: ParseOptions) => {
		try {
			// Handle --md alias
			if (options.md) {
				options.markdown = true;
			}

			const sourceUrl = isHttpUrl(source) ? source : undefined;
			let html: string;
			if (sourceUrl) {
				html = await fetchHtml(sourceUrl);
			} else {
				const filePath = resolve(process.cwd(), source);
				html = await readFile(filePath, 'utf-8');
			}

			const result = await Defuddle(html, sourceUrl, {
				debug: options.debug,
				markdown: options.markdown
			});

			// Format output
			let output: string;

			if (options.property) {
				const property = options.property;
				if (property in result) {
					output = result[property as keyof typeof result]?.toString() || '';
				} else {
					console.error(ansi.red(`Error: Property "${property}" not found in response`));
					process.exit(1);
				}
			} else if (options.json) {
				output = JSON.stringify({
					content: result.content,
					title: result.title,
					description: result.description,
					domain: result.domain,
					favicon: result.favicon,
					image: result.image,
					metaTags: result.metaTags,
					parseTime: result.parseTime,
					published: result.published,
					author: result.author,
					site: result.site,
					schemaOrgData: result.schemaOrgData,
					wordCount: result.wordCount
				}, null, 2);
			} else {
				output = result.content;
			}

			// Handle output
			if (options.output) {
				const outputPath = resolve(process.cwd(), options.output);
				await writeFile(outputPath, output, 'utf-8');
				console.log(ansi.green(`Output written to ${options.output}`));
			} else {
				console.log(output);
			}
		} catch (error) {
			console.error(ansi.red('Error:'), error instanceof Error ? error.message : 'Unknown error occurred');
			process.exit(1);
		}
	});

// Benchmark commands
const benchmark = program
	.command('benchmark')
	.description('Benchmark Defuddle against a frozen corpus of HTML snapshots');

benchmark
	.command('seed')
	.description('Fetch and store HTML snapshots for benchmark targets')
	.option('--force', 'Re-fetch all snapshots even if they already exist')
	.action(async (options: { force?: boolean }) => {
		try {
			console.log(options.force ? 'Seeding corpus (force refresh)...' : 'Seeding corpus...');
			await seed({ force: options.force });
		} catch (error) {
			console.error(ansi.red('Error:'), error instanceof Error ? error.message : 'Unknown error occurred');
			process.exit(1);
		}
	});

benchmark
	.command('run')
	.description('Run benchmark against the frozen corpus')
	.option('--runs <n>', 'Number of iterations per URL', '1')
	.option('--label <text>', 'Optional label for this run')
	.action(async (options: { runs: string; label?: string }) => {
		try {
			await run({
				runs: parseInt(options.runs, 10),
				label: options.label ?? null,
			});
		} catch (error) {
			console.error(ansi.red('Error:'), error instanceof Error ? error.message : 'Unknown error occurred');
			process.exit(1);
		}
	});

program.parse();
