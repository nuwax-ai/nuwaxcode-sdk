/**
 * @nuwax-ai/sdk - Nuwax AI SDK
 * 
 * Unified SDK for:
 * - opencode: Original opencode AI coding agent
 * - nuwaxcode: Nuwax-modified opencode
 */

import { spawn, type ChildProcess } from 'child_process';
import undici from 'undici';

// ==================== Types ====================

export interface CreateOpencodeOptions {
  /** Engine to use: 'opencode' or 'nuwaxcode' */
  engine?: 'opencode' | 'nuwaxcode';
  /** Server hostname */
  hostname?: string;
  /** Server port */
  port?: number;
  /** Timeout for server startup */
  timeout?: number;
  /** Custom opencode path */
  opencodePath?: string;
  /** Custom nuwaxcode path */
  nuwaxcodePath?: string;
  /** Configuration object */
  config?: OpencodeConfig;
  /** Abort signal */
  signal?: AbortSignal;
}

export interface CreateOpencodeClientOptions {
  /** Server base URL */
  baseUrl?: string;
  /** Custom fetch implementation */
  fetch?: typeof fetch;
  /** Response style: 'data' or 'fields' */
  responseStyle?: 'data' | 'fields';
  /** Throw error on API error */
  throwOnError?: boolean;
}

export interface OpencodeConfig {
  /** Model to use */
  model?: string;
  /** System prompt */
  systemPrompt?: string;
  /** Temperature */
  temperature?: number;
  /** Max tokens */
  maxTokens?: number;
  // Add other config options as needed
}

export interface Session {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  model: string;
  createdAt: number;
}

export interface Part {
  type: 'text' | 'tool-use' | 'tool-result';
  text?: string;
  toolUse?: any;
  toolResult?: any;
}

export interface OpencodeClient {
  global: {
    health: () => Promise<{ healthy: boolean; version: string }>;
  };
  app: {
    log: (body: { service: string; level: string; message: string }) => Promise<boolean>;
    agents: () => Promise<any[]>;
  };
  project: {
    list: () => Promise<any[]>;
    current: () => Promise<any>;
  };
  path: {
    get: () => Promise<any>;
  };
  config: {
    get: () => Promise<any>;
    providers: () => Promise<{ providers: any[]; default: Record<string, string> }>;
  };
  session: {
    list: () => Promise<Session[]>;
    get: (path: { id: string }) => Promise<Session>;
    children: (path: { id: string }) => Promise<Session[]>;
    create: (body: { parts: any[] }) => Promise<{ data: { id: string } }>;
    delete: (path: { id: string }) => Promise<boolean>;
    update: (path: { id: string }, body: any) => Promise<Session>;
    init: (path: { id: string }, body: any) => Promise<boolean>;
    abort: (path: { id: string }) => Promise<boolean>;
    share: (path: { id: string }) => Promise<Session>;
    unshare: (path: { id: string }) => Promise<Session>;
    summarize: (path: { id: string }, body: any) => Promise<boolean>;
    messages: (path: { id: string }) => Promise<{ info: Message; parts: Part[] }[]>;
    message: (path: { id: string; messageId: string }) => Promise<{ info: Message; parts: Part[] }>;
    prompt: (path: { id: string }, body: {
      parts: any[];
      noReply?: boolean;
      outputFormat?: any;
    }) => Promise<{ parts: Part[]; data?: any }>;
    command: (path: { id: string }, body: { command: string }) => Promise<{ parts: Part[] }>;
    shell: (path: { id: string }, body: { command: string }) => Promise<{ parts: Part[] }>;
  };
}

export interface OpencodeServer {
  url: string;
  close: () => void;
}

// ==================== Client ====================

