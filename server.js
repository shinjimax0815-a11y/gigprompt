const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API endpoint
  if (pathname === '/api/generate' && req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { purpose, category, apiKey } = JSON.parse(body);

        if (!apiKey) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing API key' }));
          return;
        }

        const categoryLabel = {
          'sns-post': 'social media post',
          'blog': 'blog post',
          'email': 'email',
          'pitch': 'freelance pitch',
          'product': 'product description'
        }[category] || category;

        const systemPrompt = `You are an expert prompt engineer specializing in creating effective prompts for freelancers and side hustlers. Generate a high-quality, actionable prompt that can be used with AI tools like ChatGPT, Claude, or other LLMs.

The prompt should:
- Be specific and detailed
- Include clear instructions and desired outcomes
- Have placeholders or variables where users can customize inputs
- Be practical for the user's situation
- Include any relevant context or tone specifications

Format the prompt clearly with sections if needed.`;

        const userMessage = `Create a detailed prompt for writing a ${categoryLabel}.

User's requirement: ${purpose}

Generate a professional, ready-to-use prompt that this freelancer can immediately use with an AI tool.`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: userMessage
              }
            ]
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          res.writeHead(response.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: errorData.error?.message || 'API request failed' }));
          return;
        }

        const data = await response.json();
        if (data.content && data.content[0] && data.content[0].text) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ prompt: data.content[0].text }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unexpected API response' }));
        }
      } catch (error) {
        console.error('Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Static file serving
  let filePath = '.' + pathname;
  if (filePath === './') {
    filePath = './index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`API endpoint: http://localhost:${PORT}/api/generate`);
});
