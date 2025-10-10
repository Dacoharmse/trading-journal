import type { PlaybookRubric } from '@/types/supabase'

export interface RuleDraft {
  id: string
  playbook_id?: string
  label: string
  type: 'must' | 'should' | 'optional'
  weight: number
  sort: number
}

export interface ConfluenceDraft {
  id: string
  playbook_id?: string
  label: string
  weight: number
  primary_confluence: boolean
  sort: number
}

export type RubricDraft = PlaybookRubric
