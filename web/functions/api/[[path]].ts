interface Env { API_ORIGIN?: string; }

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const configured = env.API_ORIGIN?.trim();
  if (!configured) return Response.json({ error: 'API_UNAVAILABLE' }, { status: 503 });

  let upstream: URL;
  try {
    upstream = new URL(configured);
    if (upstream.protocol !== 'https:' || upstream.username || upstream.password ||
        upstream.search || upstream.hash || upstream.pathname !== '/' ||
        upstream.hostname === 'localhost' || upstream.hostname.endsWith('.localhost')) {
      throw new Error('Invalid upstream');
    }
  } catch {
    return Response.json({ error: 'API_UNAVAILABLE' }, { status: 503 });
  }

  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, upstream);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cookie');
  headers.delete('authorization');
  headers.delete('cf-connecting-ip');
  headers.delete('x-forwarded-for');
  headers.delete('x-forwarded-host');
  headers.delete('x-forwarded-proto');

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual'
    });
    const outgoing = new Headers(response.headers);
    outgoing.delete('set-cookie');
    outgoing.delete('access-control-allow-origin');
    outgoing.delete('access-control-allow-credentials');
    return new Response(response.body, { status: response.status, headers: outgoing });
  } catch {
    return Response.json({ error: 'API_UNAVAILABLE' }, { status: 502 });
  }
};
