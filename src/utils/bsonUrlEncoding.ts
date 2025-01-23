import base64url from 'base64-url';
import { EJSON } from 'bson';

/**
 * Constants
 * BSON can't encode undefined values, so we will use this value instead.
 */
const BSON_UNDEFINED = '__mixmax__undefined__' as const;

/**
 * Type Definitions
 */
export type Encodable = Record<string, unknown> | unknown[] | null | string | number | boolean;

interface EncoderDecoder {
  encode(obj: Encodable): string;
  decode(str: string): Encodable;
}

/**
 * Encoder and Decoder Implementation
 */
const encoderDecoder: EncoderDecoder = {
  /**
   * Encodes an object to a base64url string.
   *
   * @param obj - The object to encode.
   * @returns The base64url-encoded string.
   */
  encode(obj: Encodable): string {
    // Replace `undefined` in arrays with BSON_UNDEFINED for BSON compatibility
    if (Array.isArray(obj) && obj[0] === undefined) {
      obj[0] = BSON_UNDEFINED;
    }
    return base64url.encode(EJSON.stringify(obj));
  },

  /**
   * Decodes a base64url string back into an object.
   *
   * @param str - The base64url-encoded string.
   * @returns The decoded object.
   */
  decode(str: string): Encodable {
    const obj = EJSON.parse(base64url.decode(str));
    // Replace BSON_UNDEFINED in arrays back to `undefined`
    if (Array.isArray(obj) && obj[0] === BSON_UNDEFINED) {
      obj[0] = undefined;
    }
    return obj;
  },
};

export default encoderDecoder;
