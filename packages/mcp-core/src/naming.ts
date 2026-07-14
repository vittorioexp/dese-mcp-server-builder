const MCP_TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const MCP_PROMPT_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export function sanitizeToolName(name: string, prefix?: string): string {
  let sanitized = name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64);

  if (prefix) {
    const prefixed = `${prefix}_${sanitized}`.slice(0, 64);
    sanitized = prefixed;
  }

  if (!sanitized || !MCP_TOOL_NAME_PATTERN.test(sanitized)) {
    sanitized = `tool_${Date.now().toString(36)}`;
  }

  return sanitized;
}

export function sanitizePromptName(name: string): string {
  let sanitized = name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64);

  if (!sanitized || !MCP_PROMPT_NAME_PATTERN.test(sanitized)) {
    sanitized = `prompt_${Date.now().toString(36)}`;
  }

  return sanitized;
}

export function toKebabCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

export function toPascalCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

export function isValidToolName(name: string): boolean {
  return MCP_TOOL_NAME_PATTERN.test(name);
}

export function isValidPromptName(name: string): boolean {
  return MCP_PROMPT_NAME_PATTERN.test(name);
}
