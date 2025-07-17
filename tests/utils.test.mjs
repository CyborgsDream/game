import test from 'node:test';
import assert from 'node:assert/strict';
import { computeHeight, shadeColor, getColor, resetColorMap } from '../scripts/utils.mjs';

test('computeHeight deterministic values', () => {
  assert.equal(computeHeight(0,0), 3);
  assert.equal(computeHeight(1,1), 5);
  assert.equal(computeHeight(-1,-1), 3);
});

test('shadeColor darkens red at 50%', () => {
  assert.equal(shadeColor('#ff0000', 0.5), 'rgb(127,0,0)');
});

test('getColor caching and determinism', () => {
  const c1 = getColor(2,3);
  const c2 = getColor(2,3);
  assert.equal(c1, c2);
  resetColorMap();
  const c3 = getColor(2,3);
  assert.equal(c1, c3);
});
