export default async function handler(req: any, res: any) {
  try {
    const { path } = req.query;
    const subpath = Array.isArray(path) ? path.join('/') : path || '';

    // クエリパラメータを組み立て
    const url = new URL(`https://www.songsterr.com/api/${subpath}`);
    if (req.query) {
      for (const [key, val] of Object.entries(req.query)) {
        if (key !== 'path' && val !== undefined) {
          url.searchParams.set(key, Array.isArray(val) ? val[0] : String(val));
        }
      }
    }

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept: 'application/json',
      },
    });

    const data = await response.text();
    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.send(data);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
}
