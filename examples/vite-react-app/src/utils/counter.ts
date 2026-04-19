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
