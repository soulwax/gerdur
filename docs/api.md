# Programmatic API

`gerdur` can be used as a library, not just a CLI. Importing it has **no
side effects** (no banner, no argument parsing, no `process.exit`) and produces
**no console output** — progress is delivered through callbacks. Both ESM and
CommonJS are supported.

```ts
import {createSession} from 'gerdur';         // ESM
const {createSession} = require('gerdur');    // CommonJS
```

See runnable scripts in [`examples/`](../examples).

> Purchase the music you love to support the artists.

## Contents

- [Sessions](#sessions) — the high-level entry point
- [Download primitives](#download-primitives)
- [Authentication](#authentication)
- [Config](#config)
- [Re-exported query functions](#re-exported-query-functions)
- [Types](#types)

---

## Sessions

### `createSession(options): Promise<Session>`

Logs in, verifies the session, and returns a [`Session`](#class-session). Accepts
either an `arl` or `email` + `password`.

```ts
const session = await createSession({arl: 'your_arl'});
// or
const session = await createSession({email: 'you@example.com', password: 'secret'});
```

**`SessionOptions`**

| Field | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `arl` | `string` | — | Deezer arl cookie. Provide this **or** email+password. |
| `email` | `string` | — | Deezer account email (exchanged for an arl). |
| `password` | `string` | — | Deezer account password (used only to authenticate). |
| `concurrency` | `number` | `4` | Default concurrency for `downloadTracks` / `downloadUrl`. |

Throws if neither an `arl` nor email+password is provided, or if login fails.

### class `Session`

| Method | Returns | Description |
| :--- | :--- | :--- |
| `parseUrl(url)` | `Promise<{tracks, linkinfo, linktype, ...}>` | Resolve any Deezer/Spotify/Tidal URL into info + track list. |
| `search(query, types?, limit?)` | `Promise<searchType>` | Search Deezer (internal `pageSearch`). `types` defaults to `['TRACK']`. |
| `searchAdvanced(filters, opts?)` | `Promise<publicApiSearchResponse<searchResultTrack>>` | Structured public-REST track search — `{query?, artist?, album?, track?, label?, durMin?, durMax?, bpmMin?, bpmMax?}` + `{order?, strict?, limit?, index?, fallback?}`. `fallback` (default `true`) retries an empty operator result as plain text. Returns public-API tracks (`isrc`, `preview`); fetch a hit's gw track with `getTrackInfo(id)` to download. |
| `suggest(query, nb?)` | `Promise<suggestResult>` | `deezer.suggest` autocomplete (gw-shaped per-type arrays). |
| `genres()` | `Promise<publicApiList<genreType>>` | Deezer's genre list (`id` `0` = "All"). |
| `chart(genreId?, limit?)` | `Promise<chartType>` | The five ranked lists for a genre: `{tracks, albums, artists, playlists, podcasts}`. |
| `chartTracks(genreId?, limit?, index?)` | `Promise<publicApiList<searchResultTrack>>` | Just the track chart — download-ready after `getTrackInfo`. |
| `editorialSections()` | `Promise<publicApiList<editorialType>>` | Deezer's editorial section list. |
| `artistTopTracks(artistId, limit?)` | `Promise<publicApiList<searchResultTrack>>` | An artist's most popular tracks. |
| `relatedArtists(artistId, limit?)` | `Promise<publicApiList<searchResultArtist>>` | Similar / related artists. |
| `artistAlbums(artistId, limit?, index?)` | `Promise<publicApiList<artistAlbumResult>>` | The artist's discography. |
| `artistRadio(artistId)` | `Promise<publicApiList<searchResultTrack>>` | A radio (track list) seeded from an artist. |
| `trackByISRC(isrc)` | `Promise<trackTypePublicApi>` | Resolve an ISRC → public-API track. `getTrackInfo(id)` to download. |
| `albumByUPC(upc)` | `Promise<albumTypePublicApi>` | Resolve a UPC/EAN → public-API album (with `tracks`). |
| `trackPreview(track)` | `Promise<TrackPreview \| null>` | `{url, duration: 30}` for a track's preview clip (gw track, id, or number). |
| `downloadPreview(track)` | `Promise<Buffer \| null>` | The 30-second preview clip as a `Buffer` — plain MP3, no decryption. |
| `flow(userId?, limit?)` | `Promise<publicApiList<searchResultTrack>>` | Deezer **Flow**. `userId` defaults to the logged-in user. |
| `favoriteTracks / favoriteAlbums / favoriteArtists / playlists (userId?, limit?)` | `Promise<publicApiList<…>>` | A user's library. `favoriteTracks` carries `time_add`. |
| `userRadios(userId?)` / `radios()` / `radioTracks(radioId)` | `Promise<publicApiList<…>>` | Favourited radios / Deezer's radio list / a radio's tracklist. |
| `getUser()` | `Promise<userType>` | The logged-in user profile. |
| `getTrackBuffer(track, quality?, opts?)` | `Promise<Buffer \| null>` | Tagged audio in memory (no disk write). |
| `streamTrack(track, quality?, opts?)` | `Promise<TrackStream>` | Download as a constant-memory stream of decrypted audio — `{stream, size, startedAt}`; `opts.onProgress` / `opts.resumeFrom`. |
| `downloadTrack(track, quality?, opts?)` | `Promise<DownloadResult \| null>` | Download one track to disk. |
| `downloadTracks(tracks, quality?, opts?)` | `Promise<(DownloadResult \| null)[]>` | Queued multi-track download. |
| `downloadUrl(url, quality?, opts?)` | `Promise<(DownloadResult \| null)[]>` | `parseUrl` + `downloadTracks` in one call. |

`session.arl` exposes the arl in use.

**`quality`** is `'128' | '320' | 'flac'` (or numeric `1 | 3 | 9`), defaulting to `'320'`.

#### Example

```ts
const session = await createSession({arl});

const results = await session.downloadUrl('https://deezer.com/album/302127', 'flac', {
  output: 'Music/{ALB_TITLE}/{SNG_TITLE}',
  concurrency: 4,
  onProgress: ({index, total, track, result}) => {
    const status = result ? (result.written ? 'saved' : 'skipped') : 'unavailable';
    console.log(`${index + 1}/${total} ${track.SNG_TITLE}: ${status}`);
  },
});

const saved = results.filter((r) => r && r.written).length;
console.log(`${saved} files saved.`);
```

**`DownloadTracksOptions`** extends [`DownloadTrackOptions`](#download-primitives) with:

| Field | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `concurrency` | `number` | session default | Concurrent downloads. |
| `onProgress` | `(p) => void` | — | Called after each track settles: `{index, total, track, result}`. |

---

## Download primitives

### `getTrackBuffer(track, quality?, options?): Promise<Buffer | null>`

Download, decrypt, and tag a track entirely in memory. Returns the ready-to-write
audio `Buffer` (MP3 or FLAC), or `null` if the track is unavailable. Works on
modern Node (OpenSSL 3) — it falls back to a pure-JS Blowfish decrypt when the
legacy `bf-cbc` cipher is disabled.

```ts
const track = await getTrackInfo('3135556');
const buffer = await getTrackBuffer(track, '320');
```

**`GetTrackBufferOptions`**

| Field | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `coverSize` | `number` | `500` | Album cover size (px) embedded in tags. |
| `fallbackQuality` | `boolean` | `true` | If requested quality is missing, try 320 then 128. |

### `downloadTrackToFile(track, quality?, options?): Promise<DownloadResult | null>`

Resolve a destination path from the `output` template, skip existing files unless
`overwrite`, create parent directories, and write the file. Returns
`{path, written}` or `null` if the track is unavailable.

**`DownloadTrackOptions`** extends `GetTrackBufferOptions` with:

| Field | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `output` | `string` | `'{ART_NAME} - {SNG_TITLE}'` | Path or `saveLayout` template. The extension is appended automatically. |
| `albumInfo` | `object` | `{}` | Album info for album-level template tokens. |
| `trackNumber` | `boolean` | `false` | Prefix the filename with the track number. |
| `overwrite` | `boolean` | `false` | Re-download even if the file already exists. |

**`DownloadResult`**: `{path: string; written: boolean}` — `written` is `false`
when an existing file was skipped.

Template tokens (`{ALB_TITLE}`, `{ART_NAME}`, `{SNG_TITLE}`, `{TRACK_NUMBER}`, …)
are the same as the CLI `saveLayout`; see [config.md](config.md).

---

## Authentication

### `getArl(email, password): Promise<string>`

Fetch a Deezer `arl` from credentials via the mobile OAuth flow. Returns the
192-character arl, or throws [`LoginError`](#class-loginerror). The password is
never persisted or logged.

### `loginWithEmail(email, password): Promise<LoginResult>`

Lower-level variant that returns a typed result instead of throwing.

```ts
const result = await loginWithEmail(email, password);
if (result.ok) {
  console.log(result.arl);
} else {
  console.error(result.reason, result.message);
}
```

**`LoginResult`**

- `{ok: true, arl: string}`
- `{ok: false, reason: 'rejected' | 'no-arl' | 'network' | 'unknown', message: string}`

  `rejected` deliberately does not claim "wrong password": Deezer returns an identical error for a real account, a wrong password and a non-existent address, so the cause cannot be told apart. As of 2026-08 every password-to-`arl` path is refused — paste an `arl` instead.

### class `LoginError`

Thrown by `getArl`. Has a `reason` property mirroring `LoginResult`.

> Email/password login uses Deezer's mobile OAuth flow. It can still fail (bad
> credentials, account protections, or changes on Deezer's side) — handle the
> error and fall back to an arl.

---

## Config

### class `Config`

Read/write the same `gerdur.config.json` the CLI uses (dot-notation keys).

```ts
const conf = new Config();               // resolves project-local, then global
conf.set('cookies.arl', arl);
const arl = conf.getArl();               // prefers the GERDUR_ARL env var
```

Key methods: `get(key, default?)`, `set(key, value, persist?)`, `delete(key)`,
`getArl()`, `hasUserArl()`. Constructor takes an optional config file path.

### `globalConfigPath(): string`

The per-user config location (`$XDG_CONFIG_HOME/gerdur/gerdur.config.json`, or
`~/.config/gerdur/gerdur.config.json`).

### `resolveConfigFile(configFile): string`

Resolve which config file to use: project-local `gerdur.config.json` if present,
otherwise the global path.

---

## Re-exported query functions

Re-exported from `gerdur-core` so you don't need it as a second
dependency. Call after `initDeezerApi(arl)` or `createSession(...)`.

`initDeezerApi`, `parseInfo`, `searchMusic`, `searchPublicApi`, `searchTracks`,
`searchAlbums`, `searchArtists`, `searchPlaylists`, `buildAdvancedQuery`,
`suggest`, `getGenres`, `getChart`, `getChartTracks`, `getGenreArtists`,
`getEditorialList`, `getEditorialReleases`, `getEditorialSelection`,
`getEditorialCharts`, `getArtistTopTracks`, `getRelatedArtists`,
`getArtistAlbums`, `getArtistPlaylists`, `getArtistRadioTracks`, `getTrackByISRC`,
`getAlbumByUPC`, `getUserFlow`, `getUserFavoriteTracks`, `getUserFavoriteAlbums`,
`getUserFavoriteArtists`, `getUserPlaylists`, `getUserRadios`,
`getUserChartTracks`, `getRadios`, `getRadioTracks`, `getRadioGenres`,
`getTrackPreview`, `downloadPreview`, `formatName`, `toFormat`,
`DEEZER_FORMATS`, `getUser`, `getTrackInfo`, `getAlbumInfo`, `getAlbumTracks`,
`getPlaylistInfo`, `getPlaylistTracks`, `getArtistInfo`, `getDiscography`,
`getLyrics`, `getTrackDownloadUrl`, `resolveDownloadUrls`, `streamTrackDownload`,
`downloadTrackBuffer`, `createDecryptStream`, `getStream`, `GeoBlocked`,
`DeezerError`.

Low-level sessions (from `gerdur-core`): `createCoreSession(arl)`, `CoreSession`,
`defaultSession` — an isolated Deezer client with its own `arl` / cache /
`license_token` and `getTrackInfo` / `searchMusic` / `getTrackBuffer` / … methods,
for multi-account use.

```ts
await initDeezerApi(arl);
const album = await getAlbumInfo('302127');
const {data} = await getAlbumTracks('302127');

// Advanced search on the public REST API:
const q = buildAdvancedQuery({artist: 'daft punk', durMin: 200}); // 'artist:"daft punk" dur_min:200'
const {data: tracks} = await searchTracks(q, {limit: 25, order: 'RANKING'});
```

### Search functions

| Function | Notes |
| :--- | :--- |
| `searchMusic(query, types?, nb?)` | internal `deezer.pageSearch`; gw entity objects, download-ready `trackType`s. |
| `searchPublicApi(query, opts?)` | `api.deezer.com/search`; `opts.type` = `'track'` (default) / `'album'` / `'artist'` / `'playlist'` / `'user'` / `'radio'` / `'podcast'`, plus `order` / `strict` / `limit` / `index`. |
| `searchTracks` / `searchAlbums` / `searchArtists` / `searchPlaylists` | `searchPublicApi` with `type` fixed. |
| `buildAdvancedQuery(filters)` | pure; `{query?, artist?, album?, track?, label?, durMin?, durMax?, bpmMin?, bpmMax?}` → one query string. Operators bite reliably only on the track index. |
| `suggest(query, nb?)` | `deezer.suggest` autocomplete. |

### Browse functions (public REST — no `arl`)

| Function | Notes |
| :--- | :--- |
| `getGenres()` | genre list; `id` `0` = "All". |
| `getChart(genreId?, limit?)` | `{tracks, albums, artists, playlists, podcasts}` for a genre. |
| `getChartTracks(genreId?, limit?, index?)` | just the track chart. |
| `getGenreArtists(genreId)` | artists filed under a genre. |
| `getEditorialList()` | Deezer's editorial sections. |
| `getEditorialReleases(id?, limit?, index?)` / `getEditorialSelection(id?)` / `getEditorialCharts(id?)` | a section's new releases / picks / charts. |
| `getArtistTopTracks(artistId, limit?)` | popular tracks. |
| `getRelatedArtists(artistId, limit?)` | similar artists. |
| `getArtistAlbums(artistId, limit?, index?)` | discography. |
| `getArtistPlaylists(artistId, limit?)` | playlists featuring the artist. |
| `getArtistRadioTracks(artistId)` | a radio seeded from the artist. |
| `getTrackByISRC(isrc)` / `getAlbumByUPC(upc)` | barcode → public-API track / album. |

### Flow, radios & library (public REST — take a `userId`)

| Function | Notes |
| :--- | :--- |
| `getUserFlow(userId, limit?)` | Deezer Flow, as tracks. |
| `getUserFavoriteTracks(userId, limit?, index?)` | loved tracks (with `time_add`). |
| `getUserFavoriteAlbums` / `getUserFavoriteArtists` / `getUserPlaylists` | the rest of the library. |
| `getUserRadios(userId)` / `getUserChartTracks(userId, limit?)` | favourited radios / personal chart. |
| `getRadios()` / `getRadioTracks(radioId)` / `getRadioGenres()` | Deezer's radios. |

### Formats & previews

| Function | Notes |
| :--- | :--- |
| `getTrackPreview(track)` | `{url, duration: 30}` for the preview clip — plain MP3, no `arl`, no decryption. `track` = gw object / id / number. |
| `downloadPreview(track)` | the preview clip as a `Buffer`. |
| `DEEZER_FORMATS` | every `get_url` format, best → worst (`FLAC` … `MP4_RA1`). |
| `formatName(q)` / `toFormat(q)` | number (`1\|3\|9`) or format string → `get_url` format string. |
| `resolveDownloadUrls(tracks, qualities)` | `qualities` may mix numbers and format strings; results carry `format` + `cipher`. |

---

## Types

Exported TypeScript types: `SessionOptions`, `DownloadTracksOptions`,
`SearchType`, `Quality`, `GetTrackBufferOptions`, `DownloadTrackOptions`,
`DownloadResult`, `LoginResult`.

Search / browse types (also re-exported): `advancedSearchFilters`, `searchOrder`,
`searchEntity`, `publicApiSearchOptions`, `publicApiSearchResponse<T>`,
`searchResultTrack`, `searchResultAlbum`, `searchResultArtist`,
`searchResultPlaylist`, `suggestResult`, `publicApiList<T>`, `chartType`,
`chartTrack` / `chartAlbum` / `chartArtist` / `chartPlaylist` / `chartPodcast`,
`genreType`, `editorialType`, `artistAlbumResult`, `TrackPreview`, `DeezerFormat`,
`MediaFormat` (core's `Quality`), `StreamTrackOptions`, `TrackStream`,
`StreamResponse`, `DeezerErrorPayload`, `userFavoriteTrack`, `userFavoriteAlbum`,
`userFavoriteArtist`, `userPlaylistResult`, `radioResult`, `radioGenre`.

Deezer entity types (`trackType`, `albumType`, `userType`, …) come from
`gerdur-core/types`.
