import test from 'ava';
import * as gerdur from '../../src';

test('the library re-exports the browse surface', (t) => {
  for (const name of [
    'getGenres',
    'getChart',
    'getChartTracks',
    'getGenreArtists',
    'getEditorialList',
    'getEditorialReleases',
    'getEditorialSelection',
    'getEditorialCharts',
    'getArtistTopTracks',
    'getRelatedArtists',
    'getArtistAlbums',
    'getArtistPlaylists',
    'getArtistRadioTracks',
    'getTrackByISRC',
    'getAlbumByUPC',
    'getTrackPreview',
    'downloadPreview',
    'formatName',
    'toFormat',
  ] as const) {
    t.is(typeof (gerdur as Record<string, unknown>)[name], 'function', `${name} is re-exported`);
  }
  t.true(Array.isArray((gerdur as Record<string, unknown>).DEEZER_FORMATS));
});

test('Session exposes the browse methods', (t) => {
  const proto = gerdur.Session.prototype as unknown as Record<string, unknown>;
  for (const name of [
    'genres',
    'chart',
    'chartTracks',
    'editorialSections',
    'artistTopTracks',
    'relatedArtists',
    'artistAlbums',
    'artistRadio',
    'trackByISRC',
    'albumByUPC',
    'trackPreview',
    'downloadPreview',
  ] as const) {
    t.is(typeof proto[name], 'function', `Session.${name}`);
  }
});
