#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const node_1 = require("./node");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const benchmark_1 = require("./benchmark");
// ANSI color helpers (avoids chalk dependency which is ESM-only)
const useColor = process.stdout.isTTY ?? false;
const ansi = {
    red: (s) => useColor ? `\x1b[31m${s}\x1b[39m` : s,
    green: (s) => useColor ? `\x1b[32m${s}\x1b[39m` : s,
};
function isHttpUrl(source) {
    return source.startsWith('http://') || source.startsWith('https://');
}
async function fetchHtml(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    return response.text();
}
// Read version from package.json
const version = require('../package.json').version;
const program = new commander_1.Command();
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
    .action(async (source, options) => {
    try {
        // Handle --md alias
        if (options.md) {
            options.markdown = true;
        }
        const sourceUrl = isHttpUrl(source) ? source : undefined;
        let html;
        if (sourceUrl) {
            html = await fetchHtml(sourceUrl);
        }
        else {
            const filePath = (0, path_1.resolve)(process.cwd(), source);
            html = await (0, promises_1.readFile)(filePath, 'utf-8');
        }
        const result = await (0, node_1.Defuddle)(html, sourceUrl, {
            debug: options.debug,
            markdown: options.markdown
        });
        // Format output
        let output;
        if (options.property) {
            const property = options.property;
            if (property in result) {
                output = result[property]?.toString() || '';
            }
            else {
                console.error(ansi.red(`Error: Property "${property}" not found in response`));
                process.exit(1);
            }
        }
        else if (options.json) {
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
        }
        else {
            output = result.content;
        }
        // Handle output
        if (options.output) {
            const outputPath = (0, path_1.resolve)(process.cwd(), options.output);
            await (0, promises_1.writeFile)(outputPath, output, 'utf-8');
            console.log(ansi.green(`Output written to ${options.output}`));
        }
        else {
            console.log(output);
        }
    }
    catch (error) {
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
    .action(async (options) => {
    try {
        console.log(options.force ? 'Seeding corpus (force refresh)...' : 'Seeding corpus...');
        await (0, benchmark_1.seed)({ force: options.force });
    }
    catch (error) {
        console.error(ansi.red('Error:'), error instanceof Error ? error.message : 'Unknown error occurred');
        process.exit(1);
    }
});
benchmark
    .command('run')
    .description('Run benchmark against the frozen corpus')
    .option('--runs <n>', 'Number of iterations per URL', '1')
    .option('--label <text>', 'Optional label for this run')
    .action(async (options) => {
    try {
        await (0, benchmark_1.run)({
            runs: parseInt(options.runs, 10),
            label: options.label ?? null,
        });
    }
    catch (error) {
        console.error(ansi.red('Error:'), error instanceof Error ? error.message : 'Unknown error occurred');
        process.exit(1);
    }
});
program.parse();
//# sourceMappingURL=cli.js.map