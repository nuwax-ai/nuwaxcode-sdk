/**
 * @nuwax-ai/sdk - Nuwax AI SDK
 */

import { spawn, type ChildProcess } from 'child_process';

export interface CreateOpencodeOptions {
  engine?: 'opencode' | 'nuwaxcode';
  hostname?: string;
  port?: number;
  timeout?: number;
  opencodePath?: string;
  nuwaxcodePath?: string;
  config?: any;
  signal?: AbortSignal;
}

export interface CreateOpencodeClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
}

export interface OpencodeClient {
  global: { health: () => Promise<any> };
  app: { log: (body: any) => Promise<any>; agents: () => Promise<any> };
  project: { list: () => Promise<any>; current: () => Promise<any> };
  path: { get: () => Promise<any> };
  config: { get: () => Promise<any>; providers: () => Promise<any> };
  session: {
    list: () => Promise<any>;
    get: (path: any) => Promise<any>;
    children: (path: any) => Promise<any>;
    create: (body: any) => Promise<any>;
    delete: (path: any) => Promise<any>;
    update: (path: any, body: any) => Promise<any>;
    init: (path: any, body: any) => Promise<any>;
    abort: (path: any) => Promise<any>;
    share: (path: any) => Promise<any>;
    unshare: (path: any) => Promise<any>;
    summarize: (path: any, body: any) => Promise<any>;
    messages: (path: any) => Promise<any>;
    message: (path: any) => Promise<any>;
    prompt: (path: any, body: any) => Promise<any>;
    command: (path: any, body: any) => Promise<any>;
    shell: (path: any, body: any) => Promise<any>;
  };
}

export interface OpencodeServer {
  url: string;
  close: () => void;
}

function createClient(baseUrl: string): OpencodeClient {
  const fetch = globalThis.fetch;
  
  async function request(path: string, body?: any) {
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.json();
  }
  
  return {
    global: { health: () => request('/global/health') },
    app: { log: (body) => request('/app/log', body), agents: () => request('/app/agents') },
    project: { list: () => request('/project/list'), current: () => request('/project/current') },
    path: { get: () => request('/path') },
    config: { get: () => request('/config'), providers: () => request('/config/providers') },
    session: {
      list: () => request('/session/list'),
      get: (path) => request(`/session/${path.id}`),
      children: (path) => request(`/session/${path.id}/children`),
      create: (body) => request('/session/create', body),
      delete: (path) => request(`/session/${path.id}`),
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

async function waitForServer(url: string, timeout: number) {
  const fetch = globalThis.fetch;
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${url}/global/health`);
      if (response.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

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
    signal,
  } = options;
  
  const binaryName = engine === 'nuwaxcode' ? 'nuwaxcode' : 'opencode';
  const binaryPath = engine === 'nuwaxcode' ? (nuwaxcodePath || binaryName) : (opencodePath || binaryName);
  const serverUrl = `http://${hostname}:${port}`;
  
  console.log(`[SDK] Starting ${engine} at ${binaryPath} on port ${port}...`);
  
  const args = ['serve', '--port', String(port)];
  const serverProcess = spawn(binaryPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });
  
  serverProcess.on('error', (error) => console.error(`[SDK] ${engine} error:`, error));
  serverProcess.stderr?.on('data', (data) => console.error(`[SDK] ${engine}:`, data.toString()));
  
  const ready = await waitForServer(serverUrl, timeout);
  if (!ready) {
    serverProcess.kill();
    throw new Error(`Failed to start ${engine} within ${timeout}ms`);
  }
  
  console.log(`[SDK] ${engine} ready at ${serverUrl}`);
  const client = createClient(serverUrl);
  
  const close = () => { serverProcess.kill(); };
  if (signal) signal.addEventListener('abort', close);
  
  return { client, server: { url: serverUrl, close } };
}

export function createOpencodeClient(options: CreateOpencodeClientOptions = {}): OpencodeClient {
  return createClient(options.baseUrl || 'http://127.0.0.1:4096');
}

export default { createOpencode, createOpencodeClient };
