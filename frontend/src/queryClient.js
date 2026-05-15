/**
 * Instance partagée de QueryClient (TanStack Query v5).
 * Configuration globale : cache 5 min, retry 1, refetch off-window.
 */
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Données considérées fraîches pendant 5 min : pas de refetch automatique.
      staleTime: 5 * 60 * 1000,
      // Cache mémoire conservé 30 min après démontage.
      gcTime: 30 * 60 * 1000,
      // Une seule retentative en cas d'erreur (évite les boucles infinies).
      retry: 1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      // Pas de refetch quand on revient sur l'onglet (économie de bande passante).
      refetchOnWindowFocus: false,
      // Refetch automatique quand on retrouve la connexion (PWA).
      refetchOnReconnect: true,
    },
    mutations: {
      // Pas de retry sur les mutations (un POST = une seule action).
      retry: 0,
    },
  },
})
