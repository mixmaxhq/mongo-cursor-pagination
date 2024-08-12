import { EJSON } from "bson";
import { Document } from "mongodb";

// BSON can't encode undefined values, so we will use this value instead:
const BSON_UNDEFINED = "__mixmax__undefined__";

/**
 * These will take a paging handle (`next` or `previous`) and encode/decode it
 * as a string which can be passed in a URL.
 */

function _encode(str: string): string {
  return Buffer.from(encodeURIComponent(str)).toString("base64");
}

function _decode(str: string): string {
  return decodeURIComponent(Buffer.from(str, "base64").toString());
}

export const encode = (obj: string | object | Document): string => {
  if (Array.isArray(obj) && obj[0] === undefined) obj[0] = BSON_UNDEFINED;
  return _encode(
    typeof obj === "string" ? obj : EJSON.stringify(obj, { relaxed: true })
  );
};

export const decode = (str: string): Document | string | undefined => {
  const obj = EJSON.parse(_decode(str), { relaxed: true });
  if (Array.isArray(obj) && obj[0] === BSON_UNDEFINED) obj[0] = undefined;
  return obj as Document;
};
