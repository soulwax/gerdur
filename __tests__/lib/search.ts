import test from 'ava';
import {buildAdvancedQuery} from 'gerdur-core';
import * as gerdur from '../../src';

test('buildAdvancedQuery composes Deezer operators', (t) => {
  t.is(
    buildAdvancedQuery({artist: 'daft punk', durMin: 200, durMax: 400}),
    'artist:"daft punk" dur_min:200 dur_max:400',
  );
  t.is(buildAdvancedQuery({query: 'one more', track: 'a "b" c', bpmMin: 120}), 'one more track:"a b c" bpm_min:120');
  t.is(buildAdvancedQuery({album: 'discovery', label: 'Virgin'}), 'album:"discovery" label:"Virgin"');
  t.is(buildAdvancedQuery({durMin: -5, bpmMax: NaN, artist: '   '}), '');
  t.is(buildAdvancedQuery({}), '');
});

test('the library re-exports the search surface', (t) => {
  for (const name of [
    'searchPublicApi',
    'searchTracks',
    'searchAlbums',
    'searchArtists',
    'searchPlaylists',
    'buildAdvancedQuery',
    'suggest',
  ] as const) {
    t.is(typeof (gerdur as Record<string, unknown>)[name], 'function', `${name} is re-exported`);
  }
});
