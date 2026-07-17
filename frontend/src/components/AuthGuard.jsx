/**
 * AuthGuard — protège les routes nécessitant une connexion.
 *
 * Comportement :
 *  - Pendant le bootstrap (vérification session) → spinner branded
 *  - Si non connecté → redirige vers /connexion en mémorisant l'URL d'origine
 *  - Si rôle requis et l'utilisateur ne l'a pas → 403
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Spinner from './ui/Spinner.jsx'

export function AuthGuard({ children, role, anyRole, staffOnly = false }) {
  const { isAuthenticated, hasRole, isStaff, user } = useAuthStore()
  const location = useLocation()

  // Pendant un éventuel chargement asynchrone du store : rien.
  // (Zustand persist hydrate de manière synchrone, donc rare.)
  if (typeof isAuthenticated === 'undefined') {
    return <FullPageSpinner />
  }

  if (! isAuthenticated) {
    // Mémorise l'URL d'origine pour redirection post-login.
    sessionStorage.setItem('nwc_redirect_after_login', location.pathname + location.search)
    return <Navigate to="/connexion" replace />
  }

  // Premier login : FORCE le changement de mot de passe.
  // (Le backend renvoie aussi 423 sur les autres endpoints — double sécurité.)
  if (user?.must_change_password && location.pathname !== '/changer-mot-de-passe') {
    return <Navigate to="/changer-mot-de-passe" replace />
  }

  if (role && ! hasRole(role)) {
    return <Forbidden />
  }

  // Liste de rôles autorisés : il suffit d'en avoir UN.
  if (Array.isArray(anyRole) && anyRole.length > 0 && ! anyRole.some((r) => hasRole(r))) {
    return <Forbidden />
  }

  // Mode "staff" : réservé aux rôles admin (superadmin/pasteur/admin/rh).
  // Si un gouverneur ou leader tente /admin/*, on le redirige vers son espace.
  if (staffOnly && ! isStaff()) {
    if (hasRole('gouverneur')) return <Navigate to="/gouverneur" replace />
    if (hasRole('leader'))     return <Navigate to="/leader" replace />
    return <Forbidden />
  }

  return children
}

function Forbidden() {
  return (
    <main className="min-h-screen flex items-center justify-center text-center px-4 bg-ink-950">
      <div>
        <p className="text-script text-3xl text-gold-400">Accès refusé</p>
        <h1 className="font-serif text-7xl text-white mt-2">403</h1>
        <p className="mt-2 text-white/70">Cette zone est réservée à l'équipe NWC.</p>
      </div>
    </main>
  )
}

export function FullPageSpinner() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-ink-950">
      <Spinner size={48} />
    </main>
  )
}
