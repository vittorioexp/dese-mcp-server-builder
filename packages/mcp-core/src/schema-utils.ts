export function ensureJsonSchemaType(schema: Record<string, unknown>): Record<string, unknown> {
  if (schema.type) {
    return schema;
  }

  if (schema.properties) {
    return { type: 'object', ...schema };
  }

  if (schema.items) {
    return { type: 'array', ...schema };
  }

  return { type: 'object', properties: {}, ...schema };
}

export function mergeSchemas(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...base,
    ...override,
    properties: {
      ...(base.properties as Record<string, unknown> | undefined),
      ...(override.properties as Record<string, unknown> | undefined),
    },
    required: [
      ...new Set([
        ...((base.required as string[] | undefined) ?? []),
        ...((override.required as string[] | undefined) ?? []),
      ]),
    ],
  };
}

export function createObjectSchema(
  properties: Record<string, unknown>,
  required: string[] = [],
): Record<string, unknown> {
  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
    additionalProperties: false,
  };
}

export function createStringProperty(description?: string, enumValues?: string[]): Record<string, unknown> {
  const prop: Record<string, unknown> = { type: 'string' };
  if (description) prop.description = description;
  if (enumValues?.length) prop.enum = enumValues;
  return prop;
}

export function createNumberProperty(description?: string): Record<string, unknown> {
  const prop: Record<string, unknown> = { type: 'number' };
  if (description) prop.description = description;
  return prop;
}

export function createBooleanProperty(description?: string): Record<string, unknown> {
  const prop: Record<string, unknown> = { type: 'boolean' };
  if (description) prop.description = description;
  return prop;
}
