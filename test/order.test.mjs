import test from 'node:test';
import assert from 'node:assert/strict';
import { newDraft, totals, restoreDraft, validateSale } from '../public/order.mjs';

test('calculates integer-penny totals, applying discounts before service', () => {
  const draft = { ...newDraft(), items: [{ id: 'burger', quantity: 2 }, { id: 'coffee', quantity: 1 }], discount: 15, service: true };
  assert.deepEqual(totals(draft), { subtotal: 3440, discount: 516, service: 292, total: 3216 });
});

test('takeaway never adds service, and a full discount gives a zero total', () => {
  const draft = { ...newDraft(), items: [{ id: 'coffee', quantity: 1 }], mode: 'takeaway', service: true };
  assert.equal(totals(draft).total, 340);
  draft.discount = 100;
  assert.equal(totals(draft).total, 0);
});

test('restores valid drafts while rejecting malformed or excessive quantities', () => {
  const draft = restoreDraft({ items: [null, { id: 'burger', quantity: -1 }, { id: 'coffee', quantity: 100 }, { id: 'missing', quantity: 1 }, { id: 'bowl', quantity: 2, note: 'No dressing' }, { id: 'bowl', quantity: 1 }], discount: Infinity, table: '<script>', guests: '99', note: 'x'.repeat(400) });
  assert.deepEqual(draft.items, [{ id: 'bowl', quantity: 2, note: 'No dressing' }]);
  assert.equal(draft.discount, 0);
  assert.equal(draft.table, '');
  assert.equal(draft.guests, '1');
  assert.equal(draft.note.length, 300);
  assert.deepEqual(restoreDraft(null), newDraft());
});

test('validates stored sales, including cash coverage and consistent totals', () => {
  const draft = { ...newDraft(), items: [{ id: 'coffee', quantity: 1 }], mode: 'takeaway' };
  const sale = { number: 1001, date: '2026-11-06T10:00:00Z', draft, payment: 'cash', received: 500, amounts: totals(draft) };
  assert.equal(validateSale(sale), true);
  assert.equal(validateSale({ ...sale, received: 300 }), false);
  assert.equal(validateSale({ ...sale, amounts: { ...sale.amounts, total: 0 } }), false);
  assert.equal(validateSale({ ...sale, date: 'invalid' }), false);
  assert.equal(validateSale(null), false);
});

test('malformed JSON objects cannot throw during draft and history restoration', () => {
  const malformed = JSON.parse('{"table":{"toString":null},"guests":{"toString":null},"items":[{"id":"coffee","quantity":1}]}');
  const draft = restoreDraft(malformed);
  assert.equal(draft.table, '');
  assert.equal(draft.guests, '1');
  const sale = { number: 1001, date: '2026-11-06T10:00:00Z', draft: malformed, payment: 'card', amounts: totals(draft) };
  assert.equal(validateSale(sale), true);
  assert.equal([sale, { ...sale, date: null }].filter(validateSale).length, 1);
});
