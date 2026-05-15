/**
 * Store UI globale : préférences d'affichage, état mobile, etc.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUiStore = create(
  persist(
    (set) => ({
      // Menu mobile ouvert/fermé
      mobileMenuOpen: false,
      setMobileMenuOpen: (v) => set({ mobileMenuOpen: !!v }),
      toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),

      // Préférence langue (synchronisée avec i18next)
      language: 'fr',
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'nwc-ui',
      partialize: (s) => ({ language: s.language }),
    }
  )
)
