# @nuwax-ai/sdk

Nuwax AI SDK - Unified client for opencode and nuwaxcode

## Installation

```bash
npm install @nuwax-ai/sdk
```

## Usage

### Start with opencode

```typescript
import { createOpencode } from '@nuwax-ai/sdk';

const { client, server } = await createOpencode({
  engine: 'opencode',
  port: 4096,
  config: {
    model: 'anthropic/claude-3-5-sonnet-20241022',
  },
});

// Use the client
const result = await client.session.prompt({
  path: { id: sessionId },
  body: { parts: [{ type: 'text', text: 'Hello!' }] },
});

// When done
server.close();
```

### Start with nuwaxcode

```typescript
import { createOpencode } from '@nuwax-ai/sdk';

const { client, server } = await createOpencode({
  engine: 'nuwaxcode',
  nuwaxcodePath: '/path/to/nuwaxcode',
  port: 4097,
  config: {
    model: 'anthropic/claude-3-5-sonnet-20241022',
  },
});

// Use the client
const result = await client.session.prompt({
  path: { id: sessionId },
  body: { parts: [{ type: 'text', text: 'Hello!' }] },
});

// When done
server.close();
```

### Connect to existing server

```typescript
import { createOpencodeClient } from '@nuwax-ai/sdk';

const client = createOpencodeClient({
  baseUrl: 'http://localhost:4096',
});

// Use the client
const health = await client.global.health();
```

## API

### createOpencode(options)

Start a new server and client.

**Options:**
- `engine`: 'opencode' | 'nuwaxcode' - Engine to use
- `hostname`: Server hostname (default: 127.0.0.1)
- `port`: Server port (default: 4096)
- `timeout`: Startup timeout in ms (default: 10000)
- `opencodePath`: Custom opencode binary path
- `nuwaxcodePath`: Custom nuwaxcode binary path
- `config`: Configuration object

### createOpencodeClient(options)

Connect to an existing server.

**Options:**
- `baseUrl`: Server URL (default: http://127.0.0.1:4096)
- `fetch`: Custom fetch implementation
- `responseStyle`: 'data' or 'fields'
- `throwOnError`: Throw errors on API failure

## License

MIT
