const pixel = Buffer.from(
  [
    0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,
    0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52,
    0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,
    0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53,
    0xDE,0x00,0x00,0x00,0x0A,0x49,0x44,0x41,
    0x54,0x78,0x9C,0x63,0xF8,0xCF,0xC0,0x00,
    0x00,0x02,0x05,0x01,0x02,0xFF,0xA3,0x05,
    0xFD,0xB3,0x00,0x00,0x00,0x00,0x49,0x45,
    0x4E,0x44,0xAE,0x42,0x60,0x82,
  ]
).toString('base64');

const imageInput = `data:image/png;base64,${pixel}`;
const prompt = 'Describe the image';
const systemPrompt = 'You are an image description assistant.';
const body = JSON.stringify({
  model: 'google/gemini-2.0-flash-001',
  temperature: 0.2,
  max_tokens: 100,
  messages: [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'input_image', image_base64: pixel }
      ]
    }
  ]
});
(async () => {
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.TEXT_AI_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://notesgenai.vercel.app',
        'X-Title': 'AI Notes Generator'
      },
      body
    });
    const text = await resp.text();
    console.log('status', resp.status);
    console.log(text);
  } catch (err) {
    console.error(err);
  }
})();
