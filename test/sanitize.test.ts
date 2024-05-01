import { QueryInputParams, QueryInputParamsMulti } from "../src/types";
import {
  generateCursorQuery,
  generateCursorQueryMulti,
  generateSort,
  generateSorts,
} from "../src/utils/query";
import sanitizeParams, {
  sanitizeMultiParamsMutate,
} from "../src/utils/sanitizeParams";

describe("sanitize", () => {
  let baseParams;
  let params;
  let paramsMulti;

  beforeEach(() => {
    params = {
      paginatedField: "created_at",
      // ["created_at",{"$oid":"64cb29a1b2a41fc8221041b2"}]
      next: "WyJjcmVhdGVkX2F0Iix7IiRvaWQiOiI2NGNiMjlhMWIyYTQxZmM4MjIxMDQxYjIifV0=",
      limit: 2,
    };

    paramsMulti = {
      paginatedFields: [{ paginatedField: "created_at" }],
      // {"created_at":"10-06-1992","_id":{"$oid":"64cb29a1b2a41fc8221041b2"}}
      next: "eyJjcmVhdGVkX2F0IjoiMTAtMDYtMTk5MiIsIl9pZCI6eyIkb2lkIjoiNjRjYjI5YTFiMmE0MWZjODIyMTA0MWIyIn19",
      limit: 2,
    };
  });

  it("sanitize and sanitizeMulti do the same thing given the same arguments", async () => {
    const s = await sanitizeParams({}, params);
    const sm = await sanitizeMultiParamsMutate({}, paramsMulti);
    // these produce slightly different shapes, but the same data
    expect(s.paginatedField).toEqual(sm.paginatedFields![0].paginatedField);
  });

  it("generateSort and generateSorts do the same thing given the same arguments", async () => {
    const sanitizedParams = await sanitizeParams({}, params);
    const sanitizedParamsMulti = await sanitizeMultiParamsMutate(
      {},
      paramsMulti
    );

    // params multi adds the _id to the sort explicitly instead of tacking it on like the old one did.

    const s = generateSort(sanitizedParams);
    const sm = generateSorts(sanitizedParamsMulti);

    expect(s?.created_at).toEqual(sm.created_at);
  });
});
