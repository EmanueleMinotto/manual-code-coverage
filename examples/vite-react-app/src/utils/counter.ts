export function increment(value: number): number {
  return value + 1;
}

export function decrement(value: number): number {
  if (value <= 0) return 0;
  return value - 1;
}

export function reset(): number {
  return 0;
}

export function double(value: number): number {
  return value * 2;
}

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
