/**
 * Trade Form Fields Store
 * Persists which optional form sections are visible.
 * Mandatory fields are always shown; only optional sections are togglable.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface OptionalField {
  id: string
  label: string
  description: string
}

export const OPTIONAL_FIELDS: OptionalField[] = [
  {
    id: 'execution_method',
    label: 'Execution Method',
    description: 'Market, Limit, Stop, Stop Limit order type',
  },
  {
    id: 'timeframes',
    label: 'Entry & Analysis Timeframes',
    description: 'Timeframe used to enter and analyse the trade, plus HTF chart upload',
  },
  {
    id: 'planned_setup',
    label: 'Planned Setup',
    description: 'Planned stop/TP distance, planned R:R, and risk per trade',
  },
  {
    id: 'pnl_amount',
    label: 'P/L Amount (Currency)',
    description: 'Profit or loss in account currency',
  },
  {
    id: 'mae_mfe',
    label: 'MAE & MFE',
    description: 'Max Adverse & Favorable Excursion — how far price moved against/for you',
  },
  {
    id: 'session',
    label: 'Session & Session Hour',
    description: 'Asia, London or NY session and specific hour within it',
  },
  {
    id: 'emotional_state',
    label: 'Emotional State',
    description: 'How you felt when taking this trade',
  },
  {
    id: 'confluences',
    label: 'Confluences',
    description: 'Additional confluences or factors supporting the trade',
  },
  {
    id: 'playbook_checklist',
    label: 'Playbook Checklist',
    description: 'Rules and confluences checklist tied to the selected playbook',
  },
  {
    id: 'notes',
    label: 'Notes',
    description: 'Free-form trade journal notes and observations',
  },
  {
    id: 'mentor_review',
    label: 'Request Mentor Review',
    description: 'Ask a mentor to review and give feedback on this trade',
  },
]

// Fields enabled by default
const defaultEnabledFields = [
  'execution_method',
  'timeframes',
  'planned_setup',
  'pnl_amount',
  'session',
  'emotional_state',
  'confluences',
  'playbook_checklist',
  'notes',
  'mentor_review',
]

interface TradeFormFieldsState {
  enabledFields: string[]
  toggleField: (id: string) => void
  enableAll: () => void
  resetToDefaults: () => void
}

export const useTradeFormFields = create<TradeFormFieldsState>()(
  persist(
    (set) => ({
      enabledFields: defaultEnabledFields,

      toggleField: (id) => {
        set((state) => {
          const enabled = state.enabledFields.includes(id)
          return {
            enabledFields: enabled
              ? state.enabledFields.filter((f) => f !== id)
              : [...state.enabledFields, id],
          }
        })
      },

      enableAll: () => {
        set({ enabledFields: OPTIONAL_FIELDS.map((f) => f.id) })
      },

      resetToDefaults: () => {
        set({ enabledFields: defaultEnabledFields })
      },
    }),
    {
      name: 'trade-form-fields',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
