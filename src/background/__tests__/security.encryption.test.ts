import { describe, it, expect } from 'vitest';
import { PassphraseBox, sha256Hex } from '../crypto/CryptoBox';

describe('Security 7.1 Encryption', () => {
  it('encrypts and decrypts text with passphrase', async () => {
    const box = new PassphraseBox('secret');
    const ct = await box.encrypt('hello');
    expect(ct).not.toContain('hello');
    const pt = await box.decrypt(ct);
    expect(pt).toBe('hello');
    const h = await sha256Hex('hello');
    expect(h.length).toBe(64);
  });
});

