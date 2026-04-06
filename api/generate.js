// Vercel Function: api/generate.js
// このファイルを `api/generate.js` に配置してください

export default async function handler(req, res) {
  // CORSヘッダー設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { purpose, category, apiKey } = req.body;

  if (!apiKey || !purpose || !category) {
    return res.status(400).json({ error: 'Missing required fields' });
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

  try {
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
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid API key' });
      } else if (response.status === 429) {
        return res.status(429).json({ error: 'Rate limited. Please try again later.' });
      } else {
        return res.status(response.status).json({ error: errorData.error?.message || 'API request failed' });
      }
    }

    const data = await response.json();
    if (data.content && data.content[0] && data.content[0].text) {
      return res.status(200).json({ prompt: data.content[0].text });
    } else {
      return res.status(500).json({ error: 'Unexpected API response format' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
