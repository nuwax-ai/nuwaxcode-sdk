/**
 * nuwaxcode-http - nuwaxcode HTTP Wrapper
 * 
 * 将 nuwaxcode stdio 模式包装为 HTTP 服务器
 * 供 @nuwax-ai/sdk 使用
 */

import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import { URL } from 'url';

const PORT = process.env.PORT || 4097;
const NUWAXCODE_PATH = process.env.NUWAXCODE_PATH || 'nuwaxcode';
const WORKSPACE = process.env.WORKSPACE || process.cwd();

// Store active sessions
const sessions = new Map<string, ChildProcess>();

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  const path = url.pathname;
  const method = req.method;
  
  // Set JSON content type
  res.setHeader('Content-Type', 'application/json');
  
  try {
    // Route: GET /global/health
    if (path === '/global/health' && method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({ healthy: true, version: '1.0.0' }));
      return;
    }
    
    // Route: POST /session/create
    if (path === '/session/create' && method === 'POST') {
      const sessionId = `session-${Date.now()}`;
      res.writeHead(200);
      res.end(JSON.stringify({ data: { id: sessionId } }));
      return;
    }
    
    // Route: POST /session/:id/prompt
    if (path.match(/^\/session\/[^/]+\/prompt$/) && method === 'POST') {
      const sessionId = path.split('/')[2];
      
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      
      const { parts = [] } = JSON.parse(body);
      const prompt = parts.map((p: any) => p.text).join('');
      
      // Spawn nuwaxcode process
      const proc = spawn(NUWAXCODE_PATH, ['exec', prompt], {
        cwd: WORKSPACE,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      
      let stdout = '';
      let stderr = '';
      
      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      proc.on('close', () => {
        sessions.set(sessionId, proc);
      });
      
      // Wait a bit for response (simplified)
      setTimeout(() => {
        proc.kill();
        res.writeHead(200);
        res.end(JSON.stringify({ 
          parts: [{ type: 'text', text: stdout || stderr }] 
        }));
      }, 5000);
      return;
    }
    
    // 404 for unknown routes
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
    
  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: String(error) }));
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`[nuwaxcode-http] Server running at http://localhost:${PORT}`);
  console.log(`[nuwaxcode-http] Using nuwaxcode at: ${NUWAXCODE_PATH}`);
  console.log(`[nuwaxcode-http] Workspace: ${WORKSPACE}`);
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('[nuwaxcode-http] Shutting down...');
  // Kill all sessions
  for (const [id, proc] of sessions) {
    proc.kill();
    sessions.delete(id);
  }
  server.close(() => {
    process.exit(0);
  });
});
