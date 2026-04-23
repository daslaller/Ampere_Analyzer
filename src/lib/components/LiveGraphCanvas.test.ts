import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import LiveGraphCanvas from './LiveGraphCanvas.svelte';

describe('LiveGraphCanvas', () => {
  it('keeps the same canvas element across prop updates', async () => {
    const points = [
      { sampleIndex: 0, current: 1, temperature: 10, powerLoss: 1, conductionLoss: 0.5, switchingLoss: 0.5, progressPercent: 10, limitingFactor: null, withinLimits: true }
    ];

    const view = render(LiveGraphCanvas, {
      points,
      mode: 'ftf',
      maxTemperature: 150
    });

    const firstCanvas = view.container.querySelector('canvas');
    expect(firstCanvas).not.toBeNull();

    await view.rerender({
      points: [
        ...points,
        { sampleIndex: 1, current: 2, temperature: 20, powerLoss: 2, conductionLoss: 1, switchingLoss: 1, progressPercent: 20, limitingFactor: null, withinLimits: true }
      ],
      mode: 'ftf',
      maxTemperature: 150
    });

    const secondCanvas = view.container.querySelector('canvas');
    expect(secondCanvas).toBe(firstCanvas);
  });
});
