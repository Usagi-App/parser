export type SourceStatus = 'working' | 'broken' | 'blocked' | 'unknown'

export interface HealthCheck {
  status: SourceStatus
  checkedAt: string | null
  latencyMs: number | null
  httpStatus: number | null
  finalUrl: string | null
  reason: string | null
}

export interface SourceItem {
  id: string
  key: string
  title: string
  language: string
  engine: string | null
  path: string
  repoUrl: string
  rawUrl: string
  domains: string[]
  health: HealthCheck
}

export interface DataSummary {
  total: number
  working: number
  broken: number
  blocked: number
  unknown: number
}

export interface SourceDataset {
  generatedAt: string | null
  sourceRepo: {
    owner: string
    repo: string
    branch: string
  }
  summary: DataSummary
  sources: SourceItem[]
  disclaimer: string
}
