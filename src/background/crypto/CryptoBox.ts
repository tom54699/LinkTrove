// Lightweight encryption helpers built on Web Crypto API (AES-GCM)

function enc(s: string): Uint8Array { return new TextEncoder().encode(s); }
function dec(b: ArrayBuffer): string { return new TextDecoder().decode(b); }
function toB64(arr: ArrayBuffer): string {
  const bytes = new Uint8Array(arr);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // btoa expects binary string
  return typeof btoa !== 'undefined' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
}
function fromB64(b64: string): Uint8Array {
  const bin = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export interface Encryptor {
  encrypt(plain: string): Promise<string>;
  decrypt(payload: string): Promise<string>;
}

export async function sha256Hex(text: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', enc(text));
  return Array.from(new Uint8Array(h)).map(x => x.toString(16).padStart(2, '0')).join('');
}

export class PassphraseBox implements Encryptor {
  private keyPromise: Promise<CryptoKey>;
  constructor(passphrase: string, private salt: string = 'linktrove.salt.v1') {
    this.keyPromise = (async () => {
      const material = await crypto.subtle.importKey('raw', enc(passphrase), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', hash: 'SHA-256', salt: enc(salt), iterations: 100_000 },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      return key;
    })();
  }
  private async key() { return this.keyPromise; }
  async encrypt(plain: string): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await this.key(), enc(plain));
    const payload = { v: 1, alg: 'AES-GCM', iv: toB64(iv), ct: toB64(ct) };
    return JSON.stringify(payload);
  }
  async decrypt(payload: string): Promise<string> {
    const obj = JSON.parse(payload);
    const iv = fromB64(obj.iv);
    const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await this.key(), fromB64(obj.ct));
    return dec(buf);
  }
}
