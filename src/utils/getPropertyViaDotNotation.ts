/**
 * Retrieves a nested property from an object using a dot-notation string.
 *
 * @template T - The type of the object.
 * @param propertyName - The dot-notation string representing the property path.
 * @param object - The object from which to retrieve the property.
 * @returns The value of the nested property or undefined if it doesn't exist.
 */
export default function getPropertyViaDotNotation<T extends Record<string, any>>(
  propertyName: string,
  object: T
): unknown {
  const parts = propertyName.split('.');

  let prop: any = object;
  for (const part of parts) {
    if (prop === undefined || prop === null) {
      return undefined; // Handle cases where the property doesn't exist.
    }
    prop = prop[part];
  }
  return prop;
}
