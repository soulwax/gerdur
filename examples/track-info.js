// Look up a single track's metadata and lyrics.
//
//   node examples/track-info.js 3135556
const {sessionFromEnv} = require('./_session');
const {getTrackInfo, getLyrics} = require('../dist/src');

async function main() {
  const id = process.argv[2] || '3135556';

  // A session initializes the Deezer API used by the re-exported query functions.
  await sessionFromEnv();

  const track = await getTrackInfo(id);
  console.log('Title :', track.SNG_TITLE);
  console.log('Artist:', track.ART_NAME);
  console.log('Album :', track.ALB_TITLE);
  console.log('Length:', track.DURATION + 's');
  console.log('Sizes :', {
    '128': track.FILESIZE_MP3_128,
    '320': track.FILESIZE_MP3_320,
    flac: track.FILESIZE_FLAC,
  });

  try {
    const lyrics = await getLyrics(id);
    if (lyrics && lyrics.LYRICS_TEXT) {
      console.log('\nLyrics (first 5 lines):');
      console.log(lyrics.LYRICS_TEXT.split('\n').slice(0, 5).join('\n'));
    } else {
      console.log('\nNo lyrics available.');
    }
  } catch {
    console.log('\nNo lyrics available.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
