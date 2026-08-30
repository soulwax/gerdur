import test from 'ava';
// disable chalk colors
// otherwise tests fail because of ANSI escape codes
process.env.FORCE_COLOR = '0';
import signale from '../../src/lib/signale';

test('CHECK INFO', (t) => {
  const info = signale.info('hello world');
  t.is(info, 'ℹ info hello world');
});

test('CHECK WARN', (t) => {
  const warn = signale.warn('hello world');
  t.is(warn, '⚠ warn hello world');
});

test('CHECK PENDING', (t) => {
  const pending = signale.pending('hello world');
  t.is(pending, '● pending hello world');
});

test('CHECK SUCCESS', (t) => {
  const success = signale.success('hello world');
  t.is(success, '✔ success hello world');
});

test('CHECK ERROR', (t) => {
  const error = signale.error('hello world');
  t.is(error, '✖ error hello world');
});

test('CHECK NOTE', (t) => {
  const note = signale.note('hello world');
  t.is(note, '  → hello world');
});
