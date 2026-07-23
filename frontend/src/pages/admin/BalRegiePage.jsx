/**
 * ==============================================================
 *  BalRegiePage — Panneau de régie pour contrôler l'écran live du Bal.
 *
 *  Optimisé mobile/tablette : boutons gros et clairs. L'opérateur clique
 *  pour envoyer une slide sur l'écran. Contrôle aussi le vote Roi & Reine.
 * ==============================================================
 */
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '@/api/axios'
import {
  Monitor, Image as ImageIcon, MoonStar, UserPlus, PartyPopper,
  MessageCircle, Sparkles, Music, Mic2, Crown,
  Vote, PlayCircle, Users, ChevronRight, RefreshCw, ExternalLink,
  Camera,
} from 'lucide-react'

// 14 slides V2 (refonte Claude Design 2026-07-23) — Installation, BonAppetit, Fin retirées
const SLIDES = [
  { key: 'default',        label: 'Affiche',            icon: ImageIcon,     section: 'ambiance' },
  { key: 'noir',           label: 'Écran noir',         icon: MoonStar,      section: 'ambiance' },

  { key: 'arrivee',        label: 'Arrivée LIVE',       icon: UserPlus,      section: 'preshow' },
  { key: 'mur-stars',      label: 'Mur des stars',      icon: Sparkles,      section: 'preshow' },
  { key: 'photos-ambiance',label: 'Photos ambiance',    icon: Camera,        section: 'preshow' },

  { key: 'dancing-stars',  label: 'Dancing Stars',      icon: Music,         section: 'moments' },
  { key: 'bienvenue',      label: 'Bienvenue',          icon: MessageCircle, section: 'moments' },
  { key: 'defile',         label: 'Défilé',             icon: Sparkles,      section: 'moments' },
  { key: 'rappeurs',       label: 'Rappeurs',           icon: Mic2,          section: 'moments' },
  { key: 'kim-b-photos',   label: 'Photos KIM B',       icon: Camera,        section: 'moments' },
  { key: 'dj',             label: 'DJ',                 icon: Music,         section: 'moments' },

  { key: 'ouverture-bal',  label: 'Ouverture du Bal',   icon: PartyPopper,   section: 'moments' },
]

const ARTISTES = ['Clinton', 'KIM B']

