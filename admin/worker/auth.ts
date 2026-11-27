// Who is calling. Cloudflare Access sits in front of the admin and signs every
// request it lets through; the Worker checks that signature again, so the API
// stays closed even if the Access policy is ever loosened by mistake.
import type { Env } from './env';

type Jwk = JsonWebKey & { kid: string };
let certs: { at: number; keys: Jwk[] } | null = null;

const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));

async function accessKeys(team: string): Promise<Jwk[]> {
  if (certs && Date.now() - certs.at < 10 * 60_000) return certs.keys;
  const res = await fetch(`${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`Access certs answered ${res.status}`);
  const body = (await res.json()) as { keys: Jwk[] };
  certs = { at: Date.now(), keys: body.keys };
  return body.keys;
}

/** The signed-in user's email, or null when the request is not from Access. */
export async function currentUser(request: Request, env: Env): Promise<string | null> {
  // Local development only: .dev.vars sets DEV_USER, which never exists in production.
  if (env.DEV_USER) return env.DEV_USER;
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return null;
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64url(h)));
    const payload = JSON.parse(new TextDecoder().decode(b64url(p)));
    const jwk = (await accessKeys(env.ACCESS_TEAM_DOMAIN)).find((k) => k.kid === header.kid);
    if (!jwk || header.alg !== 'RS256') return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(s), new TextEncoder().encode(`${h}.${p}`));
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!ok || !aud.includes(env.ACCESS_AUD) || payload.exp * 1000 < Date.now()) return null;
    return String(payload.email || payload.sub || '');
  } catch {
    return null;
  }
}
