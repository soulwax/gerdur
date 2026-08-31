import test from 'ava';
import {buildAdvancedQuery} from 'gerdur-core';
import * as gerdur from '../../src';
import {advancedFiltersFromFlags, plainTextQuery, searchAdvancedTracks} from '../../src/lib/search';

test('advancedFiltersFromFlags folds CLI flags (and returns null when none set)', (t) => {
  t.is(advancedFiltersFromFlags({}), null);
  t.is(advancedFiltersFromFlags({artist: '   ', search: ''}), null);

  const filters = advancedFiltersFromFlags({
    search: '  one more time  ',
    artist: 'daft punk',
    bpmMin: '120',
    durMax: 'nope',
    durMin: '200',
  });
  if (!filters) {
    t.fail('expected filters');
    return;
  }
  t.deepEqual(filters, {
    query: 'one more time',
    artist: 'daft punk',
    album: undefined,
    track: undefined,
    label: undefined,
    durMin: 200,
    durMax: undefined,
    bpmMin: 120,
    bpmMax: undefined,
  });
  t.is(buildAdvancedQuery(filters), 'one more time artist:"daft punk" dur_min:200 bpm_min:120');
});

test('plainTextQuery joins the text fields', (t) => {
  t.is(plainTextQuery({query: 'get lucky', artist: 'daft punk', bpmMin: 120}), 'get lucky daft punk');
  t.is(plainTextQuery({bpmMin: 120}), '');
});

test('searchAdvancedTracks short-circuits an empty query without hitting the network', async (t) => {
  const res = await searchAdvancedTracks({});
  t.deepEqual(res, {data: [], total: 0, query: '', usedFallback: false});
});

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
