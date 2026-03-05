import DefuddleClass from './index';
import type { DefuddleOptions, DefuddleResponse } from './types';
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
/**
 * Parse HTML content using linkedom
 * @param htmlOrDom HTML string, Document, or DOM instance with a window.document
 * @param url Optional URL of the page being parsed
 * @param options Optional parsing options
 * @returns Promise with parsed content and metadata
 */
export declare function Defuddle(htmlOrDom: string | DocumentLike | WindowLike | DomLike, url?: string, options?: DefuddleOptions): Promise<DefuddleResponse>;
export { DefuddleClass, DefuddleOptions, DefuddleResponse };
