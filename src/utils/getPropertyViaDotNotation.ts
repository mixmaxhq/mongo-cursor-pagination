/**
 * Retrieves a nested property from an object using a dot-notation string.
 *
 * @param propertyName - The dot-notation string representing the property path.
 * @param object - The object from which to retrieve the property.
 * @returns The value of the nested property or undefined if it doesn't exist.
 */
export default function getPropertyViaDotNotation(
  propertyName: string,
  object: Record<string, any>
): unknown {
  const parts = propertyName.split('.');

  let prop = object;
  for (let i = 0; i < parts.length; i++) {
    prop = prop[parts[i]];
  }
  return prop;
}
