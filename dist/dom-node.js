"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWindowFromHtml = createWindowFromHtml;
const linkedom_1 = require("linkedom");
/**
 * Minimal computed-style stub returned when the DOM engine
 * (e.g. linkedom) does not support getComputedStyle.
 * Only the properties that Defuddle actually reads are populated.
 */
function stubGetComputedStyle() {
    return {
        display: '',
        visibility: '',
        opacity: '1',
        width: '0px',
        height: '0px',
        transform: 'none',
    };
}
/**
 * Create a DOM window + document from raw HTML using linkedom.
 * Patches missing capabilities (styleSheets, getComputedStyle)
 * so that downstream Defuddle code can run safely.
 */
function createWindowFromHtml(html, url) {
    const parsed = (0, linkedom_1.parseHTML)(html);
    const window = parsed;
    const document = parsed.document;
    normalizeDocumentCapabilities(window, document, url);
    return { window, document };
}
/**
 * Patch a linkedom document / window so that Defuddle internals
 * never hit undefined paths.  Side-effect free outside the objects.
 */
function normalizeDocumentCapabilities(window, document, url) {
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
            try {
                document.URL = url;
            }
            catch { }
        }
        if (window.location === undefined || window.location === null) {
            try {
                window.location = { href: url };
            }
            catch { }
        }
        else if (!window.location.href) {
            try {
                window.location.href = url;
            }
            catch { }
        }
    }
}
//# sourceMappingURL=dom-node.js.map