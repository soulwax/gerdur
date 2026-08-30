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
| `search(query, types?, limit?)` | `Promise<searchType>` | Search Deezer. `types` defaults to `['TRACK']`. |
| `getUser()` | `Promise<userType>` | The logged-in user profile. |
| `getTrackBuffer(track, quality?, opts?)` | `Promise<Buffer \| null>` | Tagged audio in memory (no disk write). |
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
- `{ok: false, reason: 'wrong-credentials' | 'no-arl' | 'network' | 'unknown', message: string}`

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

`initDeezerApi`, `parseInfo`, `searchMusic`, `getUser`, `getTrackInfo`,
`getAlbumInfo`, `getAlbumTracks`, `getPlaylistInfo`, `getPlaylistTracks`,
`getArtistInfo`, `getDiscography`, `getLyrics`, `getTrackDownloadUrl`,
`GeoBlocked`.

```ts
await initDeezerApi(arl);
const album = await getAlbumInfo('302127');
const {data} = await getAlbumTracks('302127');
```

---

## Types

Exported TypeScript types: `SessionOptions`, `DownloadTracksOptions`,
`SearchType`, `Quality`, `GetTrackBufferOptions`, `DownloadTrackOptions`,
`DownloadResult`, `LoginResult`.

Deezer entity types (`trackType`, `albumType`, `userType`, …) come from
`gerdur-core/types`.
