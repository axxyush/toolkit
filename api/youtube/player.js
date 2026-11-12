module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const videoId = req.body?.videoId;
    if (!videoId || typeof videoId !== 'string') {
      res.status(400).json({ error: 'videoId is required' });
      return;
    }

    const upstream = await fetch(
      'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip',
          'X-YouTube-Client-Name': '3',
          'X-YouTube-Client-Version': '20.10.38',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: '20.10.38',
              hl: 'en',
              gl: 'US',
            },
          },
          videoId,
        }),
      }
    );

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') || 'application/json'
    );
    res.send(text);
  } catch (err) {
    res.status(502).json({ error: err.message || 'YouTube player request failed' });
  }
};
