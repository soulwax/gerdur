// Get a tagged audio Buffer in memory (nothing written unless you ask).
//
//   node examples/get-buffer.js 3135556 320
//   node examples/get-buffer.js 3135556 flac ./out.flac
const {writeFileSync} = require('fs');
const {sessionFromEnv} = require('./_session');
const {getTrackInfo, getTrackBuffer} = require('../dist/src');

async function main() {
  const id = process.argv[2] || '3135556';
  const quality = process.argv[3] || '320';
  const outFile = process.argv[4]; // optional

  await sessionFromEnv();
  const track = await getTrackInfo(id);

  const buffer = await getTrackBuffer(track, quality);
  if (!buffer) {
    console.error('Track not available for download.');
    process.exit(1);
  }

  console.log(`Got ${(buffer.length / 1048576).toFixed(2)} MiB in memory for "${track.SNG_TITLE}".`);

  if (outFile) {
    writeFileSync(outFile, buffer);
    console.log('Wrote', outFile);
  } else {
    console.log('(Pass an output path as the 3rd argument to write it to disk.)');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
