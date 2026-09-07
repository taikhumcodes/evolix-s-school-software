import { BadRequestError } from '../../lib/errors.js';

/**
 * Escapes HTML characters to prevent XSS / script injection (Rule 19)
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Safely resolves nested property value while preventing prototype pollution (Rule 18).
 * Allowed characters in path: alphanumeric and dots only.
 */
export function resolveSafeProperty(obj: Record<string, any>, path: string): string {
  if (!obj || typeof obj !== 'object') return '';

  const parts = path.trim().split('.');
  let current: any = obj;

  for (const part of parts) {
    if (!part || !/^[a-zA-Z0-9_]+$/.test(part)) {
      throw new BadRequestError(`Invalid variable path character: ${path}`);
    }

    // Explicitly reject prototype pollution vectors (Rule 18)
    if (
      part === '__proto__' ||
      part === 'constructor' ||
      part === 'prototype' ||
      part === '__defineGetter__' ||
      part === '__defineSetter__' ||
      part === '__lookupGetter__' ||
      part === '__lookupSetter__'
    ) {
      throw new BadRequestError(`TEMPLATE_VARIABLE_INVALID: Forbidden property path access: ${path}`);
    }

    if (current === null || current === undefined) {
      return '';
    }

    // Only access own or safe properties
    if (typeof current === 'object' && Object.prototype.hasOwnProperty.call(current, part)) {
      current = current[part];
    } else if (typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return '';
    }
  }

  if (current === null || current === undefined) return '';
  if (typeof current === 'object') return JSON.stringify(current);
  return String(current);
}

export interface RenderTemplateOptions {
  template: string;
  variables: Record<string, any>;
  isHtml?: boolean;
  throwOnSecurityError?: boolean;
}

/**
 * Validates template string for security violations (Rule 18).
 */
export function validateTemplate(template: string): void {
  if (!template) return;
  const matches = template.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g);
  for (const match of matches) {
    const path = match[1];
    const parts = path.trim().split('.');
    for (const part of parts) {
      if (
        part === '__proto__' ||
        part === 'constructor' ||
        part === 'prototype' ||
        part === '__defineGetter__' ||
        part === '__defineSetter__' ||
        part === '__lookupGetter__' ||
        part === '__lookupSetter__'
      ) {
        throw new BadRequestError(`TEMPLATE_VARIABLE_INVALID: Forbidden property path access: ${path}`);
      }
    }
  }
}

/**
 * Replaces {{var.path}} occurrences safely.
 */
export function renderTemplate({ template, variables, isHtml = false, throwOnSecurityError = false }: RenderTemplateOptions): string {
  if (!template) return '';

  if (throwOnSecurityError) {
    validateTemplate(template);
  }

  // Regex matches {{ path }} or {{path}}
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_match, path) => {
    try {
      const rawValue = resolveSafeProperty(variables, path);
      return isHtml ? escapeHtml(rawValue) : rawValue;
    } catch (err) {
      if (throwOnSecurityError) throw err;
      return '';
    }
  });
}

/**
 * Extracts all variable keys used in a template.
 */
export function extractTemplateVariables(template: string): string[] {
  if (!template) return [];
  const matches = template.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g);
  const vars = new Set<string>();
  for (const match of matches) {
    if (match[1]) {
      vars.add(match[1]);
    }
  }
  return Array.from(vars);
}
