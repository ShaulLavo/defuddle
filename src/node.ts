import { Window } from 'happy-dom';
import DefuddleClass from './index';
import type { DefuddleOptions, DefuddleResponse } from './types';
import { toMarkdown } from './markdown';

interface DocumentLike {
	nodeType?: number;
	createElement?: (...args: any[]) => unknown;
	location?: {
		href?: string;
	};
	URL?: string;
}

interface WindowLike {
	document: DocumentLike;
	location?: {
		href?: string;
	};
}

interface DomLike {
	window: WindowLike;
}

function isDomLike(value: unknown): value is DomLike {
	if (!value || typeof value !== 'object') return false;
	const maybeDom = value as Partial<DomLike>;
	return !!maybeDom.window && !!maybeDom.window.document;
}

function isWindowLike(value: unknown): value is WindowLike {
	if (!value || typeof value !== 'object') return false;
	const maybeWindow = value as Partial<WindowLike>;
	return !!maybeWindow.document;
}

function isDocument(value: unknown): value is DocumentLike {
	if (!value || typeof value !== 'object') return false;
	const maybeDoc = value as DocumentLike;
	return maybeDoc.nodeType === 9 && typeof maybeDoc.createElement === 'function';
}

function createWindow(html: string, url?: string): Window {
	const window = new Window({ url });
	window.document.write(html);
	window.document.close();
	return window;
}

function resolveUrlFromDocument(doc: DocumentLike): string {
	return doc.location?.href || doc.URL || 'about:blank';
}

/**
 * Parse HTML content using happy-dom
 * @param htmlOrDom HTML string, Document, or DOM instance with a window.document
 * @param url Optional URL of the page being parsed
 * @param options Optional parsing options
 * @returns Promise with parsed content and metadata
 */
export async function Defuddle(
	htmlOrDom: string | DocumentLike | WindowLike | DomLike,
	url?: string,
	options?: DefuddleOptions
): Promise<DefuddleResponse> {
	let doc: Document;
	let pageUrl = url;

	if (typeof htmlOrDom === 'string') {
		const window = createWindow(htmlOrDom, url);
		doc = window.document as unknown as Document;
		pageUrl = pageUrl || window.location?.href;
	} else if (isDomLike(htmlOrDom)) {
		doc = htmlOrDom.window.document as unknown as Document;
		pageUrl = pageUrl || htmlOrDom.window.location?.href;
	} else if (isWindowLike(htmlOrDom)) {
		doc = htmlOrDom.document as unknown as Document;
		pageUrl = pageUrl || htmlOrDom.location?.href;
	} else if (isDocument(htmlOrDom)) {
		doc = htmlOrDom as unknown as Document;
		pageUrl = pageUrl || resolveUrlFromDocument(doc);
	} else {
		throw new TypeError('Defuddle expected an HTML string, Document, or DOM instance.');
	}

	const finalUrl = pageUrl || 'about:blank';

	// Create Defuddle instance with URL in options
	const defuddle = new DefuddleClass(doc, {
		...options,
		url: finalUrl
	});

	const result = await defuddle.parseAsync();

	// Convert to markdown if requested
	toMarkdown(result, options ?? {}, finalUrl);

	return result;
}

export { DefuddleClass, DefuddleOptions, DefuddleResponse }; 
