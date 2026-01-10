import { sign as cryptoSign, verify as cryptoVerify, generateKeyPairSync } from 'crypto';

// Generate fresh keypair
const { publicKey, privateKey } = generateKeyPairSync('ed25519');

// Test data
const data = Buffer.from('Hello, World!', 'utf8');

// Sign
const signature = cryptoSign(null, data, privateKey);
console.log('Signature:', signature.toString('base64'));

// Verify
const isValid = cryptoVerify(null, data, publicKey, signature);
console.log('Verification:', isValid);
