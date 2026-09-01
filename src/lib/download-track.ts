/* eslint-disable @typescript-eslint/no-var-requires */
// `got` costs ~53 ms to require and is only needed once a transfer actually
// starts — deferring it keeps `--help`, setup and the interactive prompt snappy.
const got = (): typeof import('got').default => require('got');
import stream from 'stream';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  createReadStream,
  createWriteStream,
  renameSync,
  statSync,
  unlinkSync,
} from 'fs';
import {promisify} from 'util';
import {dirname} from 'path';
import {
  GeoBlocked,
  getTrackDownloadUrl,
  resolveTagModel,
  createTagStream,
  createDecryptStream,
  httpAgent,
  httpsAgent,
  getBuffer,
  getCoverArtByISRC,
} from 'gerdur-core';
import logUpdate from 'log-update';
import chalk from 'chalk';
import signale from '../lib/signale';
import {saveLayout, progressBar} from './util';
import type {trackType} from 'gerdur-core/types';

const pipeline = promisify(stream.pipeline);
const simulate = process.env.SIMULATE;

/** media-API format string -> gerdur's numeric quality */
const FORMAT_TO_QUALITY: {[format: string]: number} = {FLAC: 9, MP3_320: 3, MP3_256: 3, MP3_128: 1, MP3_64: 1};

interface downloadTrackProps {
  track: trackType;
  quality: string | number;
  info: {[key: string]: any};
  coverSizes: {
    '128': number;
    '320': number;
    flac: number;
  };
  path: string;
  totalTracks: number;
  trackNumber?: boolean;
  fallbackTrack?: boolean;
  fallbackQuality?: boolean;
  isFallback?: boolean;
  isQualityFallback?: boolean;
  overwrite?: boolean;
  message?: string;
  /** Write a `.lrc` sidecar for tracks with time-synced lyrics. Default true. */
  lrc?: boolean;
  /**
   * Replace Deezer's cover art with a higher-resolution one from the Cover Art
   * Archive (looked up via the track's ISRC on MusicBrainz). Falls back silently
   * to Deezer's cover if there's no match. Off by default.
   */
  enrich?: boolean;
  /**
   * Skip the expensive per-track metadata: full credits, BPM, and the Musixmatch
   * fallback for tracks Deezer has no lyrics for. Measured on a 14-track album
   * that is 54 requests down to 7 — 81% fewer against Deezer's rate limit — at
   * the cost of those fields. Off by default.
   */
  fast?: boolean;
  /**
   * A download URL already resolved for this track by a batch `resolveDownloadUrls`
   * pass. When set, the per-track `get_url` request and quality-fallback round-trips
   * are skipped and `quality` is taken from the format Deezer actually granted.
   * Falls through to the normal path when absent or `null` (track not in the batch).
   */
  prefetched?: {trackUrl: string; isEncrypted: boolean; fileSize: number; format: string} | null;
}

