import { describe, expect, it } from 'vitest';
import { buttonClasses } from './Button';

describe('buttonClasses', () => {
  it('keeps every size at least 44px tall', () => {
    expect(buttonClasses({ size: 'sm' })).toContain('min-h-11');
    expect(buttonClasses({ size: 'md' })).toContain('min-h-12');
    expect(buttonClasses({ size: 'lg' })).toContain('min-h-14');
  });

  it('uses tokens only, never a hardcoded hex', () => {
    for (const variant of ['gold', 'ghost', 'quiet', 'danger'] as const) {
      expect(buttonClasses({ variant })).not.toMatch(/#[0-9a-f]{3,8}/i);
    }
  });

  it('lets a caller class override the variant fill', () => {
    const cls = buttonClasses({ variant: 'quiet', className: 'bg-surface-3' });
    expect(cls).toContain('bg-surface-3');
    expect(cls).not.toContain('bg-surface-2 ');
  });
});
