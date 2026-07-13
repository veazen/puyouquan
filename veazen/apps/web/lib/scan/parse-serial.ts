/**
 * E1 returns-desk scanning (PD-004): map whatever a QR decode yields onto a
 * serial the check API understands. Pure function — vitest'd.
 *
 * The platform prints two QR URL shapes (§1.5):
 *   https://verify.example/v/{serial}?sig=…              (internal fallback)
 *   https://verify.example/01/{gtin}/21/{serial}?sig=…   (GS1 Digital Link)
 * Anything that does not parse as an http(s) URL is treated as the serial
 * itself (hand-typed codes, plain-text barcodes). Normalization (case,
 * separators, confusables) stays server-side, same as manual input.
 */
export function extractSerialFromScan(raw: string): string {
  const text = raw.trim();
  if (!/^https?:\/\//i.test(text)) {
    return text;
  }
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return text;
  }
  const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const vIndex = segments.indexOf('v');
  if (vIndex !== -1 && segments.length > vIndex + 1) {
    return segments[vIndex + 1]!;
  }
  // GS1 Digital Link: the serial is the path segment after AI "21"
  const serialAiIndex = segments.indexOf('21');
  if (serialAiIndex !== -1 && segments.length > serialAiIndex + 1) {
    return segments[serialAiIndex + 1]!;
  }
  // unknown URL shape: last segment is the best guess (never the query)
  return segments[segments.length - 1] ?? text;
}
