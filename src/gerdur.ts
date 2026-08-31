#!/usr/bin/env node
import {EOL} from 'os';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import {dirname, join, resolve, sep} from 'path';
import {Command} from 'commander';
import gradient from 'gradient-string';
import {
  getUser,
  initDeezerApi,
  searchMusic,
  getTrackInfo,
  getTrackByISRC,
  getAlbumByUPC,
  downloadPreview,
  parseInfo,
  getDiscography,
  resolveDownloadUrls,
} from 'gerdur-core';
import prompts from 'prompts';
import logUpdate from 'log-update';
import PQueue from 'p-queue';
import chalk from 'chalk';
import {trueCasePathSync} from 'true-case-path';
import signale from './lib/signale';
import downloadTrack from './lib/download-track';
import Config from './lib/config';
import updateCheck from './lib/update-check';
import autoUpdater from './lib/auto-updater';
import {ensureArl, recoverFromLoginFailure, runSetup} from './lib/arl-setup';
import {commonPath, formatSecondsReadable, sanitizeFilename, saveLayout as renderSaveLayout} from './lib/util';
import {advancedFiltersFromFlags, searchAdvancedTracks} from './lib/search';
import pkg from '../package.json';
import type {
  artistType,
  trackType,
  albumType,
  playlistInfo,
  playlistInfoMinimal,
  advancedSearchFilters,
  searchResultTrack,
} from 'gerdur-core/types';

// App info
console.log(
  gradient('red', 'yellow', 'orange')(`             ♥ gerdur - ${pkg.version} ♥         `) +
    '\n' +
    gradient('orange', 'yellow', 'red')(' ──────────────────────────────────────────────') +
    '\n' +
    gradient('red', 'yellow', 'orange')(' │ repo   https://github.com/soulwax/gerdur   │ ') +
    '\n' +
    gradient('red', 'yellow', 'orange')(' │ github https://github.com/soulwax        │ ') +
    '\n' +
    gradient('red', 'yellow', 'orange')(' ──────────────────────────────────────────────'),
);

const cmd = new Command()
  .option('-q, --quality <quality>', 'The quality of the files to download: 128/320/flac ')
  .option('-o, --output <template>', 'Output filename template')
  .option('-u, --url <url>', 'Deezer album/artist/playlist/track url')
  .option('-i, --input-file <file>', 'Downloads all urls listed in text file')
  .option('-c, --concurrency <number>', 'Download concurrency for album, artists and playlist')
  .option('-a, --set-arl <string>', 'Set arl cookie')
  .option('-s, --setup', 'Run guided first-time setup (enter your arl cookie)')
  .option('--experimental-login', 'Deprecated: email/password login is now offered by default')
  .option('-w, --overwrite', 'Re-download and overwrite files that already exist')
  .option('-d, --headless', 'Run in headless mode for scripting automation', false)
  .option('-conf, --config-file <file>', 'Custom location to your config file', 'gerdur.config.json')
  .option('-rfp, --resolve-full-path', 'Use absolute path for playlists')
  .option('-cp, --create-playlist', 'Force create a playlist file for non playlists')
  .option('--search <query>', 'Search tracks by free text (combine with the filters below)')
  .option('--artist <name>', 'Search filter: artist name')
  .option('--album <name>', 'Search filter: album title')
  .option('--track <name>', 'Search filter: track title')
  .option('--label <name>', 'Search filter: record label')
  .option('--bpm-min <n>', 'Search filter: minimum BPM')
  .option('--bpm-max <n>', 'Search filter: maximum BPM')
  .option('--dur-min <seconds>', 'Search filter: minimum duration')
  .option('--dur-max <seconds>', 'Search filter: maximum duration')
  .option('--search-limit <n>', 'Max search results to fetch', '50')
  .option('--preview', 'Download the 30-second preview clips instead of full tracks', false);

if ((process as any).pkg) {
  cmd.option('-U, --update', 'Update this program to latest version');
}

const options = cmd.parse(process.argv).opts();
// Support a bare `gerdur setup` subcommand as an alias for `--setup`.
if (cmd.args[0] && cmd.args[0].toLowerCase() === 'setup') {
  options.setup = true;
  cmd.args.shift();
}
if (!options.url && cmd.args[0]) {
  options.url = cmd.args[0];
}

const toFiniteNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const advancedFilters = advancedFiltersFromFlags(options);
let advancedFiltersConsumed = false;

