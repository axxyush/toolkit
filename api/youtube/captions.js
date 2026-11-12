module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const target = req.query?.url;
    if (!target || typeof target !== 'string') {
      res.status(400).json({ error: 'url query param is required' });
      return;
    }

    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      res.status(400).json({ error: 'Invalid caption URL' });
      return;
    }

    if (
      parsed.hostname !== 'www.youtube.com' &&
      parsed.hostname !== 'youtube.com'
    ) {
      res.status(400).json({ error: 'Only YouTube caption URLs are allowed' });
      return;
    }

    const upstream = await fetch(parsed.toString(), {
      headers: {
        'User-Agent':
          'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip',
      },
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') || 'text/plain'
    );
    res.send(text);
  } catch (err) {
    res.status(502).json({ error: err.message || 'Caption request failed' });
  }
};
