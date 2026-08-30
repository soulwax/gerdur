import test from 'ava';
import {parseInfo} from 'gerdur-core';
import {saveLayout, formatSecondsReadable, progressBar} from '../../src/lib/util';

test.serial('SAVE LAYOUT 1', async (t) => {
  const {tracks, linkinfo} = await parseInfo('https://www.deezer.com/track/3135556');
  const layout = saveLayout({
    track: tracks[0],
    album: linkinfo,
    path: 'Music/{ALB_NAME}/{ART_NAME}/{SNG_TITLE}',
    minimumIntegerDigits: 2,
    trackNumber: true,
  });
  t.is(layout, 'Music/Daft Punk/04 - Harder, Better, Faster, Stronger');
});

test('SAVE LAYOUT 2', async (t) => {
  const {tracks, linkinfo} = await parseInfo('https://www.deezer.com/track/3135556');
  const layout = saveLayout({
    track: tracks[0],
    album: linkinfo,
    path: '{ALB_NAME}/{ART_NAME}/{TRACK_NUMBER} {SNG_TITLE}',
    minimumIntegerDigits: 2,
    trackNumber: true,
  });
  t.is(layout, 'Daft Punk/04 Harder, Better, Faster, Stronger');
});

test('SAVE LAYOUT 3', async (t) => {
  const {tracks, linkinfo} = await parseInfo('https://www.deezer.com/track/3135556');
  const layout = saveLayout({
    track: tracks[0],
    album: linkinfo,
    path: '{ALB_NAME}/{ART_NAME}/{NO_TRACK_NUMBER}{SNG_TITLE}',
    minimumIntegerDigits: 2,
    trackNumber: true,
  });
  t.is(layout, 'Daft Punk/Harder, Better, Faster, Stronger');
});

test('FORMAT SECONDS', (t) => {
  const time = formatSecondsReadable(96);
  t.is(time, '01m 36s');
});

test('PROGRESS BAR', (t) => {
  const bar = progressBar(1000, 40);
  t.is(typeof bar, 'function');

  const len = bar(500);
  t.is(len.length, 60);
});
