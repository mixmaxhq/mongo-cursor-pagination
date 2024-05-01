import resolveFields from "../../src/utils/resolveFields";

describe("resolveFields", () => {
  it("should support empty fields", () => {
    expect(resolveFields()).toEqual({});
    expect(resolveFields([])).toEqual({});
    expect(resolveFields([], null)).toEqual({});
    expect(resolveFields([], null, {})).toEqual({});

    expect(resolveFields([], {})).toEqual(null);
    expect(resolveFields([], {}, {})).toEqual(null);
  });

  it("should support default fields", () => {
    const fields = {
      "users.id": 1,
      "users.email": 1,
      "users.services.google.token": 1,
      extra: 1,
    };
    const fieldsMinusId = Object.assign({ _id: 0 }, fields);
    const fieldsPlusId = Object.assign({ _id: 1 }, fields);
    expect(resolveFields([], fields)).toEqual(fieldsMinusId);
    expect(resolveFields([], fieldsMinusId)).toEqual(fieldsMinusId);
    expect(resolveFields([], fieldsPlusId)).toEqual(fieldsPlusId);
  });

  it("should let override disable the id field", () => {
    const fields = {
      "users.id": 1,
      "users.email": 1,
      "users.services.google.token": 1,
      extra: 1,
    };
    const fieldsMinusId = Object.assign({ _id: 0 }, fields);
    const fieldsPlusId = Object.assign({ _id: 1 }, fields);
    expect(resolveFields([], fieldsPlusId, { _id: 0 })).toEqual(fieldsMinusId);
  });

  it("should select fields", () => {
    const fields = {
      "users.id": 1,
      "users.email": 1,
      "users.services.google.token": 1,
      extra: 1,
    };
    const fieldsPlusId = Object.assign({ _id: 1 }, fields);
    expect(
      resolveFields(["_id", "users.services.google.token"], fields)
    ).toEqual({
      _id: 0,
      "users.services.google.token": 1,
    });
    expect(
      resolveFields(["_id", "users.services.google.token"], fieldsPlusId)
    ).toEqual({
      _id: 1,
      "users.services.google.token": 1,
    });
    expect(resolveFields(["users.services.google.token"], fields)).toEqual({
      _id: 0,
      "users.services.google.token": 1,
    });
    expect(resolveFields(["users"], fields)).toEqual({
      _id: 0,
      "users.id": 1,
      "users.email": 1,
      "users.services.google.token": 1,
    });
    expect(resolveFields(["users"], fieldsPlusId)).toEqual({
      _id: 0,
      "users.id": 1,
      "users.email": 1,
      "users.services.google.token": 1,
    });
  });

  it("should add fields from the override", () => {
    const fields = {
      "users.id": 1,
      "users.email": 1,
      "users.services.google.token": 1,
      extra: 1,
    };
    expect(resolveFields(["_id", "users"], fields, { another: 1 })).toEqual({
      _id: 0,
      "users.id": 1,
      "users.email": 1,
      "users.services.google.token": 1,
      another: 1,
    });
  });
});
