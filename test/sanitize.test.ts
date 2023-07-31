import { QueryInputParams, QueryInputParamsMulti } from '../src/types';
import {
  generateCursorQuery,
  generateCursorQueryMulti,
  generateSort,
  generateSorts,
} from '../src/utils/query';
import sanitizeParams, { sanitizeMultiParamsMutate } from '../src/utils/sanitizeParams';

describe('sanitize', () => {
  let baseParams;
  let params;
  let paramsMulti;

  beforeEach(() => {
    baseParams = {
      next: 'WyJfX21peG1heF9fdW5kZWZpbmVkX18iLHsiJG9pZCI6IjY0YzMzOTlkNmNmYzc1YzNlMmY5ZDEyZCJ9XQ',
      previous:
        'WyJfX21peG1heF9fdW5kZWZpbmVkX18iLHsiJG9pZCI6IjY0YzMzOTlkNmNmYzc1YzNlMmY5ZDEyNiJ9XQ',
      limit: 2,
    };

    params = {
      paginatedField: 'created_at',
      ...baseParams,
    };

    paramsMulti = {
      paginatedFields: [{ paginatedField: 'created_at' }],
      ...baseParams,
    };
  });

  it('sanitizie and sanitizeMulti do the same thing given the same arguments', async () => {
    const s = await sanitizeParams({}, params);
    const sm = await sanitizeMultiParamsMutate({}, paramsMulti);
    // these produce slightly different shapes, but the same data
    expect(s.paginatedField).toEqual(sm.paginatedFields![0].paginatedField);
  });

  it('generateCursorQuery and generateCursorQueryMulti do the same thing given the same arguments', () => {
    const cq = generateCursorQuery(params);
    const cqm = generateCursorQueryMulti(paramsMulti);
    expect(cq).toEqual(cqm);
  });

  it('generateSort and generateSorts do the same thing given the same arguments', async () => {
    const sanitizedParams = await sanitizeParams({}, params);
    const sanitizedParamsMulti = await sanitizeMultiParamsMutate({}, paramsMulti);

    const s = generateSort(sanitizedParams);
    const sm = generateSorts(sanitizedParamsMulti);
    expect(s).toEqual(sm);
  });
});
