// Short-lived HMAC token minted by the Next.js route handlers and verified by
// the Hono API gateway. Uses Web Crypto (crypto.subtle) so it runs unchanged in
// the Node runtime (Next) and the Workers runtime (Hono). The browser never
// sees this token — it's a server-to-server bearer credential.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface GatewayTokenPayload {
  exp: number;
}

// TextEncoder.encode() types its result as Uint8Array<ArrayBufferLike>, which
// crypto.subtle rejects under TS 5.7 (it wants an ArrayBuffer-backed view).
// Copy into a concrete ArrayBuffer to get the accepted Uint8Array<ArrayBuffer>.
function utf8(value: string): Uint8Array<ArrayBuffer> {
  const encoded = encoder.encode(value);
  const bytes = new Uint8Array(new ArrayBuffer(encoded.length));
  bytes.set(encoded);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  // Back the view with a concrete ArrayBuffer so the type is Uint8Array<ArrayBuffer>,
  // which crypto.subtle accepts as a BufferSource (TS 5.7 narrowed this).
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Return type is inferred from crypto.subtle.importKey rather than annotated
// with the DOM-only `CryptoKey` name — consumers typecheck this source under
// their own lib (Node / Workers), where that global name may not be in scope.
function importKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    utf8(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signGatewayToken(
  secret: string,
  ttlSeconds = 60,
): Promise<string> {
  const payload: GatewayTokenPayload = {
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadPart = bytesToBase64Url(utf8(JSON.stringify(payload)));
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, utf8(payloadPart));
  return `${payloadPart}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifyGatewayToken(
  token: string,
  secret: string,
): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadPart, signaturePart] = parts;
  if (!payloadPart || !signaturePart) return false;

  const key = await importKey(secret);
  // crypto.subtle.verify is constant-time for HMAC — don't hand-roll the compare.
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(signaturePart),
    utf8(payloadPart),
  );
  if (!valid) return false;

  try {
    const payload = JSON.parse(
      decoder.decode(base64UrlToBytes(payloadPart)),
    ) as GatewayTokenPayload;
    return (
      typeof payload.exp === "number" &&
      payload.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}
