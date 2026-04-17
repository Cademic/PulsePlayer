const SALT_LENGTH = 16;
const HASH_LENGTH = 32;
const PBKDF2_ITERATIONS = 310_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function deriveHash(
  password: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const normalizedSalt = Uint8Array.from(salt);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: normalizedSalt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    HASH_LENGTH * 8
  );

  return new Uint8Array(derivedBits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const hash = await deriveHash(password, salt);
  return `${bytesToBase64(salt)}:${bytesToBase64(hash)}`;
}

export async function verifyPassword(
  password: string,
  storedValue: string
): Promise<boolean> {
  const [saltBase64, hashBase64] = storedValue.split(":");
  if (!saltBase64 || !hashBase64) {
    return false;
  }

  const salt = base64ToBytes(saltBase64);
  const storedHash = base64ToBytes(hashBase64);
  const computedHash = await deriveHash(password, salt);

  return constantTimeEquals(storedHash, computedHash);
}
