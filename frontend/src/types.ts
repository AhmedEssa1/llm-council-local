// Types for the LLM Council API

export interface CouncilMember {
  id: string;
  name: string;
  type: 'cli' | 'ollama' | 'api';
  enabled: boolean;
  command?: string;
  args?: string[];
  host?: string;
  model?: string;
  provider?: string;
}

export interface ModelResponse {
  model_id: string;
  model_name: string;
  content: string;
  error?: string;
  duration_ms?: number;
}

export interface CouncilResult {
  prompt: string;
  chairman_response: string;
  chairman_model: string;
  individual_responses: ModelResponse[];
  rankings?: Record<string, number>;
}

export interface QueryRequest {
  prompt: string;
  models?: string[];
  chairman?: string;
  return_individual?: boolean;
}

export interface CouncilConfig {
  council_members: CouncilMember[];
  chairman: string;
}
