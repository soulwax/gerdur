import test from 'ava';
import Config from '../../src/lib/config';

const conf = new Config();

test('SET CONFIG', (t) => {
  conf.set('concurrency', 2, false);
  t.is(conf.get('concurrency'), 2);
});

test('GET CONFIG', (t) => {
  t.truthy(conf.get('cookies.arl'));

  t.is(typeof conf.get('coverSize.128'), 'number');
  t.is(typeof conf.get('coverSize.320'), 'number');
  t.is(typeof conf.get('coverSize.flac'), 'number');

  t.true(conf.get('trackNumber'));
  t.true(conf.get('fallbackTrack'));

  t.deepEqual(conf.get('saveLayout') as any, {
    track: 'Music/{ALB_TITLE}/{SNG_TITLE}',
    album: 'Music/{ALB_TITLE}/{SNG_TITLE}',
    artist: 'Music/{ALB_TITLE}/{SNG_TITLE}',
    playlist: 'Playlist/{TITLE}/{SNG_TITLE}',
  });
});

test('DELETE CONFIG', (t) => {
  conf.delete('cookies.arl');
  t.is(conf.get('cookies.arl'), undefined);
});
