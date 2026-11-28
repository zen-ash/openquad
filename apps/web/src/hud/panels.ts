import { create } from 'zustand'

// the panels that open under the buttons at the top right, one at a time (the places search,
// my day, the tours, settings). a building's card opens in the same spot and closes them
export type Panel = 'places' | 'day' | 'tours' | 'settings'

export const usePanel = create<{ open: Panel | null }>(() => ({ open: null }))

export const togglePanel = (panel: Panel) =>
  usePanel.setState((s) => ({ open: s.open === panel ? null : panel }))
