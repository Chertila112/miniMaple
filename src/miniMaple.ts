type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'var'; name: string }
  | { kind: 'add'; left: Expr; right: Expr }
  | { kind: 'sub'; left: Expr; right: Expr }
  | { kind: 'mul'; left: Expr; right: Expr }
  | { kind: 'pow'; base: Expr; exp: number };


class Parser {
  private pos = 0;
  constructor(private readonly src: string) {}

  parse(): Expr {
    const e = this.parseExpr();
    this.skipWs();
    if (this.pos < this.src.length) {
      throw new Error(
        `Unexpected character '${this.src[this.pos]}' at position ${this.pos}`,
      );
    }
    return e;
  }

  private skipWs(): void {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) this.pos++;
  }

  private peek(): string {
    this.skipWs();
    return this.src[this.pos] ?? '';
  }

  private parseExpr(): Expr {
    let left = this.parseTerm();
    for (;;) {
      const c = this.peek();
      if (c === '+') {
        this.pos++;
        left = { kind: 'add', left, right: this.parseTerm() };
      } else if (c === '-') {
        this.pos++;
        left = { kind: 'sub', left, right: this.parseTerm() };
      } else break;
    }
    return left;
  }

  private parseTerm(): Expr {
    let left = this.parseUnary();
    for (;;) {
      if (this.peek() === '*') {
        this.pos++;
        left = { kind: 'mul', left, right: this.parseUnary() };
      } else break;
    }
    return left;
  }

  private parseUnary(): Expr {
    const c = this.peek();
    if (c === '-') {
      this.pos++;
      return { kind: 'mul', left: { kind: 'num', value: -1 }, right: this.parseUnary() };
    }
    if (c === '+') {
      this.pos++;
      return this.parseUnary();
    }
    return this.parsePower();
  }

  private parsePower(): Expr {
    const base = this.parseAtom();
    if (this.peek() === '^') {
      this.pos++;
      this.skipWs();
      const start = this.pos;
      while (this.pos < this.src.length && /[0-9]/.test(this.src[this.pos])) this.pos++;
      if (start === this.pos) throw new Error('Exponent must be constant');
      const exp = parseInt(this.src.slice(start, this.pos), 10);
      return { kind: 'pow', base, exp };
    }
    return base;
  }

  private parseAtom(): Expr {
    this.skipWs();
    const c = this.src[this.pos];
    if (c === undefined) throw new Error('Unexpected end of input');

    if (/[0-9]/.test(c)) {
      const start = this.pos;
      while (this.pos < this.src.length && /[0-9]/.test(this.src[this.pos])) this.pos++;
      return { kind: 'num', value: parseInt(this.src.slice(start, this.pos), 10) };
    }
    if (/[a-zA-Z_]/.test(c)) {
      const start = this.pos;
      while (this.pos < this.src.length && /[a-zA-Z0-9_]/.test(this.src[this.pos])) this.pos++;
      return { kind: 'var', name: this.src.slice(start, this.pos) };
    }
    throw new Error(`Unexpected character '${c}' at position ${this.pos}`);
  }}

function diff(e: Expr, v: string): Expr {
  switch (e.kind) {
    case 'num':
      return { kind: 'num', value: 0 };
    case 'var':
      return { kind: 'num', value: e.name === v ? 1 : 0 };
    case 'add':
      return { kind: 'add', left: diff(e.left, v), right: diff(e.right, v) };
    case 'sub':
      return { kind: 'sub', left: diff(e.left, v), right: diff(e.right, v) };
    case 'mul':
      return {
        kind: 'add',
        left: { kind: 'mul', left: diff(e.left, v), right: e.right },
        right: { kind: 'mul', left: e.left, right: diff(e.right, v) },
      };
    case 'pow': {
      if (e.exp === 0) return { kind: 'num', value: 0 };
      return {
        kind: 'mul',
        left: {
          kind: 'mul',
          left: { kind: 'num', value: e.exp },
          right: { kind: 'pow', base: e.base, exp: e.exp - 1},
        },
        right: diff(e.base, v),
      };
    }
  }
}

interface Term {
  coef: number;
  parts: Map<string, number>;
}

function toTerms(e: Expr): Term[] {
  switch (e.kind) {
    case 'num':
      return [{ coef: e.value, parts: new Map() }];
    case 'var':
      return [{ coef: 1, parts: new Map([[e.name, 1]]) }];
    case 'add':
      return [...toTerms(e.left), ...toTerms(e.right)];
    case 'sub':
      return [
        ...toTerms(e.left),
        ...toTerms(e.right).map((t) => ({ ...t, coef: -t.coef })),
      ];
    case 'mul': {
      const ls = toTerms(e.left);
      const rs = toTerms(e.right);
      const out: Term[] = [];
      for (const l of ls) {
        for (const r of rs) {
          const parts = new Map(l.parts);
          for (const [k, exp] of r.parts) parts.set(k, (parts.get(k) ?? 0) + exp);
          out.push({ coef: l.coef * r.coef, parts });
        }
      }
      return out;
    }
    case 'pow': {
      if (e.exp === 0) return [{ coef: 1, parts: new Map() }];
      if (e.exp === 1) return toTerms(e.base);
      if (e.base.kind === 'var') {
        return [{ coef: 1, parts: new Map([[e.base.name, e.exp]]) }];
      }
      if (e.base.kind === 'num') {
        return [{ coef: Math.pow(e.base.value, e.exp), parts: new Map() }];
      }
      throw new Error('Unsupported expression for simplification');
    }
  }
}

function combineTerms(terms: Term[]): Term[] {
  const map = new Map<string, Term>();
  for (const t of terms) {
    const key = [...t.parts.entries()]
      .filter(([, exp]) => exp !== 0)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, exp]) => `${k}^${exp}`)
      .join('*');
    const existing = map.get(key);
    if (existing) existing.coef += t.coef;
    else map.set(key, { coef: t.coef, parts: new Map(t.parts) });
  }
  return [...map.values()].filter((t) => t.coef !== 0);
}

function totalDegree(t: Term): number {
  let d = 0;
  for (const exp of t.parts.values()) d += exp;
  return d;
}

function termBody(t: Term): string {
  const absCoef = Math.abs(t.coef)
  const entries = [...t.parts.entries()]
    .filter(([, exp]) => exp !== 0)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  if (entries.length === 0) return String(absCoef);
  const body = entries
    .map(([name, exp]) => (exp === 1 ? name : `${name}^${exp}`))
    .join('*');
  return absCoef === 1 ? body : `${absCoef}*${body}`;
}

function formatTerms(terms: Term[]): string {
  if (terms.length === 0) return '0';
  const sorted = [...terms].sort((a, b) => {
    const da = totalDegree(a);
    const db = totalDegree(b);
    if (da !== db) return db - da;
    const ka = [...a.parts.keys()].sort().join(',');
    const kb = [...b.parts.keys()].sort().join(',');
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  let out = '';
  sorted.forEach((t, i) => {
    const neg = t.coef < 0;
    const body = termBody(t);
    if (i === 0) out += (neg ? '-' : '') + body;
    else out += (neg ? ' - ' : ' + ') + body;
  });
  return out;
}

class MiniMaple {
  diff(expr: string, variable: string): string {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable)) {
      throw new Error(`Invalid variable name: '${variable}'`);
    }
    const ast = new Parser(expr).parse();
    const d = diff(ast, variable);
    const terms = combineTerms(toTerms(d));
    return formatTerms(terms);
  }
}

export {MiniMaple}
