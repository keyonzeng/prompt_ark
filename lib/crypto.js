// lib/crypto.js — Web Crypto API encryption utilities for API key protection
// Uses AES-256-GCM with random IV for each encryption operation

const ALGO = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits, standard for GCM

let _cachedKey = null;

/**
 * Generate or load the encryption key.
 * On first install: generates a 256-bit AES-GCM key and stores in chrome.storage.local.
 * Subsequent calls: loads existing key from storage.
 * Key is cached in memory for the session lifetime.
 * @returns {Promise<CryptoKey>}
 */
export async function generateOrLoadKey() {
    if (_cachedKey) return _cachedKey;

    const stored = await chrome.storage.local.get('_encKey');
    if (stored._encKey) {
        // Import existing key
        const keyBytes = Uint8Array.from(atob(stored._encKey), c => c.charCodeAt(0));
        _cachedKey = await crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: ALGO },
            true, // extractable — consistent with generateKey
            ['encrypt', 'decrypt']
        );
        return _cachedKey;
    }

    // Generate new key
    _cachedKey = await crypto.subtle.generateKey(
        { name: ALGO, length: KEY_LENGTH },
        true, // extractable — required for exportKey() to persist in storage
        ['encrypt', 'decrypt']
    );

    // Export and store
    const exported = await crypto.subtle.exportKey('raw', _cachedKey);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    await chrome.storage.local.set({ _encKey: base64 });

    console.log('[crypto] Generated new encryption key');
    return _cachedKey;
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns base64 string: IV (12 bytes) + ciphertext.
 * @param {string} plaintext
 * @returns {Promise<string>} base64-encoded IV+ciphertext
 */
export async function encrypt(plaintext) {
    if (!plaintext) return plaintext;

    try {
        const key = await generateOrLoadKey();
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const encoded = new TextEncoder().encode(plaintext);

        const ciphertext = await crypto.subtle.encrypt(
            { name: ALGO, iv },
            key,
            encoded
        );

        // Combine IV + ciphertext, encode as base64
        const combined = new Uint8Array([...iv, ...new Uint8Array(ciphertext)]);
        return btoa(String.fromCharCode(...combined));
    } catch (e) {
        console.warn('[crypto] Encryption failed, storing as plaintext:', e.message);
        return plaintext; // Graceful degradation
    }
}

/**
 * Decrypt AES-256-GCM encrypted data.
 * Expects base64 string: IV (12 bytes) + ciphertext.
 * Returns plaintext string, or empty string on failure.
 * @param {string} encryptedBase64
 * @returns {Promise<string>} decrypted plaintext
 */
export async function decrypt(encryptedBase64) {
    if (!encryptedBase64) return encryptedBase64;

    // Backward compatibility: detect plaintext (not valid base64 IV+ciphertext)
    if (!isEncrypted(encryptedBase64)) {
        return encryptedBase64; // Return as-is (plaintext from before encryption was added)
    }

    try {
        const key = await generateOrLoadKey();
        const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

        // Split IV and ciphertext
        const iv = combined.slice(0, IV_LENGTH);
        const ciphertext = combined.slice(IV_LENGTH);

        const decrypted = await crypto.subtle.decrypt(
            { name: ALGO, iv },
            key,
            ciphertext
        );

        return new TextDecoder().decode(decrypted);
    } catch (e) {
        console.warn('[crypto] Decryption failed:', e.message);
        return ''; // Never throw — graceful degradation
    }
}

/**
 * Detect if a string is encrypted (base64 IV+ciphertext format).
 * Heuristic: valid base64, minimum length for 12-byte IV + 1-byte ciphertext.
 * @param {string} value
 * @returns {boolean}
 */
export function isEncrypted(value) {
    if (!value || typeof value !== 'string') return false;
    // Minimum length: 12 bytes IV + 1 byte ciphertext = 13 bytes → ~18 base64 chars
    if (value.length < 18) return false;
    // Check if valid base64
    try {
        const decoded = atob(value);
        // Must be at least 13 bytes (IV + min ciphertext)
        return decoded.length >= IV_LENGTH + 1;
    } catch {
        return false;
    }
}
