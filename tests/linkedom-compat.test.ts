import { describe, test, expect } from 'vitest';
import { Defuddle } from '../src/node';

/**
 * Linkedom compatibility tests.
 *
 * Verify that the Node path works correctly with linkedom's limited
 * DOM implementation — specifically around missing styleSheets and
 * getComputedStyle capabilities.
 */

describe('Linkedom Compatibility', () => {
	test('parses without throwing when styleSheets is absent', async () => {
		const html = `
			<html>
				<head><title>No Stylesheets</title></head>
				<body><article><p>Hello world</p></article></body>
			</html>`;
		const result = await Defuddle(html);
		expect(result.content.length).toBeGreaterThan(0);
		expect(result.title).toBe('No Stylesheets');
	});

	test('parses without throwing when computed-style APIs are missing', async () => {
		const html = `
			<html>
				<head>
					<title>Style Test</title>
					<style>
						.hidden { display: none; }
						@media (max-width: 800px) {
							.mobile-only { display: block; }
						}
					</style>
				</head>
				<body>
					<article>
						<p>Visible content</p>
						<div class="hidden">Hidden content</div>
					</article>
				</body>
			</html>`;
		const result = await Defuddle(html);
		expect(result.content.length).toBeGreaterThan(0);
		expect(result.content).toContain('Visible content');
	});

	test('extracts table content correctly', async () => {
		const html = `
			<html>
				<head><title>Table Test</title></head>
				<body>
					<article>
						<table>
							<thead>
								<tr><th>Name</th><th>Value</th></tr>
							</thead>
							<tbody>
								<tr><td>Alpha</td><td>100</td></tr>
								<tr><td>Beta</td><td>200</td></tr>
							</tbody>
						</table>
					</article>
				</body>
			</html>`;
		const result = await Defuddle(html);
		expect(result.content).toContain('Alpha');
		expect(result.content).toContain('Beta');
		expect(result.content).toContain('<table');
	});

	test('extracts code blocks correctly', async () => {
		const html = `
			<html>
				<head><title>Code Test</title></head>
				<body>
					<article>
						<p>Example code:</p>
						<pre><code class="language-js">function hello() {
	return "world";
}</code></pre>
					</article>
				</body>
			</html>`;
		const result = await Defuddle(html);
		expect(result.content).toContain('<pre');
		expect(result.content).toContain('<code');
		expect(result.content).toContain('function hello');
	});

	test('extracts images with captions', async () => {
		const html = `
			<html>
				<head><title>Image Test</title></head>
				<body>
					<article>
						<figure>
							<img src="photo.jpg" alt="A nice photo" width="800" height="600">
							<figcaption>A nice photo caption</figcaption>
						</figure>
						<p>Some text below the image.</p>
					</article>
				</body>
			</html>`;
		const result = await Defuddle(html);
		expect(result.content).toContain('<img');
		expect(result.content).toContain('photo.jpg');
		expect(result.content).toContain('A nice photo caption');
	});

	test('resolves relative URLs when url is provided', async () => {
		const html = `
			<html>
				<head><title>URL Test</title></head>
				<body>
					<article>
						<a href="/about">About</a>
						<img src="/images/logo.png" alt="Logo" width="200" height="100">
					</article>
				</body>
			</html>`;
		const result = await Defuddle(html, 'https://example.com/page');
		expect(result.content).toContain('https://example.com/about');
		expect(result.content).toContain('https://example.com/images/logo.png');
	});

	test('handles markdown conversion', async () => {
		const html = `
			<html>
				<head><title>Markdown Test</title></head>
				<body>
					<article>
						<h2>Heading</h2>
						<p>Paragraph with <strong>bold</strong> and <em>italic</em>.</p>
						<ul>
							<li>Item one</li>
							<li>Item two</li>
						</ul>
					</article>
				</body>
			</html>`;
		const result = await Defuddle(html, undefined, { markdown: true });
		expect(result.content).toContain('## Heading');
		expect(result.content).toContain('**bold**');
	});
});
