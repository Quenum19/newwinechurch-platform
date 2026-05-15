/**
 * Hook central d'authentification.
 *
 * Bootstrap : au premier render de l'app, vérifie si une session existe
 * (cookie Sanctum ou Bearer token) et hydrate le store auth en conséquence.
 *
 * Expose login/logout/register comme mutations React Query, avec gestion
 * automatique des toasts d'erreur et de la navigation post-action.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import * as authApi from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

/**
 * Bootstrap auth : à appeler une fois au montage de l'app.
 * Tente de récupérer le profil depuis /api/me et hydrate le store.
 */
export function useAuthBootstrap() {
  const setUser = useAuthStore((s) => s.setUser)
  const clear   = useAuthStore((s) => s.clear)

  const { isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.fetchMe,
    retry: false,
    staleTime: 60_000,
    // Si pas de token ni de cookie, on saute carrément la requête.
    enabled: typeof window !== 'undefined',
    onSuccess: (user) => setUser(user),
    onError: () => clear(),
  })

  return { isBootstrapping: isLoading }
}

/** Mutation login : redirige vers la page demandée ou /mon-espace. */
export function useLogin() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setUser(data.user)
      queryClient.setQueryData(['me'], data.user)
      toast.success(`Bienvenue, ${data.user.first_name || data.user.name} 🙌`)

      // Redirige vers la page d'origine si stockée ; sinon passe par /espace-perso
      // qui résout le bon espace selon le rôle (gouverneur > leader > staff > membre).
      // Garde-fou : si l'URL stockée mène à une zone à laquelle le nouveau user
      // n'a pas accès, on ignore et on retombe sur /espace-perso (évite 403).
      const redirect = sessionStorage.getItem('nwc_redirect_after_login')
      sessionStorage.removeItem('nwc_redirect_after_login')

      const roles = data.user?.roles ?? []
      const isStaff = ['superadmin', 'admin', 'admin-site', 'pasteur', 'rh'].some((r) => roles.includes(r))
      const isGovernor = roles.includes('gouverneur')
      const isLeader   = roles.includes('leader')

      let target = redirect || '/espace-perso'
      // Filtres : un user qui n'est pas staff n'a rien à faire sur /admin/*.
      if (redirect?.startsWith('/admin') && !isStaff) target = '/espace-perso'
      if (redirect?.startsWith('/gouverneur') && !isGovernor) target = '/espace-perso'
      if (redirect?.startsWith('/leader') && !isLeader && !isGovernor) target = '/espace-perso'

      navigate(target, { replace: true })
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Identifiants incorrects.'
      toast.error(msg)
    },
  })
}

/** Mutation register. */
export function useRegister() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      toast.success('Inscription réussie ! Vérifiez votre email.', { duration: 6000 })
      navigate('/connexion', { replace: true })
    },
    onError: (err) => {
      const errs = err?.response?.data?.errors
      if (errs) {
        // Affiche la première erreur de validation.
        const firstMsg = Object.values(errs).flat()[0]
        toast.error(firstMsg || 'Inscription impossible.')
      } else {
        toast.error(err?.response?.data?.message || 'Inscription impossible.')
      }
    },
  })
}

/** Mutation logout. */
export function useLogout() {
  const navigate = useNavigate()
  const clear = useAuthStore((s) => s.clear)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clear()
      queryClient.removeQueries({ queryKey: ['me'] })
      // Important : purger l'URL d'origine mémorisée pour éviter qu'un user
      // suivant atterrisse sur une page sans accès au prochain login.
      sessionStorage.removeItem('nwc_redirect_after_login')
      navigate('/connexion', { replace: true })
      toast.success('Déconnecté. À bientôt !')
    },
  })
}

/** Demande de mot de passe oublié. */
export function useForgotPassword() {
  return useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: (data) => {
      toast.success(data?.message || 'Email de réinitialisation envoyé.', { duration: 6000 })
    },
    onError: () => {
      // Volontairement neutre : on ne révèle jamais si l'email existe ou non.
      toast.success('Si un compte est associé à cet email, un lien a été envoyé.', { duration: 6000 })
    },
  })
}

/** Réinitialisation effective du mot de passe. */
export function useResetPassword() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      toast.success('Mot de passe réinitialisé. Connectez-vous.')
      navigate('/connexion')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Lien invalide ou expiré.')
    },
  })
}
