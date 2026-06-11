/**
 * Client-side document handling with encryption-at-rest simulation.
 * In production, upload encrypted blobs to Supabase Storage with RLS.
 */

const ENCRYPTION_PREFIX = "enc_v1:";

async function deriveKey(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`careerpath-sa-${userId}`),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: encoder.encode("careerpath-popia"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptDocumentMetadata(
  userId: string,
  fileName: string,
  fileType: string
): Promise<string> {
  const key = await deriveKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = JSON.stringify({ fileName, fileType, uploadedAt: new Date().toISOString() });
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(payload)
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return ENCRYPTION_PREFIX + btoa(String.fromCharCode(...combined));
}

export function isDocumentEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTION_PREFIX);
}
