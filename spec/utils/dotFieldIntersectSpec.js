const { describe } = require('ava-spec');
var dotFieldIntersect = require('../../src/utils/dotFieldIntersect');

describe('dotFieldIntersect', (it) => {
  it('should work', (t) => {
    t.deepEqual(dotFieldIntersect(['obj1', 'obj2'], ['obj1']), ['obj1']);
    t.deepEqual(dotFieldIntersect(['obj1'], []), []);
    t.deepEqual(dotFieldIntersect(['obj'], ['obj.nested', 'obj.nested2']), ['obj.nested', 'obj.nested2']);
    t.deepEqual(dotFieldIntersect(['obj.nested', 'obj.nested2'], ['obj']), ['obj.nested', 'obj.nested2']);
    t.deepEqual(dotFieldIntersect(['obj', 'obj2'], ['obj.one', 'obj.four.five']), ['obj.one', 'obj.four.five']);
    t.deepEqual(dotFieldIntersect(['obj.nested'], ['obj.nested.morenested', 'obj.nested.morenested1']), ['obj.nested.morenested', 'obj.nested.morenested1']);
    t.deepEqual(dotFieldIntersect(['obj.nested', 'obj2'], ['obj']), ['obj.nested']);
  });
});
