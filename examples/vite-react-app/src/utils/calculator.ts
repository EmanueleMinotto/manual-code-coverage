export type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

export function calculate(a: number, b: number, op: Operation): number | string {
  if (op === 'add') return a + b;
  if (op === 'subtract') return a - b;
  if (op === 'multiply') return a * b;
  if (op === 'divide') {
    if (b === 0) return 'Error: divisione per zero';
    return a / b;
  }
  return 'Error: operazione sconosciuta';
}