export default function BalRegiePage() {
  const { eventId } = useParams()
  const qc = useQueryClient()

  const [customArtiste, setCustomArtiste] = useState('')

  // Query état actuel
  const { data: stateData, refetch } = useQuery({
    queryKey: ['bal', 'state', eventId],
    queryFn: () => api.get(`/admin/events/${eventId}/bal/state`).then((r) => r.data),
    refetchInterval: 3000,
  })

  const state = stateData?.state ?? {}
  const currentSlide = state.current_slide ?? 'default'
  const voteStatus = state.vote_status ?? 'closed'

  // Results (pour compteur votes)
  const { data: resultsData } = useQuery({
    queryKey: ['bal', 'results', eventId],
    queryFn: () => api.get(`/admin/events/${eventId}/bal/results`).then((r) => r.data),
    refetchInterval: 5000,
    enabled: voteStatus !== 'closed',
  })

  const setSlideMutation = useMutation({
    mutationFn: ({ slide, config }) =>
      api.post(`/admin/events/${eventId}/bal/slide`, { slide, config: config ?? null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bal', 'state', eventId] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Erreur envoi slide.'),
  })

  const voteOpen = useMutation({
    mutationFn: () => api.post(`/admin/events/${eventId}/bal/vote/open`),
    onSuccess: () => {
      toast.success('Vote ouvert ✓')
      qc.invalidateQueries({ queryKey: ['bal', 'state', eventId] })
    },
  })
  const voteClose = useMutation({
    mutationFn: () => api.post(`/admin/events/${eventId}/bal/vote/close`),
    onSuccess: () => {
      toast.success('Vote fermé ✓')
      qc.invalidateQueries({ queryKey: ['bal', 'state', eventId] })
    },
  })
  const proclamerMutation = useMutation({
    mutationFn: () => api.post(`/admin/events/${eventId}/bal/proclamer`),
    onSuccess: () => {
      toast.success('👑 Proclamation lancée sur l\'écran')
      qc.invalidateQueries({ queryKey: ['bal', 'state', eventId] })
    },
  })

  const send = (slide, config) => setSlideMutation.mutate({ slide, config })

  const sendRappeur = (artiste) => {
    send('rappeurs', { artiste })
    toast.success(`Slide "${artiste}" envoyée`)
  }

  const grouped = {
    ambiance:  SLIDES.filter((s) => s.section === 'ambiance'),
    preshow:   SLIDES.filter((s) => s.section === 'preshow'),
    moments:   SLIDES.filter((s) => s.section === 'moments'),
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--adm-accent)] mb-1">
            <Monitor size={12} className="inline mr-1"/>
            Régie Bal 2026
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--adm-text)' }}>
            Contrôle écran live
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Clique une slide pour l'envoyer sur l'écran de la salle.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/live/bal/${eventId}`}
            target="_blank"
            rel="noopener"
            className="adm-btn adm-btn-ghost inline-flex items-center gap-1.5"
          >
            <ExternalLink size={14}/> Ouvrir l'écran
          </a>
          <button onClick={() => refetch()} className="adm-btn adm-btn-ghost">
            <RefreshCw size={14}/>
          </button>
        </div>
      </header>

      {/* Slide active */}
      <section className="adm-card p-4 flex items-center gap-3">
        <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse shrink-0"/>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Slide actuellement à l'écran</p>
          <p className="text-lg font-bold" style={{ color: 'var(--adm-accent)' }}>
            {SLIDES.find((s) => s.key === currentSlide)?.label ?? currentSlide}
          </p>
        </div>
      </section>

      {/* SECTION AMBIANCE */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
          Ambiance
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {grouped.ambiance.map((s) => (
            <SlideButton key={s.key} slide={s} active={currentSlide === s.key} onClick={() => send(s.key)}/>
          ))}
        </div>
      </section>

      {/* SECTION PRE-SHOW */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
          Arrivée & pré-show
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {grouped.preshow.map((s) => (
            <SlideButton key={s.key} slide={s} active={currentSlide === s.key} onClick={() => send(s.key)}/>
          ))}
        </div>
      </section>

      {/* SECTION MOMENTS */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
          Grands moments
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {grouped.moments.map((s) => (
            <SlideButton key={s.key} slide={s} active={currentSlide === s.key} onClick={() => send(s.key)}/>
          ))}
        </div>

        {/* Sous-panneau annonce rappeur (nom seul, sans photo) */}
        <div className="mt-3 p-3 rounded border" style={{ borderColor: 'var(--adm-border)' }}>
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
            Annonce rappeur — nom sur scène (slide « Rappeurs ») :
          </p>
          <div className="flex flex-wrap gap-2">
            {ARTISTES.map((a) => (
              <button
                key={a}
                onClick={() => sendRappeur(a)}
                className="px-3 py-1.5 rounded text-sm font-semibold border-2 border-zinc-300 hover:border-[color:var(--adm-accent)] hover:text-[color:var(--adm-accent)] transition"
              >
                {a}
              </button>
            ))}
            <input
              type="text"
              placeholder="Nom personnalisé…"
              value={customArtiste}
              onChange={(e) => setCustomArtiste(e.target.value)}
              className="adm-input text-sm px-2 py-1.5"
            />
            <button
              onClick={() => customArtiste.trim() && sendRappeur(customArtiste.trim())}
              disabled={!customArtiste.trim()}
              className="px-3 py-1.5 rounded text-sm font-semibold bg-[color:var(--adm-accent)] text-white disabled:opacity-40"
            >
              Envoyer
            </button>
          </div>
        </div>
      </section>

      {/* SECTION VOTE ROI/REINE */}
      <section className="adm-card p-4 border-l-4" style={{ borderLeftColor: '#C9A961' }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-bold inline-flex items-center gap-2">
              <Crown size={18} className="text-[color:var(--adm-accent)]"/>
              Vote Roi & Reine
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              État : <VoteBadge status={voteStatus}/>
              {resultsData && <> · <strong>{resultsData.total_votes}</strong> vote{resultsData.total_votes > 1 ? 's' : ''} reçu{resultsData.total_votes > 1 ? 's' : ''}</>}
            </p>
          </div>
          <Link
            to={`/admin/bal/${eventId}/candidats`}
            className="text-xs font-mono uppercase tracking-wider text-[color:var(--adm-accent)] hover:underline inline-flex items-center gap-1"
          >
            Gérer candidats <ChevronRight size={12}/>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <button
            onClick={() => { send('vote'); voteOpen.mutate() }}
            disabled={voteOpen.isPending}
            className="adm-btn adm-btn-primary"
          >
            <Vote size={14}/> Ouvrir & afficher
          </button>
          <button
            onClick={() => voteClose.mutate()}
            disabled={voteClose.isPending || voteStatus === 'closed'}
            className="adm-btn adm-btn-ghost"
          >
            Fermer le vote
          </button>
          <button
            onClick={() => proclamerMutation.mutate()}
            disabled={proclamerMutation.isPending}
            className="adm-btn adm-btn-primary col-span-2"
            style={{ background: 'linear-gradient(135deg, #C9A961 0%, #8B1A2F 100%)' }}
          >
            <Crown size={14}/> Proclamer résultats
          </button>
        </div>

        {resultsData && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RankingList title="Roi" list={resultsData.roi}/>
            <RankingList title="Reine" list={resultsData.reine}/>
          </div>
        )}
      </section>

      {/* Liens utiles */}
      <section className="flex flex-wrap gap-2 text-sm">
        <Link to={`/admin/bal/${eventId}/candidats`} className="adm-btn adm-btn-ghost">
          <Users size={13}/> Candidats
        </Link>
        <Link to={`/admin/bal/${eventId}/photos`} className="adm-btn adm-btn-ghost">
          <ImageIcon size={13}/> Photos ambiance
        </Link>
        <a
          href={`${import.meta.env.VITE_API_URL || '/api'}/admin/events/${eventId}/bal/table-supports`}
          target="_blank" rel="noopener"
          className="adm-btn adm-btn-ghost"
        >
          <PlayCircle size={13}/> PDF supports de table
        </a>
      </section>
    </div>
  )
}

// ─── Sub-components ───

function SlideButton({ slide, active, onClick }) {
  const Icon = slide.icon
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded border-2 transition text-left ${
        active
          ? 'bg-[color:var(--adm-accent)] text-white border-[color:var(--adm-accent)] shadow-lg'
          : 'bg-white text-zinc-800 border-zinc-200 hover:border-[color:var(--adm-accent)]/60'
      }`}
    >
      <Icon size={22} className="mb-2"/>
      <p className="text-sm font-semibold">{slide.label}</p>
      {active && <p className="text-[10px] font-mono uppercase tracking-widest mt-1 opacity-80">● à l'écran</p>}
    </button>
  )
}

function VoteBadge({ status }) {
  const map = {
    closed:       { label: '🔴 fermé',        cls: 'text-red-600 font-bold' },
    open:         { label: '🟢 ouvert',       cls: 'text-emerald-600 font-bold' },
    proclamation: { label: '👑 proclamation', cls: 'text-amber-600 font-bold' },
  }
  const m = map[status] ?? map.closed
  return <span className={m.cls}>{m.label}</span>
}

function RankingList({ title, list = [] }) {
  return (
    <div className="p-3 bg-zinc-50 rounded">
      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">{title}</p>
      {list.length === 0 ? (
        <p className="text-xs text-zinc-400 italic">Aucun candidat.</p>
      ) : (
        <ol className="space-y-1">
          {list.map((c, i) => (
            <li key={c.id} className="flex items-center justify-between text-sm">
              <span>
                <strong className="text-[color:var(--adm-accent)] tabular-nums mr-2">{i + 1}.</strong>
                {c.first_name} {c.last_name}
              </span>
              <span className="text-xs font-mono text-zinc-500">{c.votes} vote{c.votes > 1 ? 's' : ''}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
