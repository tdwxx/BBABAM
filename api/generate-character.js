export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    return;
  }

  const { imageBase64, mimeType } = req.body || {};
  if (!imageBase64 || !mimeType) {
    res.status(400).json({ error: 'imageBase64 and mimeType are required' });
    return;
  }

  const prompt =
    'Turn the person in this photo into a cute Stardew Valley style pixel art character portrait. ' +
    'Keep their hairstyle, hair color, and outfit color recognizable. ' +
    '16-bit pixel art, simple flat color shading, game character sprite look, plain neutral background.';

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
              ],
            },
          ],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      res.status(geminiRes.status).json({ error: errText });
      return;
    }

    const data = await geminiRes.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData || p.inline_data);
    const inline = imagePart?.inlineData || imagePart?.inline_data;

    if (!inline) {
      res.status(502).json({ error: 'No image returned from Gemini', raw: data });
      return;
    }

    res.status(200).json({
      imageBase64: inline.data,
      mimeType: inline.mimeType || inline.mime_type || 'image/png',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
