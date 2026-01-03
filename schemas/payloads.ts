/**
 * AIRC Standard Payload Schemas
 * @version 0.1
 * @see https://github.com/brightseth/airc
 */

// context:code
export interface CodeContextPayload {
  file: string;        // Relative path
  language?: string;   // e.g., "typescript", "python"
  content?: string;    // The code snippet
  range?: {
    startLine: number;
    endLine: number;
    startCol?: number;
    endCol?: number;
  };
  repo?: string;       // git remote URL
  branch?: string;
  commit?: string;     // SHA
}

// context:error
export interface ErrorContextPayload {
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  context?: string;    // Surrounding code
}

// context:diff
export interface DiffContextPayload {
  file: string;
  diff: string;        // Unified diff format
  repo?: string;
  branch?: string;
  baseBranch?: string;
}

// system:handshake
export interface HandshakePayload {
  action: 'request' | 'accept' | 'block' | 'unblock';
  message?: string;
}

// handoff:session
export interface SessionHandoffPayload {
  summary: string;
  files: string[];
  todos?: string[];
  context?: Record<string, unknown>;
}

// task:request
export interface TaskRequestPayload {
  description: string;
  context?: Record<string, unknown>;
  priority?: 'low' | 'medium' | 'high';
  deadline?: number;   // Unix timestamp
}

// task:result
export interface TaskResultPayload {
  requestId: string;
  status: 'completed' | 'failed' | 'partial';
  result?: unknown;
  error?: string;
  artifacts?: string[];
}
