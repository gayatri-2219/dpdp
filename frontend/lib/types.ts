export interface ScanResult {
  scan_id: string
  filename: string
  status: 'completed' | 'processing' | 'failed'
  summary: {
    total_pii_found: number
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    risk_score: number
    risk_rationale: string
    breakdown: { CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number }
    pii_type_counts: Record<string, number>
    compliance_score: number
    rules_passed: number
    rules_failed: number
    manual_review_required: number
  }
  pii_entities: PIIEntity[]
  masked_text: string
  masked_views: { redacted: string; partial: string; tokenized: string }
  rule_results: RuleResult[]
  compliance_summary: ComplianceSummary
  triggered_sections: string[]
}

export interface PIIEntity {
  entity_type: string
  value: string
  masked: string
  start: number
  end: number
  confidence: number
  source: 'regex' | 'presidio' | 'spacy' | 'llm'
  page: number
}

export interface RuleResult {
  id: number
  title: string
  section: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'PASS' | 'FAIL' | 'MANUAL_REVIEW'
  reason: string
  remediation: string
}

export interface ComplianceSummary {
  total_rules: number
  passed: number
  failed: number
  manual_review: number
  compliance_score: number
  critical_failures: { id: number; title: string; reason: string }[]
}

export interface Recommendation {
  issue: string
  impact: string
  recommendation: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  timeline: string
  dpdp_section?: string
}

export interface Document {
  id: string
  original_filename: string
  file_type: string
  file_size: number
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  pii_count: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  risk_score: number
  created_at: string
  updated_at: string
}
