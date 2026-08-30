/**
 * Public library entry point for `gerdur`.
 *
 * This module is safe to `import`/`require` from other packages — unlike the
 * CLI entry (`gerdur.ts`), importing it has no side effects (no banner, no
 * argument parsing, no process exit). All functions are silent; progress is
 * surfaced through optional callbacks.
 *
 * @example High-level usage
 * ```ts
 * import {createSession} from 'gerdur';
 *
 * const session = await createSession({email: 'you@example.com', password: 'secret'});
 * await session.downloadUrl('https://deezer.com/album/302127', 'flac', {
 *   output: 'Music/{ALB_TITLE}/{SNG_TITLE}',
 *   onProgress: ({index, total, track}) => console.log(`${index + 1}/${total} ${track.SNG_TITLE}`),
 * });
 * ```
 *
 * @example Low-level usage
 * ```ts
 * import {getArl, getTrackBuffer} from 'gerdur';
 * import {initDeezerApi, getTrackInfo} from 'gerdur';
 *
 * const arl = await getArl('you@example.com', 'secret');
 * await initDeezerApi(arl);
 * const track = await getTrackInfo('3135556');
 * const mp3 = await getTrackBuffer(track, '320'); // Buffer, not written to disk
 * ```
 */

// ─── Authentication ────────────────────────────────────────────────────────

import {loginWithEmail} from './lib/email-login';
import type {LoginResult} from './lib/email-login';

export {loginWithEmail};
export type {LoginResult};

/**
 * Thrown by {@link getArl} when an email/password login does not yield an arl.
 * `reason` mirrors the failure reason from {@link LoginResult}.
 */
export class LoginError extends Error {
  public readonly reason: Exclude<LoginResult, {ok: true}>['reason'];

  constructor(reason: Exclude<LoginResult, {ok: true}>['reason'], message: string) {
    super(message);
    this.name = 'LoginError';
    this.reason = reason;
  }
}

/**
 * Fetch a Deezer `arl` from email and password.
 *
 * Convenience wrapper around {@link loginWithEmail} that returns the arl string
 * directly and throws a {@link LoginError} on failure. The password is never
 * persisted or logged by this call.
 *
 * @throws {LoginError} If authentication fails or no arl could be retrieved.
 */
export const getArl = async (email: string, password: string): Promise<string> => {
  const result = await loginWithEmail(email, password);
  if (result.ok) {
    return result.arl;
  }
  throw new LoginError(result.reason, result.message);
};

// ─── High-level session ──────────────────────────────────────────────────────

export {createSession, Session} from './lib/session';
export type {SessionOptions, DownloadTracksOptions, SearchType} from './lib/session';

// ─── Download primitives ─────────────────────────────────────────────────────

export {getTrackBuffer, getTaggedTrack, downloadTrackToFile} from './lib/api-download';
export type {Quality, GetTrackBufferOptions, DownloadTrackOptions, DownloadResult} from './lib/api-download';

// ─── Config ──────────────────────────────────────────────────────────────────

// The same config the CLI uses (env var, global path resolution, arl storage).
export {default as Config, globalConfigPath, resolveConfigFile} from './lib/config';

// ─── Re-exported core query functions ────────────────────────────────────────

// Convenience re-exports so consumers don't need `gerdur-core` directly.
// After `initDeezerApi(arl)` (or `createSession`) these are ready to use.
export {
  initDeezerApi,
  parseInfo,
  searchMusic,
  getUser,
  getTrackInfo,
  getAlbumInfo,
  getAlbumTracks,
  getPlaylistInfo,
  getPlaylistTracks,
  getArtistInfo,
  getDiscography,
  getLyrics,
  getTrackDownloadUrl,
  resolveDownloadUrls,
  addTrackTags,
  getRichAlbum,
  normalizeContributors,
  toLrc,
  GeoBlocked,
} from 'gerdur-core';
export type {
  AddTrackTagsOptions,
  TaggedTrack,
  TrackTagModel,
  RichAlbum,
  ResolvedUrl,
  NormalizedContributors,
} from 'gerdur-core';
