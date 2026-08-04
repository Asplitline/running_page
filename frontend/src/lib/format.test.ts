import { formatKm } from './format';

describe('formatKm', () => {
  it('千分位', () => {
    expect(formatKm(2192)).toBe('2,192');
  });
  it('保留 1 位小数并加千分位', () => {
    expect(formatKm(1234.5)).toBe('1,234.5');
  });
  it('小数 0 → 3', () => {
    expect(formatKm(0)).toBe('0');
  });
});