if (options.headless && !options.quality && !options.preview) {
  console.error(signale.error('Missing parameters --quality'));
  console.error(signale.note('Quality must be provided with headless mode'));
  process.exit(1);
}
if (options.headless && !options.url && !options.inputFile && !advancedFilters) {
  console.error(signale.error('Missing parameters --url'));
  console.error(signale.note('Provide --url, --input-file, or a --search / --artist / … filter with headless mode'));
  process.exit(1);
}

const conf = new Config(options.configFile);
if (conf.userConfigLocation) {
  console.log(signale.info('Config loaded --> ' + conf.userConfigLocation));
}

const queue = new PQueue({concurrency: Number(options.concurrency || conf.get('concurrency'))});
const urlRegex = /https?:\/\/.*\w+\.\w+\/\w+/;

const onCancel = () => {
  console.info(signale.note('Aborted!'));
  process.exit();
};

type SearchData = {
  info: {type: 'track'; id: string};
  linktype: 'track';
  /* eslint-disable-next-line */
  linkinfo: {};
  tracks: trackType[];
};

const stampVersion = (t: trackType): trackType => {
  if (t.VERSION && !t.SNG_TITLE.includes(t.VERSION)) {
    t.SNG_TITLE += ' ' + t.VERSION;
  }
  return t;
};

/**
 * Run an advanced (public-REST) track search, let the user pick, and hydrate the
 * picks into download-ready gw tracks via `getTrackInfo`. Returns `null` when
 * nothing was matched or selected.
 */
const resolveAdvancedSearch = async (filters: advancedSearchFilters): Promise<SearchData | null> => {
  const limit = toFiniteNumber(options.searchLimit) ?? 50;
  const {data: results, query, usedFallback} = await searchAdvancedTracks(filters, {limit});
  if (!query) {
    return null;
  }
  console.log(signale.info(`Searching Deezer for: ${chalk.cyan(query)}`));
  if (usedFallback) {
    console.log(signale.note('No matches for the operators — retried as a plain-text search.'));
  }

  if (!results.length) {
    console.log(signale.warn('No tracks matched that search.'));
    return null;
  }

  let picks: searchResultTrack[] = results;
  if (!options.headless) {
    const choice: {items?: searchResultTrack[]} = await prompts(
      [
        {
          type: 'multiselect',
          name: 'items',
          message: `Select tracks to download. ${results.length} matched.`,
          choices: results.map((r) => ({
            title: `${r.title} — ${r.artist?.name ?? 'Unknown'}`,
            value: r,
            description: `Album: ${r.album?.title ?? 'Unknown'} · ${formatSecondsReadable(r.duration)}${
              r.explicit_lyrics ? ' · explicit' : ''
            }`,
          })),
        },
      ],
      {onCancel},
    );
    picks = choice.items ?? [];
  }
  if (!picks.length) {
    return null;
  }

  console.log(signale.info(`Fetching track data for ${picks.length} ${picks.length === 1 ? 'track' : 'tracks'}…`));
  const hydrated = await Promise.all(picks.map((r) => getTrackInfo(String(r.id)).catch(() => null)));
  const tracks = hydrated.filter((t): t is trackType => Boolean(t && t.SNG_ID)).map(stampVersion);
  if (!tracks.length) {
    console.log(signale.warn('None of the selected tracks could be resolved.'));
    return null;
  }

  return {info: {type: 'track', id: query}, linktype: 'track', linkinfo: {}, tracks};
};

/**
 * `--preview`: fetch the 30-second clip for each selected track and write it as
 * `<saveLayout path>.preview.mp3`. Bypasses the get_url / decrypt / tag pipeline
 * entirely — previews are plain, licence-free MP3s.
 */
const downloadPreviews = async (
  tracks: trackType[],
  info: any,
  template: string,
  totalTracks: number,
  trackNumber: boolean,
  overwrite: boolean,
): Promise<string[]> => {
  const saved: string[] = [];
  await queue.addAll(
    tracks.map((track, index) => async () => {
      const rel =
        renderSaveLayout({
          track,
          album: info,
          path: template,
          trackNumber,
          minimumIntegerDigits: totalTracks >= 100 ? 3 : 2,
        }) + '.preview.mp3';
      logUpdate(signale.pending(`(${index + 1}/${tracks.length}) ${track.ART_NAME} - ${track.SNG_TITLE}`));
      if (!overwrite && existsSync(rel)) {
        saved.push(rel);
        return;
      }
      try {
        const clip = await downloadPreview(track);
        if (!clip) {
          logUpdate(signale.warn(`No preview for ${track.SNG_TITLE}`));
          return;
        }
        mkdirSync(dirname(rel), {recursive: true});
        writeFileSync(rel, clip);
        saved.push(rel);
        logUpdate(signale.success(`${track.ART_NAME} - ${track.SNG_TITLE} (preview)`));
      } catch (err: any) {
        logUpdate(signale.error(`${track.SNG_TITLE}: ${err.message}`));
      }
    }),
  );
  logUpdate.done();
  return saved;
};

