import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const DEFAULT_WIDGET_ORDER = [
  'kpi',
  'edge',
  'calendar-equity',
  'breakdowns',
  'session',
  'emotional',
  'distribution',
  'pnl-duration',
  'accounts',
]

interface DashboardLayoutState {
  widgetOrder: string[]
  hiddenWidgets: string[]
  isEditMode: boolean
  setWidgetOrder: (order: string[]) => void
  toggleWidget: (id: string) => void
  setEditMode: (v: boolean) => void
  resetLayout: () => void
}

export const useDashboardLayout = create<DashboardLayoutState>()(
  persist(
    (set, get) => ({
      widgetOrder: DEFAULT_WIDGET_ORDER,
      hiddenWidgets: [],
      isEditMode: false,
      setWidgetOrder: (order) => set({ widgetOrder: order }),
      toggleWidget: (id) => {
        const hidden = get().hiddenWidgets
        set({
          hiddenWidgets: hidden.includes(id)
            ? hidden.filter(h => h !== id)
            : [...hidden, id],
        })
      },
      setEditMode: (v) => set({ isEditMode: v }),
      resetLayout: () => set({ widgetOrder: DEFAULT_WIDGET_ORDER, hiddenWidgets: [] }),
    }),
    {
      name: 'dashboard-layout',
      // Don't persist edit mode — always start in view mode
      partialize: (state) => ({
        widgetOrder: state.widgetOrder,
        hiddenWidgets: state.hiddenWidgets,
      }),
    }
  )
)
