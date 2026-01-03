/**
 * AIRC Consent Schema
 * @version 0.1
 * @see https://github.com/brightseth/airc
 */

import { Handle, Timestamp } from './identity';

export type ConsentState = 'none' | 'pending' | 'accepted' | 'blocked';

export interface AIRCConsent {
  from: Handle;
  to: Handle;
  state: ConsentState;
  updatedAt: Timestamp;
}
