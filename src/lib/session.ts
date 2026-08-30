import PQueue from 'p-queue';
import {initDeezerApi, getUser, parseInfo, searchMusic} from 'gerdur-core';
import {loginWithEmail} from './email-login';
import {getTrackBuffer, downloadTrackToFile} from './api-download';
import type {Quality, DownloadTrackOptions, DownloadResult} from './api-download';
import type {trackType, userType} from 'gerdur-core/types';

/** Search result categories accepted by {@link Session.search}. */
export type SearchType =
  | 'ALBUM'
  | 'ARTIST'
  | 'TRACK'
  | 'PLAYLIST'
  | 'RADIO'
  | 'SHOW'
  | 'USER'
  | 'LIVESTREAM'
  | 'CHANNEL';

export interface SessionOptions {
  /** Deezer arl cookie. Provide this OR email+password. */
  arl?: string;
  /** Deezer account email (used with `password` to fetch an arl). */
  email?: string;
  /** Deezer account password. */
  password?: string;
  /** Default download concurrency for `downloadTracks`. Default 4. */
  concurrency?: number;
}

export interface DownloadTracksOptions extends DownloadTrackOptions {
  /** Concurrent downloads. Defaults to the session concurrency. */
  concurrency?: number;
  /**
   * Called after each track settles, with the running progress. `result` is the
   * download result (or `null` if the track was unavailable / errored).
   */
  onProgress?: (progress: {index: number; total: number; track: trackType; result: DownloadResult | null}) => void;
}

/**
 * An authenticated Deezer session exposing high-level query and download
 * helpers. Create one with {@link createSession}. All methods are silent (no
 * console output); use `onProgress` callbacks for progress.
 */
export class Session {
  /** The arl in use for this session. */
  public readonly arl: string;
  private concurrency: number;

  private constructor(arl: string, concurrency: number) {
    this.arl = arl;
    this.concurrency = concurrency;
  }

  /**
   * Log in and return a ready-to-use session. Accepts either an `arl` or
   * `email`+`password` (which are exchanged for an arl via Deezer's OAuth flow).
   */
  static async create(options: SessionOptions): Promise<Session> {
    let arl = options.arl?.trim();

    if (!arl && options.email && options.password) {
      const result = await loginWithEmail(options.email, options.password);
      if (!result.ok) {
        throw new Error(`Login failed (${result.reason}): ${result.message}`);
      }
      arl = result.arl;
    }

    if (!arl) {
      throw new Error('createSession requires either an arl or email + password.');
    }

    await initDeezerApi(arl);
    // Verify the session is actually usable before handing it back.
    await getUser();
    return new Session(arl, options.concurrency ?? 4);
  }

  /** Fetch the logged-in user profile. */
  getUser(): Promise<userType> {
    return getUser();
  }

  /**
   * Resolve any supported URL (Deezer/Spotify/Tidal track, album, playlist, or
   * artist) into its info + track list.
   */
  parseUrl(url: string): ReturnType<typeof parseInfo> {
    return parseInfo(url);
  }

  /** Search Deezer. Defaults to track results. */
  search(query: string, types: SearchType[] = ['TRACK'], limit?: number): ReturnType<typeof searchMusic> {
    return searchMusic(query, types as any, limit);
  }

  /** Return a fully tagged audio Buffer for a track (nothing written to disk). */
  getTrackBuffer(track: trackType, quality: Quality = '320', options = {}): Promise<Buffer | null> {
    return getTrackBuffer(track, quality, options);
  }

  /** Download a single track to disk. */
  downloadTrack(
    track: trackType,
    quality: Quality = '320',
    options: DownloadTrackOptions = {},
  ): Promise<DownloadResult | null> {
    return downloadTrackToFile(track, quality, options);
  }

  /**
   * Download many tracks with bounded concurrency. Resolves to one result per
   * input track (in the original order); entries are `null` for tracks that
   * were unavailable or errored. Progress is reported via `onProgress`.
   */
  async downloadTracks(
    tracks: trackType[],
    quality: Quality = '320',
    options: DownloadTracksOptions = {},
  ): Promise<(DownloadResult | null)[]> {
    const {concurrency = this.concurrency, onProgress, ...trackOptions} = options;
    const queue = new PQueue({concurrency});
    const total = tracks.length;
    const results: (DownloadResult | null)[] = new Array(total).fill(null);

    await queue.addAll(
      tracks.map((track, index) => async () => {
        let result: DownloadResult | null = null;
        try {
          result = await downloadTrackToFile(track, quality, trackOptions);
        } catch {
          result = null;
        }
        results[index] = result;
        if (onProgress) {
          onProgress({index, total, track, result});
        }
      }),
    );

    return results;
  }

  /**
   * Convenience: resolve a URL and download all of its tracks in one call.
   * Uses the linked album/playlist info for filename templating.
   */
  async downloadUrl(
    url: string,
    quality: Quality = '320',
    options: DownloadTracksOptions = {},
  ): Promise<(DownloadResult | null)[]> {
    const data = await parseInfo(url);
    const albumInfo = (data as any).linkinfo ?? {};
    return this.downloadTracks(data.tracks, quality, {albumInfo, ...options});
  }
}

/**
 * Create and log in an authenticated {@link Session}.
 *
 * @example
 * ```ts
 * const session = await createSession({arl: '...'});          // or {email, password}
 * const {tracks, linkinfo} = await session.parseUrl(url);
 * await session.downloadTracks(tracks, 'flac', {
 *   output: 'Music/{ALB_TITLE}/{SNG_TITLE}',
 *   onProgress: ({index, total}) => console.log(`${index + 1}/${total}`),
 * });
 * ```
 */
export const createSession = (options: SessionOptions): Promise<Session> => Session.create(options);
