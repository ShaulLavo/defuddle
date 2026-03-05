import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, basename, extname } from 'path';
import { Defuddle } from '../src/node';

/**
 * Semantic quality tests for extraction fidelity.
 *
 * These assertions detect meaningful extraction regressions that
 * fixture-diff comparisons alone may miss (e.g. content that disappears
 * or gains garbage text). Run via `npm run quality:semantic`.
 */

async function parseFixture(fixtureName: string) {
	const fixturesDir = join(__dirname, 'fixtures');
	const filePath = join(fixturesDir, fixtureName + '.html');
	const html = readFileSync(filePath, 'utf-8');
	const url = `https://${fixtureName.replace(/:/g, '/')}`;
	return Defuddle(html, url, { separateMarkdown: true });
}

describe('Semantic Quality Gate', () => {
	describe('daringfireball.net:2025:02:the_iphone_16e', () => {
		let md: string;
		beforeAll(async () => {
			const result = await parseFixture('daringfireball.net:2025:02:the_iphone_16e');
			md = result.contentMarkdown ?? '';
		});

		test('CSS table-class leakage text is absent', () => {
			expect(md).not.toMatch(/\.table-/);
		});

		test('markdown table header row exists', () => {
			expect(md).toMatch(/\| --- \|/);
		});

		test('table contains iPhone model data', () => {
			expect(md).toContain('iPhone 16e');
			expect(md).toContain('A18');
		});
	});

	describe('rehype-pretty-code', () => {
		let md: string;
		beforeAll(async () => {
			const result = await parseFixture('rehype-pretty-code');
			md = result.contentMarkdown ?? '';
		});

		test('fenced fish code block exists', () => {
			expect(md).toContain('```fish');
		});
	});

	describe('rockthejvm.com:articles:kotlin-101-type-classes', () => {
		let md: string;
		beforeAll(async () => {
			const result = await parseFixture('rockthejvm.com:articles:kotlin-101-type-classes');
			md = result.contentMarkdown ?? '';
		});

		test('Kotlin fenced code blocks exist', () => {
			expect(md).toContain('```kotlin');
		});
	});

	describe('12gramsofcarbon.com:p:ilyas-30-papers-to-carmack-vlaes', () => {
		let md: string;
		beforeAll(async () => {
			const result = await parseFixture('12gramsofcarbon.com:p:ilyas-30-papers-to-carmack-vlaes');
			md = result.contentMarkdown ?? '';
		});

		test('key image markdown entries are retained', () => {
			// At least some images should be present in markdown
			expect(md).toMatch(/!\[.*\]\(.*substackcdn\.com/);
		});
	});

	describe('lesswrong.com:s:N7nDePaNabJdnbXeE:p:vJFdjigzmcXMhNTsx', () => {
		let md: string;
		beforeAll(async () => {
			const result = await parseFixture('lesswrong.com:s:N7nDePaNabJdnbXeE:p:vJFdjigzmcXMhNTsx');
			md = result.contentMarkdown ?? '';
		});

		test('comparison table section exists', () => {
			expect(md).toMatch(/\| --- \|/);
			expect(md).toContain('Self-supervised');
		});
	});

	describe('obsidian.md:blog:verify-obsidian-sync-encryption', () => {
		let md: string;
		beforeAll(async () => {
			const result = await parseFixture('obsidian.md:blog:verify-obsidian-sync-encryption');
			md = result.contentMarkdown ?? '';
		});

		test('whitespace-joined words are not regressed on key phrases', () => {
			expect(md).toContain('this statement');
			expect(md).toContain('maximum security');
			expect(md).toContain('encryption works');
		});
	});
});
