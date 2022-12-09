export default (propertyName: string, object: object): string => {
  const parts = propertyName.split('.');

  let prop: string;
  for (let i = 0; i < parts.length; i++) {
    prop = object[parts[i]];
  }
  return prop;
};
