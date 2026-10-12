'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const { StorageService } = require('../services/storage-service');
const { AiService, FORGE_SYSTEM_PROMPT } = require('../services/ai-service');

test('Forge & BYOK: Multi-Provider Storage Credentials Isolation', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'worldcraft-byok-test-'));
  try {
    const storage = new StorageService(tempDir);

    // Initial state: no keys
    const initialProviders = await storage.getConfiguredProviders();
    assert.equal(initialProviders.google, false);
    assert.equal(initialProviders.openai, false);
    assert.equal(initialProviders.anthropic, false);
    assert.equal(await storage.hasApiKey('google'), false);
    assert.equal(await storage.hasApiKey('openai'), false);

    // Set Google Key
    await storage.setApiKey('AIzaSyFakeKeyGoogle123', 'google');
    assert.equal(await storage.hasApiKey('google'), true);
    assert.equal(await storage.getApiKey('google'), 'AIzaSyFakeKeyGoogle123');

    // Set OpenAI Key
    await storage.setApiKey('sk-proj-FakeOpenAIKey456', 'openai');
    assert.equal(await storage.hasApiKey('openai'), true);
    assert.equal(await storage.getApiKey('openai'), 'sk-proj-FakeOpenAIKey456');

    // Set Anthropic Key
    await storage.setApiKey('sk-ant-FakeClaude789', 'anthropic');
    assert.equal(await storage.hasApiKey('anthropic'), true);
    assert.equal(await storage.getApiKey('anthropic'), 'sk-ant-FakeClaude789');

    // Set Ollama Endpoint
    await storage.setApiKey('http://127.0.0.1:11434', 'ollama');
    assert.equal(await storage.hasApiKey('ollama'), true);
    assert.equal(await storage.getApiKey('ollama'), 'http://127.0.0.1:11434');

    // Check configured map
    const configured = await storage.getConfiguredProviders();
    assert.equal(configured.google, true);
    assert.equal(configured.openai, true);
    assert.equal(configured.anthropic, true);
    assert.equal(configured.ollama, true);

    // Delete one key
    await storage.deleteApiKey('openai');
    assert.equal(await storage.hasApiKey('openai'), false);
    assert.equal(await storage.getApiKey('openai'), null);

    // Others remain intact
    assert.equal(await storage.getApiKey('google'), 'AIzaSyFakeKeyGoogle123');
    assert.equal(await storage.getApiKey('anthropic'), 'sk-ant-FakeClaude789');

    // Verify raw credentials file is encrypted/base64 encoded and never plain text JSON with sensitive fields
    const credPath = path.join(tempDir, 'secure-credentials.bin');
    assert.equal(fs.existsSync(credPath), true);
    const rawCred = fs.readFileSync(credPath, 'utf8');
    assert.equal(rawCred.includes('{"apiKey":'), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Forge & BYOK: AiService Multi-Provider Offline Interception', async () => {
  const aiService = new AiService();

  // Chat attempt without key must return standard Cyberpunk offline error
  const chatRes = await aiService.chat({
    provider: 'google',
    apiKey: null,
    message: 'Synthesize stream overlay'
  });
  assert.equal(chatRes.ok, false);
  assert.equal(chatRes.error.code, 'NO_API_KEY');
  assert.equal(chatRes.error.message.includes('NEURAL-LINK OFFLINE'), true);

  // OpenAI without key
  const chatOpenAI = await aiService.chat({
    provider: 'openai',
    apiKey: '',
    message: 'Hello'
  });
  assert.equal(chatOpenAI.ok, false);
  assert.equal(chatOpenAI.error.code, 'NO_API_KEY');

  // Summarize without key must return offline error
  const sumRes = await aiService.summarizePage({
    provider: 'google',
    apiKey: null,
    title: 'Test Page',
    content: 'Some text content'
  });
  assert.equal(sumRes.ok, false);
  assert.equal(sumRes.error.code, 'NO_API_KEY');

  // Forge widget generation without key
  const forgeRes = await aiService.forgeWidget({
    provider: 'google',
    apiKey: null,
    name: 'alert-sub',
    prompt: 'Cyberpunk subscriber alert'
  });
  assert.equal(forgeRes.ok, false);
  assert.equal(forgeRes.error.code, 'NO_API_KEY');

  // Verify FORGE_SYSTEM_PROMPT structure
  assert.equal(typeof FORGE_SYSTEM_PROMPT, 'string');
  assert.equal(FORGE_SYSTEM_PROMPT.includes('OBS Studio Browser Source'), true);
  assert.equal(FORGE_SYSTEM_PROMPT.includes('transparent'), true);
  assert.equal(FORGE_SYSTEM_PROMPT.includes('single-file'), true);
});

test('Forge & OBS Server: HTTP Static Serving, CORS, and Path Traversal Blocking', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'worldcraft-obs-server-test-'));
  const widgetsDir = path.join(tempDir, 'widgets');
  fs.mkdirSync(widgetsDir, { recursive: true });

  // Create sample OBS overlay widget
  const sampleWidgetHtml = `<!DOCTYPE html>
<html>
<head>
<style>
body { background: transparent; color: #00ff66; font-family: monospace; }
.alert-box { border: 2px solid #00ff66; padding: 20px; box-shadow: 0 0 15px #00ff66; }
</style>
</head>
<body>
<div class="alert-box">[ USER RECOGNIZED // NEURAL-LINK ONLINE ]</div>
</body>
</html>`;

  fs.writeFileSync(path.join(widgetsDir, 'test-alert.html'), sampleWidgetHtml, 'utf8');

  // Spawn an HTTP server mimicking main.js startWidgetsServer
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      const parsedUrl = new URL(req.url, 'http://localhost:4884');
      const pathname = decodeURIComponent(parsedUrl.pathname);

      if (!pathname.startsWith('/widgets/')) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const relativeFile = pathname.slice('/widgets/'.length);
      const safeRelative = path.normalize(relativeFile).replace(/^(\.\.[\/\\])+/, '');
      const fullPath = path.resolve(widgetsDir, safeRelative);

      if (!fullPath.startsWith(path.resolve(widgetsDir))) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
      }

      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const content = fs.readFileSync(fullPath);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Widget Not Found');
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server Error');
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    // 1. Valid widget request
    const res1 = await fetch(`http://127.0.0.1:${port}/widgets/test-alert.html`);
    assert.equal(res1.status, 200);
    assert.equal(res1.headers.get('content-type'), 'text/html; charset=utf-8');
    assert.equal(res1.headers.get('access-control-allow-origin'), '*');
    const text1 = await res1.text();
    assert.equal(text1.includes('NEURAL-LINK ONLINE'), true);

    // 2. Non-existent widget (404)
    const res2 = await fetch(`http://127.0.0.1:${port}/widgets/missing.html`);
    assert.equal(res2.status, 404);

    // 3. Path traversal attack attempt
    const res3 = await fetch(`http://127.0.0.1:${port}/widgets/..%2F..%2Fetc/passwd`);
    assert.equal(res3.status === 403 || res3.status === 404, true);

    // 4. Non-widgets path (404)
    const res4 = await fetch(`http://127.0.0.1:${port}/admin/secrets`);
    assert.equal(res4.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