const startDownload = async (saveLayout: any, url: string, skipPrompt: boolean) => {
  try {
    url = url ?? '';
    if (!options.quality && !options.preview) {
      const {musicQuality} = await prompts(
        [
          {
            type: 'select',
            name: 'musicQuality',
            message: 'Select music quality:',
            choices: [
              {title: 'MP3  - 128 kbps', value: '128'},
              {title: 'MP3  - 320 kbps', value: '320'},
              {title: 'FLAC - 1411 kbps', value: 'flac'},
            ],
            initial: 1,
          },
        ],
        {onCancel},
      );
      options.quality = musicQuality;
    }

    let searchData: SearchData | null = null;

    // `--search` / `--artist` / `--bpm-min` … flags: structured search, no URL needed.
    // Consumed once — the interactive re-prompt loop must not re-run it.
    if (!url && advancedFilters && !advancedFiltersConsumed) {
      advancedFiltersConsumed = true;
      searchData = await resolveAdvancedSearch(advancedFilters);
      if (!searchData) {
        if (options.headless) {
          throw new Error('No tracks matched the search filters.');
        }
        return;
      }
    }

    if (!searchData && !url) {
      const {query} = await prompts(
        [
          {
            type: 'text',
            name: 'query',
            message: 'Enter a URL, a search term, or a `search:` / `isrc:` / `upc:` query:',
            validate: (value) => (value ? true : false),
          },
        ],
        {onCancel},
      );
      url = query;
    }

    // `search:` prefix — advanced track search from the prompt or `-u search:…`.
    if (!searchData && url && url.startsWith('search:')) {
      searchData = await resolveAdvancedSearch({query: url.slice('search:'.length).trim()});
      if (!searchData) {
        throw new Error('No tracks matched that search.');
      }
    }

    // `isrc:` / `upc:` — resolve a barcode to a Deezer track / album (works headless).
    if (!searchData && url && url.startsWith('isrc:')) {
      const code = url.slice('isrc:'.length).trim();
      const found = await getTrackByISRC(code).catch(() => null);
      if (!found) {
        throw new Error(`No Deezer track for ISRC ${code}`);
      }
      const track = await getTrackInfo(String(found.id));
      searchData = {info: {type: 'track', id: code}, linktype: 'track', linkinfo: {}, tracks: [stampVersion(track)]};
    }
    if (!searchData && url && url.startsWith('upc:')) {
      const code = url.slice('upc:'.length).trim();
      const found = await getAlbumByUPC(code).catch(() => null);
      if (!found) {
        throw new Error(`No Deezer album for UPC ${code}`);
      }
      console.log(signale.info(`UPC ${code} → ${found.title} (${found.nb_tracks} tracks)`));
      url = `https://www.deezer.com/album/${found.id}`;
    }

    if (!searchData && !url.match(urlRegex)) {
      if (options.headless) {
        throw new Error('Please provide a valid URL. Unknown URL: ' + url);
      }

      if (url.startsWith('artist:')) {
        const {ARTIST} = await searchMusic(url.replace('artist:', ''), ['ARTIST'], 50);
        const choice: {items: artistType} = await prompts(
          [
            {
              type: 'select',
              name: 'items',
              message: `Select one artist. (found ${ARTIST.data.length} artists)`,
              choices: ARTIST.data.map((a) => ({
                title: a.ART_NAME,
                value: a,
                description: `${a.NB_FAN} fans`,
              })),
            },
          ],
          {onCancel},
        );
        console.log(signale.info('Fetching data. Please hold on.'));
        url = `https://deezer.com/us/artist/${choice.items.ART_ID}`;
      } else if (url.startsWith('album:')) {
        const {ALBUM} = await searchMusic(url.replace('album:', ''), ['ALBUM'], 50);
        const choice: {items: albumType} = await prompts(
          [
            {
              type: 'select',
              name: 'items',
              message: `Select one album. (found ${ALBUM.data.length} albums)`,
              choices: ALBUM.data.map((a) => ({
                title: a.ALB_TITLE,
                value: a,
                description: `by ${a.ART_NAME}, ${a.NUMBER_TRACK} tracks`,
              })),
            },
          ],
          {onCancel},
        );
        url = `https://deezer.com/us/album/${choice.items.ALB_ID}`;
      } else if (url.startsWith('playlist:')) {
        const {PLAYLIST} = await searchMusic(url.replace('playlist:', ''), ['PLAYLIST'], 50);
        const choice: {items: playlistInfoMinimal} = await prompts(
          [
            {
              type: 'select',
              name: 'items',
              message: `Select one playlist. (found ${PLAYLIST.data.length} playlists)`,
              choices: PLAYLIST.data.map((p) => ({
                title: p.TITLE,
                value: p,
                description: `by ${p.PARENT_USERNAME}, ${p.NB_SONG} tracks`,
              })),
            },
          ],
          {onCancel},
        );
        url = `https://deezer.com/us/playlist/${choice.items.PLAYLIST_ID}`;
      } else {
        const {TRACK} = await searchMusic(url, ['TRACK']);
        searchData = {
          info: {type: 'track', id: url},
          linktype: 'track',
          linkinfo: {},
          tracks: TRACK.data.map(stampVersion),
        };
      }
    } else if (url.match(/playlist|artist/)) {
      console.log(signale.info('Fetching data. Please hold on.'));
    }

    const data = searchData ? searchData : await parseInfo(url);

    if (!options.headless && data.tracks.length > 1) {
      const choices: {items: trackType[]} = await prompts(
        [
          {
            type: 'multiselect',
            name: 'items',
            message: `Select songs to download. Total of ${data.tracks.length} tracks.`,
            choices: data.tracks.map((t) => ({
              title: t.SNG_TITLE,
              value: t,
              description: `Artist: ${t.ART_NAME}\nAlbum: ${t.ALB_TITLE}\nDuration: ${formatSecondsReadable(
                Number(t.DURATION),
              )}`,
            })),
          },
        ],
        {onCancel},
      );

      data.tracks = choices.items;
    }

    if (data && data.tracks.length > 0) {
      console.log(signale.info(`Proceeding to download ${data.tracks.length} tracks. Be patient.`));
      if (data.linktype === 'playlist') {
        const filteredTracks = data.tracks.filter(
          (item, index, self) => index === self.findIndex((t) => t.SNG_ID === item.SNG_ID),
        );
        const duplicateTracks = data.tracks.length - filteredTracks.length;
        if (duplicateTracks > 0) {
          data.tracks = filteredTracks
            .sort((a: any, b: any) => a.TRACK_POSITION - b.TRACK_POSITION)
            .map((t, i) => {
              t.TRACK_POSITION = i + 1;
              return t;
            });
          console.log(
            signale.warn(`Removed ${duplicateTracks} duplicate ${duplicateTracks > 1 ? 'tracks' : 'track'}.`),
          );
        }
      }

      const coverSizes = conf.get('coverSize') as any;
      const trackNumber = conf.get('trackNumber', true) as boolean;
      const fallbackTrack = conf.get('fallbackTrack', true) as boolean;
      const fallbackQuality = conf.get('fallbackQuality', true) as boolean;
      const lrc = conf.get('lyrics.lrcFile', true) as boolean;
      const overwrite: boolean = options.overwrite ?? conf.get('overwrite', false);
      const resolveFullPath: boolean = options.resolveFullPath ?? conf.get('playlist.resolveFullPath');
      const savedFiles: string[] = [];
      let m3u8: string[] = [];

      const layoutTemplate = options.output ? options.output : saveLayout[(data as any).linktype];

      if (options.preview) {
        const clips = await downloadPreviews(
          data.tracks,
          (data as any).linkinfo,
          layoutTemplate,
          data.tracks.length,
          trackNumber,
          overwrite,
        );
        savedFiles.push(...clips);
      } else {
        // One batched get_url for the whole selection instead of a request per track.
        // Deezer returns the best licensed format, so pass an ordered preference list.
        const QUALITY_PREF: {[k: string]: number[]} = {
          '1': [1],
          '128': [1],
          '3': [3, 1],
          '320': [3, 1],
          '9': [9, 3, 1],
          flac: [9, 3, 1],
        };
        const prefetchedUrls = new Map<
          string,
          {trackUrl: string; isEncrypted: boolean; fileSize: number; format: string}
        >();
        if (data.tracks.length > 1 && !process.env.SIMULATE) {
          try {
            const base = QUALITY_PREF[String(options.quality).toLowerCase()] ?? [3, 1];
            const pref = fallbackQuality ? base : [base[0]];
            const resolved = await resolveDownloadUrls(data.tracks, pref);
            resolved.forEach((r, i) => {
              if (r) {
                prefetchedUrls.set(data.tracks[i].SNG_ID, r);
              }
            });
          } catch {
            // batch resolve failed wholesale — every track falls back to per-track resolution
          }
        }

        await queue.addAll(
          data.tracks.map((track, index) => {
            return async () => {
              const savedPath = await downloadTrack({
                track,
                quality: options.quality,
                info: (data as any).linkinfo,
                coverSizes,
                path: layoutTemplate,
                totalTracks: data ? data.tracks.length : 10,
                trackNumber,
                fallbackTrack,
                fallbackQuality,
                overwrite,
                message: `(${index}/${(data as any).tracks.length})`,
                lrc,
                prefetched: prefetchedUrls.get(track.SNG_ID) ?? null,
              });

              // Add to saved list
              if (savedPath) {
                m3u8.push(resolve(process.env.SIMULATE ? savedPath : trueCasePathSync(savedPath)));
                savedFiles.push(savedPath);
              }
            };
          }),
        );
      }

      // Display downloaded location
      if (savedFiles.length > 0) {
        const savedIn = new Set(savedFiles.map((l) => dirname(l)));
        console.log(signale.info('Saved in ' + [...savedIn].map((d) => chalk.bgGreen(d)).join(', ')));
      }

      if ((options.createPlaylist || data.linktype === 'playlist') && !process.env.SIMULATE && m3u8.length > 1) {
        const playlistDir = commonPath([...new Set(savedFiles.map(dirname))]);
        const playlistFile = join(
          playlistDir,
          sanitizeFilename((data.linkinfo as any).TITLE || (data.linkinfo as any).ALB_TITLE),
        );
        if (!resolveFullPath) {
          const resolvedPlaylistDir = resolve(playlistDir) + sep;
          m3u8 = m3u8.map((file) => file.replace(resolvedPlaylistDir, ''));
        }
        const m3u8Content = '#EXTM3U' + EOL + m3u8.sort().join(EOL);
        writeFileSync(playlistFile + '.m3u8', m3u8Content, {encoding: 'utf-8'});
      }
    } else {
      console.log(signale.info('No items to download!'));
    }
  } catch (err: any) {
    console.error(signale.error(err.message));
  }

  // Ask for new download
  if (!options.headless && !skipPrompt) {
    startDownload(saveLayout, '', skipPrompt);
  }
};

