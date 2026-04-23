import type { SimulationPoint } from '@/lib/types';

export class PointBuffer {
  private readonly maxSize: number;
  private points: SimulationPoint[] = [];

  constructor(maxSize = 240) {
    this.maxSize = maxSize;
  }

  clear() {
    this.points = [];
  }

  append(nextPoints: SimulationPoint[]) {
    if (nextPoints.length === 0) return;
    this.points = [...this.points, ...nextPoints];
    if (this.points.length > this.maxSize) {
      this.points = this.points.slice(this.points.length - this.maxSize);
    }
  }

  snapshot() {
    return this.points;
  }
}
