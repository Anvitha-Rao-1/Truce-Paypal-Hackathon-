import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSettings } from '../src/settings.js';

const valid = {
  scopeText: 'Logo design, 3 revisions',
  limits: {
    floor_pct: 10,
    ceiling_pct: 50,
    step_pct: 10,
    allowed_types: ['REFUND'],
    auto_send: false,
  },
};

test('accepts valid settings', () => {
  assert.equal(validateSettings(valid).ok, true);
});

test('rejects floor above ceiling', () => {
  const result = validateSettings({
    ...valid,
    limits: { ...valid.limits, floor_pct: 60 },
  });
  assert.equal(result.ok, false);
});

test('rejects percentages outside 0 to 100', () => {
  assert.equal(validateSettings({
    ...valid,
    limits: { ...valid.limits, ceiling_pct: 110 },
  }).ok, false);
});

test('rejects negative ceiling', () => {
  assert.equal(validateSettings({
    ...valid,
    limits: { ...valid.limits, ceiling_pct: -5 },
  }).ok, false);
});

test('rejects zero or negative step', () => {
  assert.equal(validateSettings({
    ...valid,
    limits: { ...valid.limits, step_pct: 0 },
  }).ok, false);
});

test('rejects numeric strings', () => {
  assert.equal(validateSettings({
    ...valid,
    limits: { ...valid.limits, floor_pct: '10' },
  }).ok, false);
});

test('rejects invalid offer types', () => {
  assert.equal(validateSettings({
    ...valid,
    limits: { ...valid.limits, allowed_types: ['INVALID'] },
  }).ok, false);
});

test('rejects empty offer types', () => {
  assert.equal(validateSettings({
    ...valid,
    limits: { ...valid.limits, allowed_types: [] },
  }).ok, false);
});

test('rejects non-boolean auto_send', () => {
  assert.equal(validateSettings({
    ...valid,
    limits: { ...valid.limits, auto_send: 'true' },
  }).ok, false);
});

test('rejects non-string scope', () => {
  assert.equal(validateSettings({
    ...valid,
    scopeText: 123,
  }).ok, false);
});

test('rejects excessively long scope', () => {
  assert.equal(validateSettings({
    ...valid,
    scopeText: 'a'.repeat(2001),
  }).ok, false);
});

test('accepts scope without changing limits', () => {
  assert.equal(validateSettings({ scopeText: 'New logo design' }).ok, true);
});