/**
 * Application init.
 */
const initApp = async () => {
  if (options.setup) {
    await runSetup(conf, options.headless, options.experimentalLogin);
    return;
  }

  if (options.setArl) {
    const configPath = conf.set('cookies.arl', options.setArl);
    console.log(signale.info('cookies.arl set to --> ' + options.setArl));
    console.log(signale.note(configPath));
    process.exit();
  }

  logUpdate(signale.pending('Initializing session...'));
  let arl = await ensureArl(conf, options.headless, options.experimentalLogin);

  const login = async (cookie: string) => {
    logUpdate(signale.pending('Verifying session...'));
    await initDeezerApi(cookie);
    return getUser();
  };

  let user;
  try {
    user = await login(arl);
  } catch (err: any) {
    logUpdate.clear();
    const newArl = await recoverFromLoginFailure(conf, options.headless, err, options.experimentalLogin);
    if (!newArl) {
      throw err;
    }
    arl = newArl;
    user = await login(arl);
  }

  logUpdate(signale.success('Logged in as ' + user.BLOG_NAME));
  logUpdate.done();

  const saveLayout: any = conf.get('saveLayout');
  if (options.inputFile) {
    const urls = readFileSync(options.inputFile, 'utf-8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.match(urlRegex));

    if (!options.quality && !options.headless) {
      for (const url of urls) {
        console.log(signale.info('Starting download: ' + url));
        await startDownload(saveLayout, url, true);
      }
    } else {
      await Promise.all(
        urls.map((url) => {
          console.log(signale.info('Starting download: ' + url));
          return startDownload(saveLayout, url, true);
        }),
      );
    }
  } else {
    startDownload(saveLayout, options.url, false);
  }
};

if (options.update) {
  autoUpdater(pkg).catch((err) => {
    console.error(signale.error(err.message));
    process.exit(1);
  });
} else {
  // Check for update
  updateCheck(pkg);

  // Init interface
  initApp().catch((err) => {
    console.error(signale.error(err.message));
    process.exit(1);
  });
}
