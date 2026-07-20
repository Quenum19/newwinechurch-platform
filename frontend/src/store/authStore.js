/**
 * Store global d'authentification (Zustand + persist).
 * Conserve l'utilisateur connecté + ses rôles/permissions.
 *
 * NB : le token reste en localStorage (clé "nwc_token") pour que
 * l'intercepteur axios puisse l'ajouter automatiquement.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      roles: [],
      permissions: [],
      isAuthenticated: false,

      /** Marque l'utilisateur comme connecté (appelé après login réussi). */
      setUser: (user) =>
        set({
          user,
          roles: user?.roles ?? [],
          permissions: user?.permissions ?? [],
          isAuthenticated: !!user,
        }),

      /** Vide la session (logout local). */
      clear: () => {
        localStorage.removeItem('nwc_token')
        set({ user: null, roles: [], permissions: [], isAuthenticated: false })
      },

      /** Helper : l'utilisateur a-t-il un rôle donné ? */
      hasRole: (role) => get().roles.includes(role),

      /** Helper : l'utilisateur a-t-il l'un des rôles dans la liste ? */
      hasAnyRole: (roles) => {
        const own = get().roles
        return roles.some((r) => own.includes(r))
      },

      /** Helper : l'utilisateur a-t-il une permission donnée ? */
      can: (permission) => get().permissions.includes(permission),

      /** Helper : est-ce un membre du staff admin (admin, pasteur, rh, superadmin) ?
       *  NB: gouverneur et leader ne sont PAS du staff admin — ils ont leur
       *  propre espace dédié /gouverneur ou /leader. */
      isStaff: () => {
        const r = get().roles
        // Tous les rôles qui ont accès à /admin/* (permission access admin panel).
        // Doit correspondre aux rôles seedés dans RolesAndPermissionsSeeder.
        return r.includes('superadmin')
            || r.includes('pasteur')
            || r.includes('admin')
            || r.includes('admin-site')
            || r.includes('rh')
            || r.includes('tresorier')
            || r.includes('accueil')
      },
    }),
    {
      name: 'nwc-auth', // clé localStorage
      partialize: (state) => ({
        user: state.user,
        roles: state.roles,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
