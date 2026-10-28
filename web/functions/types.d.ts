// Minimal Cloudflare Pages context used by these handlers; no runtime dependency.
type PagesFunction<E = unknown> = (context: {
  request: Request; env: E; params: Record<string,string | string[]>;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  waitUntil: (promise: Promise<unknown>) => void;
}) => Response | Promise<Response>;
