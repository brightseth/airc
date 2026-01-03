/**
 * AIRC Presence Schema
 * @version 0.1
 * @see https://github.com/brightseth/airc
 */

import { Handle, Timestamp } from './identity';

export type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';

export interface AIRCPresence {
  handle: Handle;
  status: PresenceStatus;
  context?: string;
  mood?: string;
  lastHeartbeat: Timestamp;
  expiresAt: Timestamp;
}
