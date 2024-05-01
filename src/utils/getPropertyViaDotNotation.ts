type Args = {
  propertyName: string;
  object: object;
  sortCaseInsensitive?: boolean;
};
type FinalValue = string | number | Date | null | undefined;

export default ({
  propertyName,
  object,
  sortCaseInsensitive,
}: Args): FinalValue => {
  const nestedFields = propertyName.split(".");
  const nestedFieldsCount = nestedFields.length;

  const finalValue = (() => {
    let tempValue = object;

    for (let i = 0; i < nestedFieldsCount; i++) {
      const nestedField = nestedFields[i];

      if (i === nestedFieldsCount - 1) return tempValue[nestedField];

      tempValue = tempValue[nestedField];
      if (typeof tempValue !== "object" || tempValue === null) {
        // then cannot continue the nested searching for the desired value
        return undefined;
      }
    }
  })();

  return sortCaseInsensitive && finalValue?.toLowerCase
    ? finalValue.toLowerCase()
    : finalValue;
};
