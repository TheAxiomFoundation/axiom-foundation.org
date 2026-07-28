/** Resolve a relative href to absolute when baseUrl is provided */
export function resolveHref(href, baseUrl) {
    if (baseUrl && !href.startsWith("http") && !href.startsWith("mailto:")) {
        return `${baseUrl}${href}`;
    }
    return href;
}
//# sourceMappingURL=link-utils.js.map