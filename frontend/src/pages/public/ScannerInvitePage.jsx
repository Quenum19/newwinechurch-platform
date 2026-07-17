/**
 * ScannerInvitePage — landing publique du magic-link scanner invité (Étape C).
 *
 * URL: /scanner-invite/{token}
 *
 * Flow :
 *  1. GET /scanner-invite/{token} → vérifie validité
 *  2. Affiche welcome + infos event
 *  3. Bouton "Rejoindre la mission" → POST /scanner-invite/{token}/redeem
 *  4. Récupère Sanctum token → auth + redirect /scan?event={id}
 *
 * Page volontairement épurée : l'invité n'est pas un membre, on ne l'expose
 * pas à la nav globale. Ambiance sobre wine + ivoire.
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ScanLine, Calendar, MapPin, Clock, AlertCircle, CheckCircle2,
  Loader2, ArrowRight, ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { publicScannerInvite } from '@/api/public'
import { useAuthStore } from '@/store/authStore'

export default function ScannerInvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  const { data, isLoading, error } = useQuery({
    queryKey: ['scanner-invite', token],
    queryFn: () => publicScannerInvite.verify(token),
    retry: false,
  })

  const redeemMutation = useMutation({
    mutationFn: () => publicScannerInvite.redeem(token),
    onSuccess: (res) => {
      // Enregistre le Sanctum token pour axios + le user dans le store auth.
      localStorage.setItem('nwc_token', res.token)
      setUser({
        ...res.user,
        must_change_password: false,
      })
      toast.success(`Bienvenue ${res.user.first_name}. Prêt à scanner.`)
      navigate(`/scan?event=${res.event.id}`, { replace: true })
    },
    onError: (e) => {
      toast.error(e?.response?.data?.message || 'Impossible d\'activer l\'accès.')
    },
  })

  // Loader initial (fetch).
  if (isLoading) {
    return (
      <Shell>
        <div className="text-center">
          <Loader2 size={40} className="mx-auto animate-spin text-[#8B1A2F]"/>
          <p className="mt-4 text-[#6B5F4E] text-sm">Vérification du lien…</p>
        </div>
      </Shell>
    )
  }

  // Erreur : lien invalide / expiré / révoqué.
  const errData = error?.response?.data
  const invalid = errData || (data && data.valid === false)
  if (invalid) {
    const reasonMap = {
      not_found: { title: 'Lien inconnu', tone: 'red' },
      expired:   { title: 'Lien expiré', tone: 'gray' },
      revoked:   { title: 'Accès révoqué', tone: 'red' },
      suspended: { title: 'Accès suspendu', tone: 'amber' },
    }
    const info = reasonMap[errData?.reason || data?.reason] || { title: 'Lien invalide', tone: 'red' }
    return (
      <Shell>
        <div className="text-center max-w-md">
          <div className={`inline-flex w-14 h-14 rounded-full items-center justify-center mb-4 ${
            info.tone === 'red' ? 'bg-red-50 text-red-600' :
            info.tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
          }`}>
            <AlertCircle size={28}/>
          </div>
          <h1 className="font-display text-3xl text-[#1F1A14] uppercase tracking-tight">{info.title}</h1>
          <p className="mt-3 text-sm text-[#6B5F4E]">
            {errData?.message || data?.message || 'Ce lien n\'est plus utilisable.'}
          </p>
          <p className="mt-6 text-[12px] text-[#6B5F4E]/70">
            Contacte l'organisateur de l'événement pour obtenir un nouveau lien.
          </p>
        </div>
      </Shell>
    )
  }

  // Landing : lien valide.
  const eventDate = data?.event?.starts_at ? new Date(data.event.starts_at) : null

  return (
    <Shell>
      <div className="max-w-lg w-full">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-full bg-[#8B1A2F]/10 text-[#8B1A2F] items-center justify-center mb-4">
            <ScanLine size={28}/>
          </div>
          <p className="text-[11px] uppercase tracking-widest font-mono text-[#8B1A2F] mb-2">
            Accès Scanner NWC
          </p>
          <h1 className="font-display text-4xl sm:text-5xl text-[#1F1A14] uppercase leading-none">
            Bienvenue<br/>
            <span className="text-[#8B1A2F]">{data.display_name}</span>
          </h1>
          <p className="mt-4 text-sm text-[#6B5F4E]">
            Tu es invité(e) à scanner les tickets à l'entrée de :
          </p>
        </div>

        {/* Carte event */}
        <div className="bg-white border-2 border-[#E8DFC9] rounded p-5 sm:p-6 space-y-3">
          <h2 className="font-display text-xl sm:text-2xl uppercase tracking-tight text-[#1F1A14]">
            {data.event.display_title || data.event.title}
          </h2>
          {eventDate && (
            <p className="flex items-center gap-2 text-sm text-[#6B5F4E]">
              <Calendar size={14} className="text-[#8B1A2F]"/>
              <span className="capitalize">
                {format(eventDate, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
              </span>
            </p>
          )}
          {(data.event.display_location || data.event.location) && (
            <p className="flex items-center gap-2 text-sm text-[#6B5F4E]">
              <MapPin size={14} className="text-[#8B1A2F]"/>
              {data.event.display_location || data.event.location}
            </p>
          )}
          <p className="flex items-center gap-2 text-[12px] text-[#6B5F4E]">
            <Clock size={12}/>
            Ton accès expire le {format(new Date(data.expires_at), "d MMM yyyy 'à' HH'h'mm", { locale: fr })}
          </p>
        </div>

        {/* Consignes rapides */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded p-4 text-[13px] text-amber-900">
          <p className="font-medium mb-2 flex items-center gap-1.5">
            <ShieldCheck size={14}/> Consignes importantes
          </p>
          <ul className="space-y-1 text-amber-800/90 list-disc pl-4">
            <li>Ton accès ne fonctionne QUE pour cet événement.</li>
            <li>Reste concentré(e) sur les scans, aucune autre fonction admin.</li>
            <li>Ne partage pas ce lien — il t'est personnel.</li>
          </ul>
        </div>

        {/* Bouton principal — activer accès */}
        <button
          onClick={() => redeemMutation.mutate()}
          disabled={redeemMutation.isPending}
          className="mt-8 w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-[#8B1A2F] text-white text-sm uppercase tracking-widest font-mono font-medium hover:bg-[#6F1425] transition disabled:opacity-70"
        >
          {redeemMutation.isPending ? (
            <><Loader2 size={16} className="animate-spin"/> Activation…</>
          ) : (
            <>Rejoindre la mission <ArrowRight size={16}/></>
          )}
        </button>

        <p className="mt-4 text-center text-[11px] text-[#6B5F4E]/70">
          En cliquant, tu acceptes de scanner de bonne foi les tickets de l'événement.
        </p>
      </div>
    </Shell>
  )
}

// Coquille visuelle sobre — ivoire chaud + focus centré, aucun header/nav.
function Shell({ children }) {
  return (
    <main className="min-h-screen bg-[#FAF6EE] flex items-center justify-center px-4 py-10 sm:py-16">
      <div className="w-full flex justify-center">
        {children}
      </div>
    </main>
  )
}
