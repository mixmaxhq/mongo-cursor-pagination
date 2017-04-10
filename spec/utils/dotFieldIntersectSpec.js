var dotFieldIntersect = require('../../src/utils/dotFieldIntersect');

describe('dotFieldIntersect', () => {
  it('should work', () => {
    expect(dotFieldIntersect(['obj1', 'obj2'], ['obj1'])).toEqual(['obj1']);
    expect(dotFieldIntersect(['obj1'], [])).toEqual([]);
    expect(dotFieldIntersect(['obj'], ['obj.nested', 'obj.nested2'])).toEqual(['obj.nested', 'obj.nested2']);
    expect(dotFieldIntersect(['obj.nested', 'obj.nested2'], ['obj'])).toEqual(['obj.nested', 'obj.nested2']);
    expect(dotFieldIntersect(['obj', 'obj2'], ['obj.one', 'obj.four.five'])).toEqual(['obj.one', 'obj.four.five']);
    expect(dotFieldIntersect(['obj.nested'], ['obj.nested.morenested', 'obj.nested.morenested1'])).toEqual(['obj.nested.morenested', 'obj.nested.morenested1']);
    expect(dotFieldIntersect(['obj.nested', 'obj2'], ['obj'])).toEqual(['obj.nested']);
  });
});
