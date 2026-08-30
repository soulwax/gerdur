// Search Deezer for tracks and print the results.
//
//   node examples/search.js "daft punk"
//   node examples/search.js "daft punk" 20
const {sessionFromEnv} = require('./_session');

async function main() {
  const query = process.argv[2] || 'daft punk';
  const limit = Number(process.argv[3]) || 10;

  const session = await sessionFromEnv();
  const {TRACK} = await session.search(query, ['TRACK'], limit);

  console.log(`Found ${TRACK.data.length} track(s) for "${query}":\n`);
  for (const t of TRACK.data) {
    console.log(`  ${t.SNG_ID.padEnd(10)} ${t.ART_NAME} — ${t.SNG_TITLE}  [${t.ALB_TITLE}]`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