function createClient(baseUrl: string, options: CreateOpencodeClientOptions = {}): OpencodeClient {
  const { fetch = globalThis.fetch, responseStyle = 'fields', throwOnError = false } = options;
  
  async function request<T>(path: string, body?: any): Promise<T> {
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
      if (throwOnError) {
        throw new Error(`API error: ${response.status}`);
      }
      return {} as T;
    }
    
    if (responseStyle === 'data') {
      return response.json();
    }
    
    return response.json();
  }
  
  return {
    global: {
      health: () => request('/global/health'),
    },
    app: {
      log: (body) => request('/app/log', body),
      agents: () => request('/app/agents'),
    },
    project: {
      list: () => request('/project/list'),
      current: () => request('/project/current'),
    },
    path: {
      get: () => request('/path'),
    },
    config: {
      get: () => request('/config'),
      providers: () => request('/config/providers'),
    },
    session: {
      list: () => request('/session/list'),
      get: (path) => request(`/session/${path.id}`),
      children: (path) => request(`/session/${path.id}/children`),
      create: (body) => request('/session/create', body),
      delete: (path) => request(`/session/${path.id}`, undefined, { method: 'DELETE' }),
      update: (path, body) => request(`/session/${path.id}`, body),
      init: (path, body) => request(`/session/${path.id}/init`, body),
      abort: (path) => request(`/session/${path.id}/abort`),
      share: (path) => request(`/session/${path.id}/share`),
      unshare: (path) => request(`/session/${path.id}/unshare`),
      summarize: (path, body) => request(`/session/${path.id}/summarize`, body),
      messages: (path) => request(`/session/${path.id}/messages`),
      message: (path) => request(`/session/${path.id}/message/${path.messageId}`),
      prompt: (path, body) => request(`/session/${path.id}/prompt`, body),
      command: (path, body) => request(`/session/${path.id}/command`, body),
      shell: (path, body) => request(`/session/${path.id}/shell`, body),
    },
  };
}

// ==================== Server ====================

function waitForServer(url: string, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const check = async () => {
      try {
        const response = await fetch(`${url}/global/health`);
        if (response.ok) {
          resolve(true);
          return;
        }
      } catch {
        // Server not ready yet
      }
      
      if (Date.now() - startTime > timeout) {
        resolve(false);
        return;
      }
      
      setTimeout(check, 500);
    };
    
    check();
  });
}

// ==================== Main Functions ====================

/**
 * Create and start an opencode/nuwaxcode server with client
 */
export async function createOpencode(options: CreateOpencodeOptions = {}): Promise<{
  client: OpencodeClient;
  server: OpencodeServer;
}> {
  const {
    engine = 'opencode',
    hostname = '127.0.0.1',
    port = 4096,
    timeout = 10000,
    opencodePath,
    nuwaxcodePath,
    config = {},
    signal,
  } = options;
  
  // Determine which binary to use
  const binaryName = engine === 'nuwaxcode' ? 'nuwaxcode' : 'opencode';
  const binaryPath = engine === 'nuwaxcode' ? nuwaxcodePath || binaryName : opencodePath || binaryName;
  
  // Build arguments
  const args = ['serve', '--port', String(port)];
  
  // Add config options
  if (config.model) {
    args.push('--model', config.model);
  }
  
  console.log(`[SDK] Starting ${engine} at ${binaryPath} on port ${port}...`);
  
  // Start the server process
  const serverProcess = spawn(binaryPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });
  
  // Handle process errors
  serverProcess.on('error', (error) => {
    console.error(`[SDK] ${engine} process error:`, error);
  });
  
  serverProcess.stderr?.on('data', (data) => {
    console.error(`[SDK] ${engine} stderr:`, data.toString());
  });
  
  // Wait for server to be ready
  const serverUrl = `http://${hostname}:${port}`;
  const ready = await waitForServer(serverUrl, timeout);
  
  if (!ready) {
    serverProcess.kill();
    throw new Error(`Failed to start ${engine} server within ${timeout}ms`);
  }
  
  console.log(`[SDK] ${engine} server ready at ${serverUrl}`);
  
  // Create client
  const client = createClient(serverUrl);
  
  // Handle cleanup
  const cleanup = () => {
    console.log(`[SDK] Stopping ${engine} server...`);
    serverProcess.kill();
  };
  
  if (signal) {
    signal.addEventListener('abort', cleanup);
  }
  
  return {
    client,
    server: {
      url: serverUrl,
      close: cleanup,
    },
  };
}

/**
 * Create client only (connect to existing server)
 */
export function createOpencodeClient(options: CreateOpencodeClientOptions = {}): OpencodeClient {
  const baseUrl = options.baseUrl || 'http://127.0.0.1:4096';
  return createClient(baseUrl, options);
}

// Re-export types
export type {};

// Default export
export default {
  createOpencode,
  createOpencodeClient,
};
