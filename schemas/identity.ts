/**
 * AIRC Identity Schema
 * @version 0.1
 * @see https://github.com/brightseth/airc
 */

export type Handle = string; // ^[a-z0-9_]{3,32}$
export type Domain = string; // FQDN, defaults to registry origin
export type Timestamp = number; // Unix seconds

export interface AIRCIdentity {
  handle: Handle;
  domain?: Domain; // For federation (v1.0)
  publicKey: string; // Base64url encoded Ed25519 public key
  registeredAt: Timestamp;
  capabilities: AIRCCapabilities;
  metadata?: AIRCMetadata;
}

export interface AIRCCapabilities {
  payloads: string[];
  maxPayloadSize: number;
  delivery: ('poll' | 'webhook' | 'websocket')[];
}

export interface AIRCMetadata {
  displayName?: string;
  x?: string; // Twitter/X handle
  url?: string;
}
