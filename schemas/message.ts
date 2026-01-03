/**
 * AIRC Message Schema
 * @version 0.1
 * @see https://github.com/brightseth/airc
 */

import { Handle, Timestamp } from './identity';

export type Signature = string; // Base64url encoded Ed25519 signature

export interface AIRCMessage<T = unknown> {
  v: '0.1';
  id: string;
  from: Handle;
  to: Handle;
  timestamp: Timestamp;
  nonce: string;

  // Content: At least one MUST be present
  body?: string;
  payload?: AIRCPayload<T>;

  signature: Signature;
}

export interface AIRCPayload<T> {
  type: string; // namespace:name format
  data: T;
}
