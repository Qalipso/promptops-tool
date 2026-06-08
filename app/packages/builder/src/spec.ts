/**
 * BuilderSpec — generic agent authoring spec.
 * The wizard collects this; compileSpec() turns it into a prompt version body.
 * Domain-agnostic: works for booking agents, support bots, classifiers, etc.
 */

export interface BusinessBrief {
  /** Agent display name, e.g. "Booking Assistant". */
  name: string;
  /** One-sentence purpose / job-to-be-done. */
  purpose: string;
  /** Who the agent talks to. */
  audience?: string;
  /** Free-form domain context (business, product, hours, inventory...). */
  context?: string;
}

export interface AgentBehavior {
  /** Persona / role the model adopts. */
  persona: string;
  /** Tone descriptors, e.g. ["friendly", "concise"]. */
  tone: string[];
  /** Primary language for replies, e.g. "English". */
  language?: string;
  /** Hard guardrails — things the agent must never do. */
  guardrails: string[];
}

export interface AgentRule {
  /** Condition. */
  when: string;
  /** Required action / response. */
  then: string;
}

export interface AgentRules {
  items: AgentRule[];
  /** Global constraints that always apply. */
  constraints: string[];
}

export type ToolParamType = 'string' | 'number' | 'boolean' | 'enum';

export interface ToolParam {
  name: string;
  type: ToolParamType;
  required: boolean;
  description?: string;
  enum_values?: string[];
}

export interface ToolDef {
  name: string;
  description: string;
  params: ToolParam[];
}

export type OutputFormat = 'free_text' | 'json';

export interface OutputContract {
  format: OutputFormat;
  /** JSON schema (or shape description) when format === 'json'. */
  schema?: unknown;
}

export interface BuilderSpec {
  brief: BusinessBrief;
  behavior: AgentBehavior;
  rules: AgentRules;
  tools: ToolDef[];
  output: OutputContract;
}

/** Empty spec scaffold for a new wizard session. */
export function emptySpec(): BuilderSpec {
  return {
    brief: { name: '', purpose: '' },
    behavior: { persona: '', tone: [], guardrails: [] },
    rules: { items: [], constraints: [] },
    tools: [],
    output: { format: 'free_text' },
  };
}
