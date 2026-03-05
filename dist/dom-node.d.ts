export interface NodeDomResult {
    window: typeof globalThis;
    document: Document;
}
/**
 * Create a DOM window + document from raw HTML using linkedom.
 * Patches missing capabilities (styleSheets, getComputedStyle)
 * so that downstream Defuddle code can run safely.
 */
export declare function createWindowFromHtml(html: string, url?: string): NodeDomResult;
