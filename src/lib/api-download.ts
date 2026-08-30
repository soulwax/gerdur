import {existsSync, mkdirSync, writeFileSync} from 'fs';
import {dirname} from 'path';
import got from 'got';
import {getTrackDownloadUrl, addTrackTags, GeoBlocked} from 'gerdur-core';
import {decryptDownload} from './decrypt';
import {saveLayout} from './util';
import type {trackType} from 'gerdur-core/types';

/** Music quality accepted by the API. */
export type Quality = '128' | '320' | 'flac' | 1 | 3 | 9;

const QUALITY_MAP: {[key: string]: {q: number; ext: string; size: keyof trackType}} = {
  '1': {q: 1, ext: '.mp3', size: 'FILESIZE_MP3_128'},
  '128': {q: 1, ext: '.mp3', size: 'FILESIZE_MP3_128'},
  '3': {q: 3, ext: '.mp3', size: 'FILESIZE_MP3_320'},
  '320': {q: 3, ext: '.mp3', size: 'FILESIZE_MP3_320'},
  '9': {q: 9, ext: '.flac', size: 'FILESIZE_FLAC'},
  flac: {q: 9, ext: '.flac', size: 'FILESIZE_FLAC'},
};

const resolveQuality = (quality: Quality) => {
  const key = String(quality).toLowerCase();
  return QUALITY_MAP[key] ?? QUALITY_MAP['320'];
};

export interface GetTrackBufferOptions {
  /** Album cover size (px) embedded in tags. Default 500. */
  coverSize?: number;
  /**
   * If the requested quality is unavailable, try lower qualities (320 -> 128)
   * before giving up. Default true.
   */
  fallbackQuality?: boolean;
}

/**
 * Download, decrypt, and tag a single track entirely in memory.
 *
 * Returns the ready-to-write audio Buffer (MP3 or FLAC), or `null` if the track
 * is not available for download. Nothing is written to disk and nothing is
 * logged.
 *
 * @param track Track info (e.g. from `getTrackInfo` or `parseUrl`).
 * @param quality '128' | '320' | 'flac' (or numeric 1 | 3 | 9).
 */
export const getTrackBuffer = async (
  track: trackType,
  quality: Quality = '320',
  {coverSize = 500, fallbackQuality = true}: GetTrackBufferOptions = {},
): Promise<Buffer | null> => {
  const order: Quality[] = fallbackQuality ? [quality, '320', '128'] : [quality];
  const tried = new Set<number>();

  for (const q of order) {
    const {q: qNum} = resolveQuality(q);
    if (tried.has(qNum)) {
      continue;
    }
    tried.add(qNum);

    let trackData;
    try {
      trackData = await getTrackDownloadUrl(track, qNum);
    } catch (err) {
      if (err instanceof GeoBlocked) {
        throw err;
      }
      trackData = null;
    }
    if (!trackData) {
      continue;
    }

    const {body} = await got(trackData.trackUrl, {responseType: 'buffer'});
    const decrypted = trackData.isEncrypted ? decryptDownload(body, track.SNG_ID) : body;
    return addTrackTags(decrypted, track, coverSize);
  }

  return null;
};

export interface DownloadTrackOptions extends GetTrackBufferOptions {
  /**
   * Output file path or a `saveLayout` template (e.g. `{ART_NAME} - {SNG_TITLE}`).
   * The correct extension (`.mp3` / `.flac`) is appended automatically.
   * Default: `{ART_NAME} - {SNG_TITLE}`.
   */
  output?: string;
  /** Album info used to resolve album-level template tokens. */
  albumInfo?: {[key: string]: any};
  /** Prefix the filename with the track number. Default false. */
  trackNumber?: boolean;
  /** Re-download even if the destination file already exists. Default false. */
  overwrite?: boolean;
}

export interface DownloadResult {
  /** The path the file was written to (or would have been, if skipped). */
  path: string;
  /** True if the file was written; false if skipped because it already existed. */
  written: boolean;
}

/**
 * Download a single track to disk (silent). Resolves the destination path from
 * the `output` template, skips existing files unless `overwrite` is set, and
 * creates parent directories as needed.
 *
 * Returns `{path, written}`, or `null` if the track was not available.
 */
export const downloadTrackToFile = async (
  track: trackType,
  quality: Quality = '320',
  options: DownloadTrackOptions = {},
): Promise<DownloadResult | null> => {
  const {output = '{ART_NAME} - {SNG_TITLE}', albumInfo = {}, trackNumber = false, overwrite = false} = options;
  const {ext} = resolveQuality(quality);

  const savePath = saveLayout({track, album: albumInfo, path: output, trackNumber, minimumIntegerDigits: 2}) + ext;

  if (existsSync(savePath) && !overwrite) {
    return {path: savePath, written: false};
  }

  const buffer = await getTrackBuffer(track, quality, options);
  if (!buffer) {
    return null;
  }

  const dir = dirname(savePath);
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, {recursive: true});
  }
  writeFileSync(savePath, buffer);
  return {path: savePath, written: true};
};
