/**
 * Server-side YouTube helpers for local `npm start`.
 * Avoids browser CORS and fragile reverse-proxy 403s.
 */
module.exports = function setupProxy(app) {
  app.post('/api/youtube/player', async (req, res) => {
    try {
      const body = await readJson(req);
      const videoId = body?.videoId;
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
      res
        .status(upstream.status)
        .type(upstream.headers.get('content-type') || 'application/json')
        .send(text);
    } catch (err) {
      res.status(502).json({ error: err.message || 'YouTube player request failed' });
    }
  });

  app.get('/api/youtube/captions', async (req, res) => {
    try {
      const target = req.query.url;
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
      res
        .status(upstream.status)
        .type(upstream.headers.get('content-type') || 'text/plain')
        .send(text);
    } catch (err) {
      res.status(502).json({ error: err.message || 'Caption request failed' });
    }
  });
};

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}
