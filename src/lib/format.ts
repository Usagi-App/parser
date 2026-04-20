import type { SourceStatus } from '@/types'

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatDate(value: string | null): string {
  if (!value) return 'Not generated yet'

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function titleCaseStatus(status: SourceStatus): string {
  switch (status) {
    case 'working':
      return 'Working'
    case 'broken':
      return 'Broken'
    case 'blocked':
      return 'Blocked'
    case 'unknown':
      return 'Unknown'
  }
}

export function toLatencyLabel(value: number | null): string {
  if (value === null) return '—'
  return `${Math.round(value)} ms`
}
