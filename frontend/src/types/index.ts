export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type StepType = 'http_request' | 'json_transform' | 'condition';

export interface HttpRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  timeout_seconds?: number;
}

export interface JsonTransformConfig {
  operation: 'select_path' | 'rename_keys' | 'construct_object' | 'type_convert';
  path?: string;
  mappings?: Record<string, string>;
  template?: Record<string, any>;
  target_type?: 'string' | 'integer' | 'float' | 'boolean' | 'json';
}

export interface ConditionConfig {
  left_operand: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists' | 'not_exists';
  right_operand?: any;
}

export interface RetryConfig {
  max_attempts: number;
  backoff_factor: number;
}

export interface StepDefinition {
  key: string;
  name: string;
  type: StepType;
  config: HttpRequestConfig | JsonTransformConfig | ConditionConfig | any;
  retry?: RetryConfig;
}

export interface TriggerDefinition {
  type: 'webhook' | 'scheduled' | 'manual';
  config: {
    idempotency_header?: string;
    required_fields?: string[];
    cron_expression?: string;
    interval_seconds?: number;
    sample_payload?: Record<string, any>;
  };
}

export interface WorkflowDefinition {
  trigger: TriggerDefinition;
  steps: StepDefinition[];
}

export interface Workflow {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'inactive';
  definition_json: WorkflowDefinition;
  version: number;
  trigger_type: 'webhook' | 'scheduled' | 'manual';
  webhook_token?: string;
  webhook_url?: string;
  created_at: string;
  updated_at: string;
  last_execution_status?: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  last_execution_at?: string;
}

export interface ExecutionStep {
  id: string;
  execution_id: string;
  step_key: string;
  step_type: StepType;
  step_order: number;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';
  input_summary?: any;
  output_summary?: any;
  error_summary?: string;
  attempt_count: number;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
}

export interface Execution {
  id: string;
  workflow_id: string;
  owner_id: string;
  workflow_version: number;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  trigger_source: string;
  input_payload?: any;
  workflow_snapshot?: WorkflowDefinition;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  error_summary?: string;
  idempotency_key?: string;
  created_at: string;
  steps?: ExecutionStep[];
  workflow_name?: string;
}

export interface DashboardSummary {
  total_workflows: number;
  active_workflows: number;
  total_executions: number;
  succeeded_executions: number;
  failed_executions: number;
  success_rate_percent: number;
  avg_duration_ms: number;
  recent_activity: {
    id: string;
    workflow_id: string;
    workflow_name: string;
    status: string;
    trigger_source: string;
    duration_ms?: number;
    created_at: string;
    error_summary?: string;
  }[];
}

export interface ExecutionTrendPoint {
  timestamp: string;
  total: number;
  succeeded: number;
  failed: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
