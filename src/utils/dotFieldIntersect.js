var _ = require('underscore');

/**
 * Returns the narrowest set of intersecting "dot notation fields" given two arrays.
 * So given the two properties 'object' and 'object.nestedproperty', the intersection
 * is 'object.nestedproperty' because that's the property with the narrowest scope.
 * This is useful to apply a whitelist to a Mongo projection. So if the user asks for
 * all of 'object' to be returned, you can limit it to just 'object.nestedproperty'.
 */
module.exports = function(dotFields1, dotFields2) {
  var intersection = [];

  // TODO: I'm sure this can be made more efficient.

  dotFields1.forEach(dotField1 => {
    dotFields2.forEach(dotField2 => {
      if (sameOrBroader(dotField1, dotField2)) {
        intersection.push(dotField1);
      }
    });
  });

  // Check the reverse.
  dotFields2.forEach(dotField2 => {
    dotFields1.forEach(dotField1 => {
      if (sameOrBroader(dotField2, dotField1)) {
        intersection.push(dotField2);
      }
    });
  });

  return _.uniq(intersection);
};

// Helper returns true if the 
function sameOrBroader(dotField1, dotField2) {
  var dotField1Parts = dotField1.split('.');
  var dotField2Parts = dotField2.split('.');
  if (dotField1Parts.length < dotField2Parts.length) return false;
  for (var i = 0; i < dotField2Parts.length; i++) {
    if (dotField1Parts[i] !== dotField2Parts[i]) return false;
  }
  return true;
}