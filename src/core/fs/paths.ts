/**
 * The QVAC worker resolves local model and audio sources with `bare-fs`, which
 * has no notion of a URL scheme: `path.dirname('file:///data/…')` is not a real
 * directory. Expo hands out `file://` URIs everywhere, so every value that
 * crosses into the runtime has to lose the scheme first.
 */
export function toRuntimePath(uri: string): string {
  if (uri.startsWith('file://')) {
    const stripped = uri.slice('file://'.length);
    // `file:///data/x` -> `/data/x`; a Windows drive arrives as `/C:/x`.
    return /^\/[A-Za-z]:\//.test(stripped) ? stripped.slice(1) : stripped;
  }
  return uri;
}
