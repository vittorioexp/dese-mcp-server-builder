import type { GenerationOptions, GenerationResult, InputSourceType } from '@dese-mcp/shared';

export interface GeneratorContext {
  projectId: string;
  projectName: string;
  inputConfig: Record<string, unknown>;
  options: GenerationOptions;
}

export interface InputAnalyzer<TAnalysis = unknown> {
  analyze(context: GeneratorContext): Promise<TAnalysis>;
}

export interface McpGenerator<TAnalysis = unknown> {
  readonly sourceType: InputSourceType;
  analyze(context: GeneratorContext): Promise<TAnalysis>;
  generate(context: GeneratorContext, analysis: TAnalysis): Promise<GenerationResult>;
}

export interface GeneratorPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly sourceTypes: InputSourceType[];
  createGenerator(sourceType: InputSourceType): McpGenerator | null;
}

export abstract class BaseMcpGenerator<TAnalysis = unknown> implements McpGenerator<TAnalysis> {
  abstract readonly sourceType: InputSourceType;

  abstract analyze(context: GeneratorContext): Promise<TAnalysis>;
  abstract generate(context: GeneratorContext, analysis: TAnalysis): Promise<GenerationResult>;

  protected createWarnings(messages: string[]): string[] {
    return messages.filter(Boolean);
  }
}

export interface GeneratorRegistry {
  register(generator: McpGenerator): void;
  registerPlugin(plugin: GeneratorPlugin): void;
  get(sourceType: InputSourceType): McpGenerator | undefined;
  list(): InputSourceType[];
}

export class DefaultGeneratorRegistry implements GeneratorRegistry {
  private generators = new Map<InputSourceType, McpGenerator>();

  register(generator: McpGenerator): void {
    this.generators.set(generator.sourceType, generator);
  }

  registerPlugin(plugin: GeneratorPlugin): void {
    for (const sourceType of plugin.sourceTypes) {
      const generator = plugin.createGenerator(sourceType);
      if (generator) {
        this.register(generator);
      }
    }
  }

  get(sourceType: InputSourceType): McpGenerator | undefined {
    return this.generators.get(sourceType);
  }

  list(): InputSourceType[] {
    return Array.from(this.generators.keys());
  }
}

export const generatorRegistry = new DefaultGeneratorRegistry();
