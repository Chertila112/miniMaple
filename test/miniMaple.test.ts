import { describe, test, expect } from 'vitest';
import { MiniMaple } from '../src/miniMaple';

const mm = new MiniMaple();

describe('MiniMaple.diff', () => {
  //sample examples
  describe('examples from the task', () => {
    test('4*x^3 by x', () => {
      expect(mm.diff('4*x^3', 'x')).toBe('12*x^2');
    });
    test('4*x^3 by y', () => {
      expect(mm.diff('4*x^3', 'y')).toBe('0');
    });
    test('4*x^3 - x^2 by x', () => {
      expect(mm.diff('4*x^3-x^2', 'x')).toBe('12*x^2 - 2*x');
    });
  });

  //default rules
  describe('default rules', () => {
    test('constant', () => {
      expect(mm.diff('5', 'x')).toBe('0');
      expect(mm.diff('0', 'x')).toBe('0');
      expect(mm.diff('42', 'y')).toBe('0');
    });

    test('identity', () => {
      expect(mm.diff('x', 'x')).toBe('1');
      expect(mm.diff('y', 'y')).toBe('1');
    });

    test('foreign variable', () => {
      expect(mm.diff('x', 'y')).toBe('0');
      expect(mm.diff('y', 'x')).toBe('0');
    });

    test('power rule', () => {
      expect(mm.diff('x^2', 'x')).toBe('2*x');
      expect(mm.diff('x^1', 'x')).toBe('1');
      expect(mm.diff('x^0', 'x')).toBe('0');
      expect(mm.diff('x^3', 'x')).toBe('3*x^2');
      expect(mm.diff('x^10', 'x')).toBe('10*x^9');
    });

    test('linear coefficient', () => {
      expect(mm.diff('2*x', 'x')).toBe('2');
      expect(mm.diff('2*x^2', 'x')).toBe('4*x');
      expect(mm.diff('5*x^3', 'x')).toBe('15*x^2');
    });
  });

  //sum | diff | prod
  describe('sum, difference, product', () => {
    test('like terms combine', () => {
      expect(mm.diff('x + x', 'x')).toBe('2');
      expect(mm.diff('x^2 + x^2', 'x')).toBe('4*x');
      expect(mm.diff('x^2 + x^2 + x^2', 'x')).toBe('6*x');
      expect(mm.diff('x^3 + x^3', 'x')).toBe('6*x^2');
    });

    test('cancellation', () => {
      expect(mm.diff('x - x', 'x')).toBe('0');
      expect(mm.diff('x^2 - x^2', 'x')).toBe('0');
    });

    test('product rule', () => {
      expect(mm.diff('x*x', 'x')).toBe('2*x');
      expect(mm.diff('x*x*x', 'x')).toBe('3*x^2');
      expect(mm.diff('2*x*y', 'x')).toBe('2*y');
      expect(mm.diff('2*x*y', 'y')).toBe('2*x');
    });

    test('polynomials', () => {
      expect(mm.diff('2*x^2 + 3*x + 1', 'x')).toBe('4*x + 3');
      expect(mm.diff('x^2 + x + 1', 'x')).toBe('2*x + 1');
      expect(mm.diff('x + 1', 'x')).toBe('1');
    });

    test('multivariate', () => {
      expect(mm.diff('3*x^2*y + y^2', 'x')).toBe('6*x*y');
      expect(mm.diff('3*x^2*y + y^2', 'y')).toBe('3*x^2 + 2*y');
      expect(mm.diff('x^2*y^3', 'x')).toBe('2*x*y^3');
      expect(mm.diff('x^2*y^3', 'y')).toBe('3*x^2*y^2');
      expect(mm.diff('a*x^2', 'x')).toBe('2*a*x');
    });

    test('sign handling', () => {
      expect(mm.diff('-x', 'x')).toBe('-1');
      expect(mm.diff('-x^2', 'x')).toBe('-2*x');
      expect(mm.diff('-2*x^3', 'x')).toBe('-6*x^2');
    });
  });

  //whitespace tolerance
  describe('whitespace', () => {
    test('spaces around operators', () => {
      expect(mm.diff('4 * x ^ 3', 'x')).toBe('12*x^2');
      expect(mm.diff('  2*x  +  3  ', 'x')).toBe('2');
      expect(mm.diff('x  -  x', 'x')).toBe('0');
    });
  });

  //unsupported operations
  describe('unsupported operations', () => {
    test('division', () => {
      expect(() => mm.diff('x/y', 'x')).toThrow(/Unexpected character/);
    });

    test('function call', () => {
      expect(() => mm.diff('sin(x)', 'x')).toThrow(/Unexpected character/);
      expect(() => mm.diff('cos(x)', 'x')).toThrow(/Unexpected character/);
    });

    test('parentheses', () => {
      expect(() => mm.diff('(x+1)^2', 'x')).toThrow(/Unexpected character/);
      expect(() => mm.diff('(x)', 'x')).toThrow(/Unexpected character/);
    });

    test('non-constant exponent', () => {
      expect(() => mm.diff('x^y', 'x')).toThrow(/Exponent must be constant/);
    });

    test('modulo and other symbols', () => {
      expect(() => mm.diff('x%y', 'x')).toThrow(/Unexpected character/);
      expect(() => mm.diff('x&y', 'x')).toThrow(/Unexpected character/);
    });
  });

  //invalid input
  describe('invalid input', () => {
    test('empty expression', () => {
      expect(() => mm.diff('', 'x')).toThrow();
    });

    test('dangling operator', () => {
      expect(() => mm.diff('x +', 'x')).toThrow();
      expect(() => mm.diff('* x', 'x')).toThrow();
    });

    test('invalid variable name', () => {
      expect(() => mm.diff('x', '1x')).toThrow(/Invalid variable name/);
      expect(() => mm.diff('x', 'x y')).toThrow(/Invalid variable name/);
    });
  });
});
