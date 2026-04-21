export default async function handler(req, res) {
  const upstream = process.env.UPSTREAM_API_URL;
  const token = process.env.API_TOKEN;

  if (!upstream || !token) {
    res.status(500).json({ error: 'Proxy not configured: set UPSTREAM_API_URL and API_TOKEN' });
    return;
  }

  const target = upstream.replace(/\/$/, '') + req.url;

  const headers = { Authorization: `Bearer ${token}` };
  if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
  if (req.headers['accept']) headers['accept'] = req.headers['accept'];

  const init = { method: req.method, headers };
  if (!['GET', 'HEAD'].includes(req.method) && req.body !== undefined) {
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  let response;
  try {
    response = await fetch(target, init);
  } catch (err) {
    res.status(502).json({ error: 'Upstream request failed', detail: err.message });
    return;
  }

  const body = Buffer.from(await response.arrayBuffer());
  res.status(response.status);
  const contentType = response.headers.get('content-type');
  if (contentType) res.setHeader('content-type', contentType);
  res.send(body);
}
