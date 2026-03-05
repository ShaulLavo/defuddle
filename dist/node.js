"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefuddleClass = void 0;
exports.Defuddle = Defuddle;
const dom_node_1 = require("./dom-node");
const index_1 = __importDefault(require("./index"));
exports.DefuddleClass = index_1.default;
const markdown_1 = require("./markdown");
function isDomLike(value) {
    if (!value || typeof value !== 'object')
        return false;
    const maybeDom = value;
    return !!maybeDom.window && !!maybeDom.window.document;
}
function isWindowLike(value) {
    if (!value || typeof value !== 'object')
        return false;
    const maybeWindow = value;
    return !!maybeWindow.document;
}
function isDocument(value) {
    if (!value || typeof value !== 'object')
        return false;
    const maybeDoc = value;
    return maybeDoc.nodeType === 9 && typeof maybeDoc.createElement === 'function';
}
function resolveUrlFromDocument(doc) {
    return doc.location?.href || doc.URL || 'about:blank';
}
/**
 * Parse HTML content using linkedom
 * @param htmlOrDom HTML string, Document, or DOM instance with a window.document
 * @param url Optional URL of the page being parsed
 * @param options Optional parsing options
 * @returns Promise with parsed content and metadata
 */
async function Defuddle(htmlOrDom, url, options) {
    let doc;
    let pageUrl = url;
    if (typeof htmlOrDom === 'string') {
        const { document } = (0, dom_node_1.createWindowFromHtml)(htmlOrDom, url);
        doc = document;
        pageUrl = pageUrl || url;
    }
    else if (isDomLike(htmlOrDom)) {
        doc = htmlOrDom.window.document;
        pageUrl = pageUrl || htmlOrDom.window.location?.href;
    }
    else if (isWindowLike(htmlOrDom)) {
        doc = htmlOrDom.document;
        pageUrl = pageUrl || htmlOrDom.location?.href;
    }
    else if (isDocument(htmlOrDom)) {
        doc = htmlOrDom;
        pageUrl = pageUrl || resolveUrlFromDocument(doc);
    }
    else {
        throw new TypeError('Defuddle expected an HTML string, Document, or DOM instance.');
    }
    const finalUrl = pageUrl || 'about:blank';
    // Create Defuddle instance with URL in options
    const defuddle = new index_1.default(doc, {
        ...options,
        url: finalUrl
    });
    const result = await defuddle.parseAsync();
    // Convert to markdown if requested
    (0, markdown_1.toMarkdown)(result, options ?? {}, finalUrl);
    return result;
}
//# sourceMappingURL=node.js.map