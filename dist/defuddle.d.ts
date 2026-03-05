import { DefuddleOptions, DefuddleResponse } from './types';
export declare class Defuddle {
    private readonly doc;
    private options;
    private debug;
    /**
     * Create a new Defuddle instance
     * @param doc - The document to parse
     * @param options - Options for parsing
     */
    constructor(doc: Document, options?: DefuddleOptions);
    /**
     * Parse the document and extract its main content
     */
    parse(): DefuddleResponse;
    /**
     * Extract text content from schema.org data (e.g. SocialMediaPosting, Article)
     */
    private _getSchemaText;
    /**
     * Remove dangerous elements and attributes from this.doc.
     * Called after parseInternal so that extractors and schema extraction
     * can still read script tags they depend on.
     */
    private _stripUnsafeElements;
    /**
     * Find a DOM element whose text matches the schema.org text content.
     * Used when the content scorer picked the wrong element from a feed page.
     * Returns the element's innerHTML including sibling media (images, etc.)
     */
    private _findContentBySchemaText;
    /**
     * Get the largest available src from an img element,
     * checking srcset for higher-resolution versions.
     */
    private _getLargestImageSrc;
    /**
     * Parse the document, falling back to async extractors if sync parse yields no content
     */
    parseAsync(): Promise<DefuddleResponse>;
    /**
     * Internal parse method that does the actual work
     */
    private parseInternal;
    private countWords;
    private _log;
    private _evaluateMediaQueries;
    private applyMobileStyles;
    private removeImages;
    private removeHiddenElements;
    private removeBySelector;
    private findSmallImages;
    private removeSmallImages;
    private getElementIdentifier;
    private findMainContent;
    private findTableBasedContent;
    private findContentByScoring;
    private getElementSelector;
    private getComputedStyle;
    /**
     * Resolve relative URLs to absolute within a DOM element
     */
    private resolveRelativeUrls;
    /**
     * Resolve relative URLs in an HTML string
     */
    private resolveContentUrls;
    private _extractSchemaOrgData;
    private _collectMetaTags;
    private _decodeHTMLEntities;
}
