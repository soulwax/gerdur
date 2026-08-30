// Resolve any Deezer/Spotify/Tidal URL and download it, with live progress.
//
//   node examples/download-url.js "https://deezer.com/album/302127"
//   node examples/download-url.js "https://deezer.com/track/3135556" flac
const {sessionFromEnv} = require('./_session');

async function main() {
  const url = process.argv[2];
  const quality = process.argv[3] || '320';
  if (!url) {
    console.error('Usage: node examples/download-url.js <url> [128|320|flac]');
    process.exit(1);
  }

  const session = await sessionFromEnv();

  const results = await session.downloadUrl(url, quality, {
    output: 'Music/{ALB_TITLE}/{SNG_TITLE}',
    concurrency: 4,
    onProgress: ({index, total, track, result}) => {
      const status = result ? (result.written ? 'saved' : 'skipped (exists)') : 'unavailable';
      console.log(`[${index + 1}/${total}] ${track.ART_NAME} — ${track.SNG_TITLE}: ${status}`);
    },
  });

  const written = results.filter((r) => r && r.written).length;
  const skipped = results.filter((r) => r && !r.written).length;
  const failed = results.filter((r) => !r).length;
  console.log(`\nDone. ${written} saved, ${skipped} skipped, ${failed} unavailable.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
