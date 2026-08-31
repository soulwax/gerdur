// Browse Deezer: genres, charts, related artists, and barcode lookups.
//
//   node examples/browse.js
const {sessionFromEnv} = require('./_session');

async function main() {
  const session = await sessionFromEnv();

  // Genres, then the top of that genre's chart
  const {data: genres} = await session.genres();
  console.log(`Genres: ${genres.map((g) => g.name).join(', ')}\n`);

  const rock = genres.find((g) => g.name === 'Rock') || genres[1];
  const {tracks} = await session.chart(rock.id, 5);
  console.log(`Top ${rock.name} tracks:`);
  for (const t of tracks.data) {
    console.log(`  ${t.position}. ${t.artist.name} — ${t.title}`);
  }

  // Related artists
  const {data: related} = await session.relatedArtists(27, 5); // 27 = Daft Punk
  console.log(`\nArtists like Daft Punk: ${related.map((a) => a.name).join(', ')}`);

  // Barcode lookups
  const track = await session.trackByISRC('GBDUW0000059');
  console.log(`\nISRC GBDUW0000059 -> ${track.artist.name} — ${track.title}`);

  const album = await session.albumByUPC('0724384960650');
  console.log(`UPC 0724384960650 -> ${album.artist.name} — ${album.title} (${album.nb_tracks} tracks)`);

  // 30-second preview clip — no licence, no decryption
  const preview = await session.trackPreview('3135556');
  console.log(`\nPreview: ${preview.url} (${preview.duration}s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
