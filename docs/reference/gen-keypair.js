import { generateKeyPairSync } from 'crypto';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');

const pubBase64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
const privBase64 = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');

console.log('Public Key:', pubBase64);
console.log('Private Key:', privBase64);
