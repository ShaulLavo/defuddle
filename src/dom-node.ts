import { parseHTML } from 'linkedom';

/**
 * Minimal computed-style stub returned when the DOM engine
 * (e.g. linkedom) does not support getComputedStyle.
 * Only the properties that Defuddle actually reads are populated.
 */
function stubGetComputedStyle(): CSSStyleDeclaration {
	return {
		display: '',
		visibility: '',
		opacity: '1',
		width: '0px',
		height: '0px',
		transform: 'none',
	} as unknown as CSSStyleDeclaration;
}

export interface NodeDomResult {
	window: typeof globalThis;
	document: Document;
}

/**
 * Create a DOM window + document from raw HTML using linkedom.
 * Patches missing capabilities (styleSheets, getComputedStyle)
 * so that downstream Defuddle code can run safely.
 */
export function createWindowFromHtml(html: string, url?: string): NodeDomResult {
	const parsed = parseHTML(html);
	const window = parsed as unknown as typeof globalThis;
	const document = (parsed as any).document as Document;

	normalizeDocumentCapabilities(window, document, url);

	return { window, document };
}

/**
 * Patch a linkedom document / window so that Defuddle internals
 * never hit undefined paths.  Side-effect free outside the objects.
 */
function normalizeDocumentCapabilities(
	window: any,
	document: any,
	url?: string
): void {
	// Ensure document.styleSheets is iterable
	if (!document.styleSheets) {
		document.styleSheets = [];
	}

	// Ensure getComputedStyle exists on window and defaultView
	if (typeof window.getComputedStyle !== 'function') {
		window.getComputedStyle = stubGetComputedStyle;
	}
	if (document.defaultView && typeof document.defaultView.getComputedStyle !== 'function') {
		document.defaultView.getComputedStyle = window.getComputedStyle;
	}

	// Set URL / location when provided
	if (url) {
		if (!document.URL) {
			try { (document as any).URL = url; } catch {}
		}
		if (window.location === undefined || window.location === null) {
			try { (window as any).location = { href: url }; } catch {}
		} else if (!window.location.href) {
			try { window.location.href = url; } catch {}
		}
	}
}
