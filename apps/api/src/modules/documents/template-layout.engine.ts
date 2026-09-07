import {
  LayoutDefinition,
  LayoutDefinitionSchema,
  LayoutElement,
} from './documents.types.js';

export class TemplateLayoutEngine {
  private static readonly MAX_ELEMENTS = 500;
  private static readonly MAX_TABLE_COLUMNS = 20;
  private static readonly MAX_NESTING_DEPTH = 5;

  /**
   * Validates layout definition against Zod schema and strict resource limits.
   */
  public static validateLayout(layout: unknown): LayoutDefinition {
    const parsed = LayoutDefinitionSchema.parse(layout);

    let elementCount = 0;
    const inspectElement = (el: LayoutElement, depth: number) => {
      elementCount++;
      if (elementCount > this.MAX_ELEMENTS) {
        throw new Error(`Layout exceeds maximum element limit of ${this.MAX_ELEMENTS}`);
      }
      if (depth > this.MAX_NESTING_DEPTH) {
        throw new Error(`Layout exceeds maximum nesting depth of ${this.MAX_NESTING_DEPTH}`);
      }
      if (el.columns && el.columns.length > this.MAX_TABLE_COLUMNS) {
        throw new Error(`Table element '${el.id}' exceeds maximum column limit of ${this.MAX_TABLE_COLUMNS}`);
      }

      // SSRF & Security checks on image sources
      if (['IMAGE', 'SIGNATURE', 'STAMP'].includes(el.type) && el.source) {
        this.assertSafeMediaSource(el.source);
      }

      if (el.children && el.children.length > 0) {
        for (const child of el.children) {
          inspectElement(child, depth + 1);
        }
      }
    };

    for (const el of parsed.elements) {
      inspectElement(el, 1);
    }
    if (parsed.header?.elements) {
      for (const el of parsed.header.elements) {
        inspectElement(el, 1);
      }
    }
    if (parsed.footer?.elements) {
      for (const el of parsed.footer.elements) {
        inspectElement(el, 1);
      }
    }

    return parsed;
  }

  /**
   * SSRF Protection: Reject URLs or risky schemes. Only allow internal storage keys or safe image base64.
   */
  public static assertSafeMediaSource(source: string): void {
    const trimmed = source.trim().toLowerCase();
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('file://') ||
      trimmed.startsWith('ftp://') ||
      trimmed.startsWith('javascript:')
    ) {
      throw new Error(`Insecure image source rejected: external URLs and schemes are forbidden.`);
    }

    // If data URI, only allow image types
    if (trimmed.startsWith('data:')) {
      if (!trimmed.startsWith('data:image/png;') &&
          !trimmed.startsWith('data:image/jpeg;') &&
          !trimmed.startsWith('data:image/jpg;') &&
          !trimmed.startsWith('data:image/webp;')) {
        throw new Error(`Insecure image data URI rejected: only png, jpeg, and webp are allowed.`);
      }
    }
  }

  /**
   * Safe property resolver preventing prototype pollution.
   */
  public static getSafeValue(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') return undefined;

    const parts = path.split('.');
    let curr = obj;

    for (const part of parts) {
      if (!curr || typeof curr !== 'object') return undefined;

      // Block prototype pollution tokens
      if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
        return undefined;
      }

      curr = curr[part];
    }

    return curr;
  }

  /**
   * Evaluates template formatting filters like {{variable | uppercase}}, {{date | date:DD/MM/YYYY}}, etc.
   */
  public static applyFormatter(value: any, formatterExpr: string): string {
    if (value === undefined || value === null) {
      if (formatterExpr.startsWith('default:')) {
        return formatterExpr.slice(8);
      }
      return '';
    }

    const [filterName, ...filterArgs] = formatterExpr.split(':');
    const arg = filterArgs.join(':');

    switch (filterName.trim().toLowerCase()) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'capitalize':
        return String(value).charAt(0).toUpperCase() + String(value).slice(1);
      case 'currency': {
        const num = Number(value);
        if (isNaN(num)) return String(value);
        const symbol = arg ? arg.trim() : '₹';
        return `${symbol} ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      case 'date': {
        const d = new Date(value);
        if (isNaN(d.getTime())) return String(value);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        if (arg === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
        return `${day}/${month}/${year}`;
      }
      case 'number': {
        const num = Number(value);
        if (isNaN(num)) return String(value);
        return num.toLocaleString('en-IN');
      }
      case 'default':
        return value !== undefined && value !== null && value !== '' ? String(value) : arg;
      default:
        return String(value);
    }
  }

  /**
   * Safe string interpolation supporting variables and pipes.
   * e.g. "Name: {{student.fullName | uppercase}}"
   */
  public static interpolateString(template: string, data: Record<string, any>): string {
    if (!template || typeof template !== 'string') return '';

    return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, expression: string) => {
      const parts = expression.split('|').map((p) => p.trim());
      const varPath = parts[0];
      const rawVal = this.getSafeValue(data, varPath);

      if (parts.length > 1) {
        let val = rawVal;
        for (let i = 1; i < parts.length; i++) {
          val = this.applyFormatter(val, parts[i]);
        }
        return String(val);
      }

      if (rawVal === undefined || rawVal === null) {
        return '';
      }
      if (typeof rawVal === 'object') {
        return JSON.stringify(rawVal);
      }
      return String(rawVal);
    });
  }

  /**
   * Safe condition evaluator without eval() or Function().
   * Supports:
   *  - "{{student.isActive}}" -> truthy check
   *  - "!{{student.isActive}}" -> falsy check
   *  - "{{amount}} > 0"
   *  - "{{status}} == 'ACTIVE'"
   */
  public static evaluateCondition(conditionExpr: string | undefined, data: Record<string, any>): boolean {
    if (!conditionExpr || !conditionExpr.trim()) return true;

    const interpolated = this.interpolateString(conditionExpr.trim(), data).trim();

    // Inverted truthy check: "!true", "!false", "!value"
    if (interpolated.startsWith('!')) {
      const inner = interpolated.slice(1).trim().toLowerCase();
      return inner === 'false' || inner === '0' || inner === '' || inner === 'null' || inner === 'undefined';
    }

    // Comparison operations
    if (interpolated.includes('==')) {
      const [left, right] = interpolated.split('==').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
      return left === right;
    }
    if (interpolated.includes('!=')) {
      const [left, right] = interpolated.split('!=').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
      return left !== right;
    }
    if (interpolated.includes('>=')) {
      const [left, right] = interpolated.split('>=').map((s) => Number(s.trim()));
      return !isNaN(left) && !isNaN(right) && left >= right;
    }
    if (interpolated.includes('<=')) {
      const [left, right] = interpolated.split('<=').map((s) => Number(s.trim()));
      return !isNaN(left) && !isNaN(right) && left <= right;
    }
    if (interpolated.includes('>')) {
      const [left, right] = interpolated.split('>').map((s) => Number(s.trim()));
      return !isNaN(left) && !isNaN(right) && left > right;
    }
    if (interpolated.includes('<')) {
      const [left, right] = interpolated.split('<').map((s) => Number(s.trim()));
      return !isNaN(left) && !isNaN(right) && left < right;
    }

    // Default boolean truthiness
    const lower = interpolated.toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0' || lower === '' || lower === 'null' || lower === 'undefined') return false;
    return Boolean(interpolated);
  }
}
