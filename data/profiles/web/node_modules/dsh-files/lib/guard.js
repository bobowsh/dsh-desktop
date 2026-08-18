// Shared HTTP network guards for the dsh-files upload surface. Mirrors the
// official dsh-files-button contract: loopback-only host, same-origin and
// same-site checks. The upload endpoint runs these before touching any
// session or path.
const LOOPBACK_HOST = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i;
/**
 * Reject requests that are not loopback, same-origin and same-site.
 * Returns a human-readable reason, or null when the request passes.
 */
export function networkGuard(req) {
    const host = String(req.headers?.host ?? '');
    if (!LOOPBACK_HOST.test(host))
        return 'forbidden: non-loopback host';
    const origin = req.headers?.origin;
    if (origin !== undefined) {
        const scheme = req.socket?.encrypted ? 'https' : 'http';
        if (origin !== `${scheme}://${host}`)
            return 'forbidden: cross-origin';
    }
    const secFetchSite = req.headers?.['sec-fetch-site'];
    if (secFetchSite !== undefined && secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
        return 'forbidden: cross-site';
    }
    return null;
}
/** Write a JSON error response. */
export function jsonError(res, status, error) {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error }));
}
