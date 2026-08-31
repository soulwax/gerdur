// Search Deezer for tracks and print the results.
//
//   node examples/search.js "daft punk"
//   node examples/search.js "daft punk" 20
//
// Also demonstrates the structured public-API search and autocomplete:
//   node examples/search.js --advanced
const {sessionFromEnv} = require('./_session');

async function plain(session, query, limit) {
  const {TRACK} = await session.search(query, ['TRACK'], limit);
  console.log(`Found ${TRACK.data.length} track(s) for "${query}":\n`);
  for (const t of TRACK.data) {
    console.log(`  ${t.SNG_ID.padEnd(10)} ${t.ART_NAME} — ${t.SNG_TITLE}  [${t.ALB_TITLE}]`);
  }
}

async function advanced(session) {
  // Structured filters -> public REST search. Returns public-API track objects
  // (id / isrc / preview); call getTrackInfo(id) before downloading one.
  // Deezer's `artist:`/`track:` operators are flaky, so searchAdvanced retries
  // an empty result as plain text automatically (disable with {fallback: false}).
  const {data} = await session.searchAdvanced({artist: 'daft punk', track: 'get lucky'}, {limit: 10});
  console.log(`searchAdvanced -> ${data.length} track(s):\n`);
  for (const t of data) {
    console.log(`  ${String(t.id).padEnd(10)} ${t.artist.name} — ${t.title}  (${t.duration}s, ${t.isrc || 'no isrc'})`);
  }

  // Autocomplete
  const s = await session.suggest('daft', 5);
  console.log(`\nsuggest("daft") artists: ${(s.ARTIST || []).map((a) => a.ART_NAME).join(', ')}`);
}

async function main() {
  const session = await sessionFromEnv();

  if (process.argv[2] === '--advanced') {
    await advanced(session);
    return;
  }

  const query = process.argv[2] || 'daft punk';
  const limit = Number(process.argv[3]) || 10;
  await plain(session, query, limit);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
