const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// Proxy API requests to avoid CORS issues
app.post('/api/chat', async (req, res) => {
  try {
    const { apiUrl, apiKey, model, messages, temperature = 0.7, stream = true } = req.body;

    if (!apiUrl || !apiKey) {
      return res.status(400).json({ error: '请先在设置中配置 API 地址和 API Key' });
    }

    const targetUrl = new URL(apiUrl);
    const isHttps = targetUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    };

    const payload = JSON.stringify({
      model: model || 'gpt-3.5-turbo',
      messages: messages,
      temperature: temperature,
      stream: stream,
    });

    const proxyReq = httpModule.request(options, (proxyRes) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      // Copy content type and status
      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'text/event-stream');
      res.statusCode = proxyRes.statusCode;

      // Set SSE headers if streaming
      if (stream) {
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
      }

      proxyRes.on('data', (chunk) => {
        res.write(chunk);
      });

      proxyRes.on('end', () => {
        res.end();
      });
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy request error:', err.message);
      res.status(500).json({ error: `请求失败: ${err.message}` });
    });

    proxyReq.write(payload);
    proxyReq.end();

  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ error: `服务器错误: ${err.message}` });
  }
});

// Handle OPTIONS for preflight
app.options('/api/chat', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`  🚀 AI Chat Server is running!`);
  console.log(`  📡 Local:   http://localhost:${PORT}`);
  console.log(`  🌐 Network: http://0.0.0.0:${PORT}`);
  console.log(`========================================\n`);
});
