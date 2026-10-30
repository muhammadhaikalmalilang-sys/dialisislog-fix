import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanFirestoreData } from '../services/firebase.ts';

test('cleanFirestoreData strips undefined fields from root and nested objects', () => {
  const dirtyData = {
    nurseName: 'M. Haikal Malilang',
    submission: {
      status: 'belum_diajukan',
      submittedAt: undefined,
      verifiedAt: undefined,
      verifiedBy: undefined,
      notes: ''
    },
    items: [
      { id: '1', note: undefined, checked: true },
      undefined,
      { id: '2', note: 'ok', checked: false }
    ],
    emptyField: undefined,
    validField: 'valid',
    validNumber: 0,
    validBool: false,
    validNull: null
  };

  const cleaned = cleanFirestoreData(dirtyData);

  // Checks that undefined properties are completely eliminated
  assert.equal('submittedAt' in (cleaned.submission as any), false);
  assert.equal('verifiedAt' in (cleaned.submission as any), false);
  assert.equal('verifiedBy' in (cleaned.submission as any), false);
  assert.equal('emptyField' in cleaned, false);
  assert.equal(cleaned.validField, 'valid');
  assert.equal(cleaned.validNumber, 0);
  assert.equal(cleaned.validBool, false);
  assert.equal(cleaned.validNull, null);
  assert.equal((cleaned.submission as any).status, 'belum_diajukan');
  assert.equal((cleaned.submission as any).notes, '');

  // Array item check
  assert.equal(cleaned.items.length, 2);
  const firstItem = cleaned.items[0] as { id: string; note?: string; checked: boolean };
  const secondItem = cleaned.items[1] as { id: string; note?: string; checked: boolean };
  assert.equal('note' in firstItem, false);
  assert.equal(firstItem.checked, true);
  assert.equal(secondItem.note, 'ok');
});
