export function toUpperCase(s: string): string {
  return s.toUpperCase();
}

export function reverse(s: string): string {
  return s.split('').reverse().join('');
}

export function countVowels(s: string): number {
  const matches = s.match(/[aeiouAEIOU]/g);
  return matches ? matches.length : 0;
}

export function isPalindrome(s: string): boolean {
  const clean = s.toLowerCase().replace(/\s/g, '');
  return clean === clean.split('').reverse().join('');
}