const downloadTrack = async ({
  track,
  quality,
  info,
  coverSizes,
  path,
  totalTracks,
  trackNumber = true,
  fallbackTrack = true,
  fallbackQuality = true,
  isFallback = false,
  isQualityFallback = false,
  overwrite = false,
  message = '',
  lrc = true,
  enrich = false,
  fast = false,
  prefetched = null,
}: downloadTrackProps): Promise<string | undefined> => {
  logUpdate(signale.pending(track.SNG_TITLE + ' by ' + track.ART_NAME + ' from ' + track.ALB_TITLE));
  try {
    let ext = '.mp3',
      fileSize = 0,
      downloaded = 0,
      coverSize = 500;

    // A batch resolve already picked the best licensed format for this track —
    // align `quality` with it so the extension, cover size and file size match.
    if (prefetched && FORMAT_TO_QUALITY[prefetched.format]) {
      quality = FORMAT_TO_QUALITY[prefetched.format];
    }

    switch (quality) {
      case 1:
      case '1':
      case '128':
      case 'MP3_128':
      case '128kbps':
        quality = 1;
        fileSize = Number(track.FILESIZE_MP3_128);
        coverSize = coverSizes['128'];
        break;
      case 9:
      case '9':
      case 'flac':
      case 'Flac':
      case 'FLAC':
        quality = 9;
        ext = '.flac';
        fileSize = Number(track.FILESIZE_FLAC);
        coverSize = coverSizes['flac'];
        break;
      default:
        quality = 3;
        fileSize = Number(track.FILESIZE_MP3_320);
        coverSize = coverSizes['320'];
    }

    const savePath =
      saveLayout({track, album: info, path, trackNumber, minimumIntegerDigits: totalTracks >= 100 ? 3 : 2}) + ext;
    if (existsSync(savePath) && !overwrite) {
      logUpdate(signale.info(`Skipped "${track.SNG_TITLE}", track already exists.`));
      logUpdate.done();
      logUpdate(signale.note(savePath));
      logUpdate.done();
      return savePath;
    }

    let trackData;
    if (prefetched) {
      trackData = prefetched;
    } else {
      try {
        trackData = await getTrackDownloadUrl(track, quality);
      } catch (err) {
        if (!(err instanceof GeoBlocked) || !track.FALLBACK) {
          throw err;
        }
      }
    }

    if (!trackData) {
      if (fallbackTrack && track.FALLBACK && !isFallback && track.ART_ID === track.FALLBACK.ART_ID) {
        const {FALLBACK, ...CURRENT_TRACK} = track;
        return await downloadTrack({
          track: {...CURRENT_TRACK, ...FALLBACK},
          quality,
          info,
          coverSizes,
          path,
          totalTracks,
          trackNumber,
          fallbackTrack: false,
          isFallback: true,
          overwrite,
          message,
          lrc,
        });
      } else if (fallbackQuality && quality !== 1) {
        return await downloadTrack({
          track,
          quality: quality === 9 ? 3 : 1,
          info,
          coverSizes,
          path,
          totalTracks,
          trackNumber,
          fallbackTrack,
          isFallback,
          isQualityFallback: true,
          overwrite,
          message,
          lrc,
        });
      }
      logUpdate(signale.warn(`Skipped "${track.SNG_TITLE}", track not available.`));
      logUpdate.done();
      return;
    }

    const headers: {[key: string]: string} = {};
    const tmpfile = `gerdur_${quality}_${track.SNG_ID}_${simulate ? 'simulate' : track.MD5_ORIGIN}`;
    if (simulate) {
      coverSize = 56;
      headers.range = 'bytes=0-1023';
    } else if (existsSync(tmpfile)) {
      const tmpfilestat = statSync(tmpfile);
      downloaded = tmpfilestat.size;
      headers.range = 'bytes=' + tmpfilestat.size + '-';
    }

    fileSize = trackData.fileSize;
    const bar = progressBar(fileSize, 40);
    const humanSizeTotal = (fileSize / 1024 / 1024).toFixed(2);
    let transferredLast = downloaded;
    await pipeline(
      got()
        .stream(trackData.trackUrl, {
          responseType: 'buffer',
          headers,
          agent: {http: httpAgent, https: httpsAgent},
        })
        .on('downloadProgress', ({transferred}) => {
          // Report download progress
          transferred += downloaded;
          if (transferred - transferredLast > 50000) {
            transferredLast = transferred;
            logUpdate(
              signale.info(`Downloading ${track.SNG_TITLE} ${message}\n  ${bar(transferred)} | ${humanSizeTotal}MiB`),
            );
          }
        }),
      createWriteStream(tmpfile, {flags: 'a', autoClose: true}),
    );

    let enrichedCover: Buffer | undefined;
    if (enrich && track.ISRC && !simulate) {
      try {
        const coverUrl = await getCoverArtByISRC(track.ISRC, {minSize: 1200});
        if (coverUrl) {
          enrichedCover = await getBuffer(coverUrl);
          logUpdate(signale.note(`Using a higher-res cover from the Cover Art Archive for ${track.SNG_TITLE}`));
        }
      } catch {
        // MusicBrainz / CAA unavailable or no match — keep Deezer's cover
      }
    }

    logUpdate(signale.pending('Tagging ' + track.SNG_TITLE + ' by ' + track.ART_NAME));
    // Resolve the metadata first, without touching the audio — the tags are then
    // written by a stream, so the track is never held in memory.
    const model = await resolveTagModel(track, {
      coverSize,
      ...(fast ? {richCredits: false, lyricsFallback: false} : {}),
      ...(enrichedCover ? {cover: enrichedCover} : {}),
    });

    logUpdate(signale.pending('Saving ' + track.SNG_TITLE + ' by ' + track.ART_NAME));
    if (!simulate) {
      // Create directory if not exists
      const dir = dirname(savePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, {recursive: true});
      }

      // One pass: temp file -> decrypt -> tag -> destination. Peak memory is a
      // couple of stripes plus the cover, instead of the whole track two or
      // three times over. `.part` then rename so an interrupted run never
      // leaves a half-written track behind.
      const partPath = savePath + '.part';
      const stages: any[] = [createReadStream(tmpfile)];
      if (trackData.isEncrypted) {
        stages.push(createDecryptStream(track.SNG_ID));
      }
      stages.push(createTagStream(model), createWriteStream(partPath));
      try {
        await (pipeline as any)(...stages);
      } catch (err) {
        if (existsSync(partPath)) {
          unlinkSync(partPath);
        }
        throw err;
      }
      renameSync(partPath, savePath);

      if (lrc !== false && model.lyricsSynced) {
        writeFileSync(savePath.replace(/\.(mp3|flac)$/i, '.lrc'), model.lyricsSynced);
      }
    }

    // Delete temporary file now
    unlinkSync(tmpfile);

    // Print sucess info
    logUpdate(
      signale.success(`${isFallback ? chalk.yellow('[Fallback] ') : ''}${track.SNG_TITLE} by ${track.ART_NAME}`),
    );
    logUpdate.done();
    if (isQualityFallback) {
      logUpdate(signale.note(`Used ${quality === 3 ? '320kbps' : '128kbps'} as other formats were unavailable`));
      logUpdate.done();
    }
    return savePath;
  } catch (err: any) {
    logUpdate(signale.error(track.SNG_TITLE));
    logUpdate.done();
    logUpdate(signale.note(err.message));
    logUpdate.done();
  }
};

export default downloadTrack;
