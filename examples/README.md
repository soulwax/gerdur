# Examples

Runnable examples for the `gerdur` programmatic API. Each script is plain
Node.js (no build step) and reads credentials from environment variables so you
never hardcode secrets.

## Setup

Provide **either** an `arl` or email/password:

```bash
export GERDUR_ARL=your_arl
# ...or:
export GERDUR_EMAIL=you@example.com
export GERDUR_PASSWORD=your_password
```

Then run any example. If you have the repo checked out, build first (`npm run build`)
and run against the local build:

```bash
npm run build
node examples/download-url.js "https://deezer.com/track/3135556"
```

If you installed the package as a dependency, change the `require('../dist/src')`
line at the top of each script to `require('gerdur')`.

## Scripts

| File | What it shows |
| :--- | :--- |
| [`login.js`](login.js) | Fetch an `arl` from email/password (or verify an existing `arl`). |
| [`search.js`](search.js) | Search Deezer and print track results. |
| [`track-info.js`](track-info.js) | Look up a single track's metadata and lyrics. |
| [`get-buffer.js`](get-buffer.js) | Get a tagged audio `Buffer` in memory (no file written). |
| [`download-url.js`](download-url.js) | Resolve any Deezer/Spotify/Tidal URL and download it with a progress bar. |

> Remember: purchase the music you love to support the artists.
