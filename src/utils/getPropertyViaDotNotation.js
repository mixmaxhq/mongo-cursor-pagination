module.exports = function getPropertyViaDotNotation(propertyName, object) {
  const parts = propertyName.split('.');

  let prop = object;
  for (let i=0; i < parts.length; i++) {
    prop = prop[parts[i]];
  }
  return prop;
};
