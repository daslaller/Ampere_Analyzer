import { describe, expect, it } from 'vitest';
import { PointBuffer } from './point-buffer';

describe('point buffer', () => {
  it('retains only the latest bounded set of points', () => {
    const buffer = new PointBuffer(3);
    buffer.append([
      { sampleIndex: 0, current: 1, temperature: 10, powerLoss: 1, conductionLoss: 0.5, switchingLoss: 0.5, progressPercent: 10, limitingFactor: null, withinLimits: true },
      { sampleIndex: 1, current: 2, temperature: 20, powerLoss: 2, conductionLoss: 1, switchingLoss: 1, progressPercent: 20, limitingFactor: null, withinLimits: true },
      { sampleIndex: 2, current: 3, temperature: 30, powerLoss: 3, conductionLoss: 1.5, switchingLoss: 1.5, progressPercent: 30, limitingFactor: null, withinLimits: true },
      { sampleIndex: 3, current: 4, temperature: 40, powerLoss: 4, conductionLoss: 2, switchingLoss: 2, progressPercent: 40, limitingFactor: null, withinLimits: true }
    ]);

    expect(buffer.snapshot()).toHaveLength(3);
    expect(buffer.snapshot()[0].current).toBe(2);
    expect(buffer.snapshot()[2].current).toBe(4);
  });
});
