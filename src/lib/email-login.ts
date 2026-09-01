import {createHash} from 'crypto';
/* eslint-disable @typescript-eslint/no-var-requires */
// `got` costs ~53 ms to require and is only needed once a transfer actually
// starts — deferring it keeps `--help`, setup and the interactive prompt snappy.
const got = (): typeof import('got').default => require('got');

/**
 * Email/password -> arl login for Deezer.
 *
 * Uses Deezer's mobile OAuth endpoint (connect.deezer.com/oauth/user_auth.php)
 * rather than the web login form, which is bot-protected. The approach and the
 * public app credentials/hash scheme mirror the well-known deemix flow.
 *
 * This is still best-effort: Deezer may reject the login (bad credentials,
 * account protections, or changes on their side), in which case the caller
 * should fall back to pasting an arl. Passwords handled here are never persisted
 * or logged; only the resulting arl is returned.
 */

// Public Deezer app credentials used by the mobile OAuth flow (same values used
// by deemix and similar tools). Not secret in any meaningful sense.
const CLIENT_ID = '447462';
const CLIENT_SECRET = 'a83bf7f38ad2f137e444727cfc3775cf';

const UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0';

/** Discriminated result so the caller can branch on the failure reason. */
export type LoginResult =
  | {ok: true; arl: string}
  /**
   * `rejected` means Deezer refused the login. It deliberately does **not** say
   * "wrong password": the endpoint returns an identical error (code 160) for a
   * real account, a wrong password and an address that does not exist, so the
   * cause genuinely cannot be told apart from here.
   */
  | {ok: false; reason: 'rejected' | 'no-arl' | 'network' | 'unknown'; message: string};

/**
 * Deezer's `user_auth.php` error codes, as far as they can be told apart.
 * `150` proves the request itself was well formed, which is how we know a `160`
 * is about the account rather than the app hash.
 */
const AUTH_WRONG_HASH = 150;
const AUTH_FAILED = 160;

const md5 = (data: string): string => createHash('md5').update(Buffer.from(data, 'utf8')).digest('hex');

/**
 * Merge `set-cookie` response headers into a cookie map (last value wins),
 * emulating a cookie jar shared across the login requests.
 */
const collectCookies = (jar: Map<string, string>, setCookie?: string[]): void => {
  if (!setCookie) {
    return;
  }
  for (const raw of setCookie) {
    const [pair] = raw.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) {
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (name) {
        jar.set(name, value);
      }
    }
  }
};

const cookieHeader = (jar: Map<string, string>): string => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

/**
 * Attempt to obtain an arl for the given credentials.
 *
 * The password is MD5-hashed and folded into the app hash before transmission;
 * it is never written anywhere by this function.
 */
export const loginWithEmail = async (email: string, password: string): Promise<LoginResult> => {
  const jar = new Map<string, string>();

  try {
    // 1. Bootstrap a session so Deezer sets an initial sid cookie.
    const boot = await got()('https://www.deezer.com', {
      method: 'POST',
      headers: {'User-Agent': UA},
      timeout: {request: 15000},
      throwHttpErrors: false,
    });
    collectCookies(jar, boot.headers['set-cookie'] as string[] | undefined);

    // 2. Authenticate via the mobile OAuth endpoint. The password is hashed,
    //    then combined with the public app id/secret into the request hash.
    const passwordHash = md5(password);
    const hash = md5([CLIENT_ID, email, passwordHash, CLIENT_SECRET].join(''));

    let accessToken: string | null = null;
    const auth = await got()('https://connect.deezer.com/oauth/user_auth.php', {
      searchParams: {app_id: CLIENT_ID, login: email, password: passwordHash, hash},
      headers: {'User-Agent': UA, cookie: cookieHeader(jar)},
      responseType: 'json',
      timeout: {request: 15000},
      throwHttpErrors: false,
    });
    collectCookies(jar, auth.headers['set-cookie'] as string[] | undefined);
    const authBody = (auth.body as any) ?? {};
    if (authBody.access_token && authBody.access_token !== 'undefined') {
      accessToken = authBody.access_token;
    }

    if (!accessToken && !jar.has('arl') && (authBody.error || auth.statusCode >= 400)) {
      const code = authBody?.error?.code;
      if (code === AUTH_WRONG_HASH) {
        return {
          ok: false,
          reason: 'unknown',
          message: 'Deezer rejected the request signature — the login flow has changed. Please paste an arl instead.',
        };
      }
      return {
        ok: false,
        reason: 'rejected',
        message:
          code === AUTH_FAILED
            ? 'Deezer refused the login. It returns this same response for a wrong password and for an address ' +
              'that does not exist, and it currently refuses valid credentials too, so this is most likely the ' +
              'flow being closed rather than anything wrong with your details. Paste an arl instead.'
            : 'Deezer refused the login. Paste an arl instead.',
      };
    }

    // 3. Read the arl for the now-authenticated session.
    const arlResp = await got()('https://www.deezer.com/ajax/gw-light.php', {
      searchParams: {method: 'user.getArl', input: 3, api_version: '1.0', api_token: 'null'},
      headers: {'User-Agent': UA, cookie: cookieHeader(jar)},
      responseType: 'json',
      timeout: {request: 15000},
      throwHttpErrors: false,
    });
    collectCookies(jar, arlResp.headers['set-cookie'] as string[] | undefined);

    const arl: unknown = (arlResp.body as any)?.results;
    if (typeof arl === 'string' && arl.length === 192) {
      return {ok: true, arl};
    }
    if (jar.has('arl') && (jar.get('arl') as string).length === 192) {
      return {ok: true, arl: jar.get('arl') as string};
    }

    return {
      ok: false,
      reason: 'no-arl',
      message: 'Logged in but could not retrieve an arl. Please paste your arl instead.',
    };
  } catch (err: any) {
    return {ok: false, reason: 'network', message: err?.message || 'Network error during login.'};
  }
};
