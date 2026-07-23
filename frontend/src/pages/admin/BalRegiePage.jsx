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
  Vote, PlayCircle, Users, ChevronRight, Loader2, RefreshCw, ExternalLink,
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
  { key: 'rappeur-photos', label: 'Photos rappeur',     icon: Camera,        section: 'moments' },
  { key: 'dj',             label: 'DJ',                 icon: Music,         section: 'moments' },

  { key: 'ouverture-bal',  label: 'Ouverture du Bal',   icon: PartyPopper,   section: 'moments' },
]

const ARTISTES = ['Clinton', 'KIM B']

export default function BalRegiePage() {
  const { eventId } = useParams()
  const qc = useQueryClient()

  const [customArtiste, setCustomArtiste] = useState('')
  const [artistePhotos, setArtistePhotos] = useState([])            // [{ url, name }, ...]
  const [artistePhotosUploading, setArtistePhotosUploading] = useState(false)
  const [dancingMediaUrl, setDancingMediaUrl] = useState('')
  const [dancingMediaName, setDancingMediaName] = useState('')
  const [dancingMediaUploading, setDancingMediaUploading] = useState(false)

  // Upload commun (image ou vidéo) via /admin/events/{id}/bal/upload-media
  // Retourne l'URL publique absolue à passer ensuite en config de setSlide.
  const uploadBalMedia = async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post(
      `/admin/events/${eventId}/bal/upload-media`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return data.url
  }

  const explainUploadError = (err, file) => {
    const status = err?.response?.status
    const backendMsg = err?.response?.data?.message
    const validation = err?.response?.data?.errors
    const mb = file ? (file.size / (1024 * 1024)).toFixed(1) : '?'
    if (status === 413) {
      return `Fichier trop lourd (${mb} Mo) — la limite serveur est atteinte. Compresse la vidéo ou contacte Hostinger pour augmenter upload_max_filesize.`
    }
    if (status === 422) {
      const firstError = validation ? Object.values(validation)[0]?.[0] : null
      return firstError || backendMsg || `Fichier refusé (format ou taille non conforme, ${mb} Mo).`
    }
    if (backendMsg) return `${backendMsg} (${mb} Mo)`
    if (err?.message === 'Network Error') {
      return `Coupure réseau ou serveur ne répond pas (fichier ${mb} Mo).`
    }
    return `Échec upload (${mb} Mo, statut ${status ?? '?'}) — ouvre la console pour plus d'infos.`
  }

  const handleDancingFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDancingMediaUploading(true)
    setDancingMediaName(file.name)
    try {
      const url = await uploadBalMedia(file)
      setDancingMediaUrl(url)
      toast.success(`Média uploadé (${file.name})`)
    } catch (err) {
      console.error('Upload Dancing Stars failed', err)
      toast.error(explainUploadError(err, file), { duration: 6000 })
      setDancingMediaName('')
    } finally {
      setDancingMediaUploading(false)
      e.target.value = ''
    }
  }

  const handleArtistePhotosFiles = async (e) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setArtistePhotosUploading(true)
    let lastFile = null
    try {
      // Upload séquentiel (plus doux pour Hostinger que parallèle sur gros fichiers)
      const newOnes = []
      for (const file of files) {
        lastFile = file
        const url = await uploadBalMedia(file)
        newOnes.push({ url, name: file.name })
      }
      setArtistePhotos((prev) => [...prev, ...newOnes])
      toast.success(`${newOnes.length} photo(s) uploadée(s)`)
    } catch (err) {
      console.error('Upload photos rappeur failed', err)
      toast.error(explainUploadError(err, lastFile), { duration: 6000 })
    } finally {
      setArtistePhotosUploading(false)
      e.target.value = ''
    }
  }

  const removeArtistePhoto = (idx) => {
    setArtistePhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  const clearArtistePhotos = () => setArtistePhotos([])

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

  const sendRappeurPhotos = (artiste) => {
    if (artistePhotos.length === 0) {
      toast.error("Ajoute au moins une photo d'abord.")
      return
    }
    const cfg = {
      artiste,
      artiste_photos: artistePhotos.map((p) => p.url),
    }
    send('rappeur-photos', cfg)
    toast.success(`Diaporama "${artiste}" envoyé (${artistePhotos.length} photos)`)
  }

  const sendDancing = () => {
    const cfg = dancingMediaUrl ? { dancing_media: dancingMediaUrl } : null
    send('dancing-stars', cfg)
    toast.success(dancingMediaUrl ? 'Dancing Stars envoyée (avec média)' : 'Dancing Stars envoyée')
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
          {grouped.moments.map((s) => {
            // Cas spéciaux : passer la config déjà uploadée si dispo
            let onClick = () => send(s.key)
            if (s.key === 'rappeur-photos') {
              onClick = () => {
                if (artistePhotos.length === 0) {
                  toast.error("Ajoute d'abord des photos dans le panneau plus bas.")
                  return
                }
                send('rappeur-photos', {
                  artiste: customArtiste.trim() || 'KIM B',
                  artiste_photos: artistePhotos.map((p) => p.url),
                })
              }
            } else if (s.key === 'dancing-stars' && dancingMediaUrl) {
              onClick = () => send('dancing-stars', { dancing_media: dancingMediaUrl })
            }
            return <SlideButton key={s.key} slide={s} active={currentSlide === s.key} onClick={onClick}/>
          })}
        </div>

        {/* Sous-panneau Dancing Stars — upload photo / vidéo derrière le rideau */}
        <div className="mt-3 p-3 rounded border" style={{ borderColor: 'var(--adm-border)' }}>
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
            Dancing Stars — média derrière le rideau (photo ou vidéo) :
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="px-3 py-1.5 rounded text-sm font-semibold border-2 border-zinc-300 hover:border-[color:var(--adm-accent)] cursor-pointer">
              {dancingMediaUploading ? (
                <><Loader2 size={13} className="inline mr-1 animate-spin"/>Upload…</>
              ) : (
                'Choisir un fichier'
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                onChange={handleDancingFile}
                disabled={dancingMediaUploading}
                className="hidden"
              />
            </label>
            {dancingMediaName && (
              <span className="text-xs text-zinc-500 italic truncate max-w-[240px]">
                {dancingMediaUrl ? '✓ ' : ''}{dancingMediaName}
              </span>
            )}
            <button
              onClick={sendDancing}
              disabled={dancingMediaUploading}
              className="ml-auto px-3 py-1.5 rounded text-sm font-semibold bg-[color:var(--adm-accent)] text-white disabled:opacity-40"
            >
              Envoyer Dancing Stars
            </button>
          </div>
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
              Envoyer annonce
            </button>
          </div>
        </div>

        {/* Sous-panneau Photos rappeur (diaporama plein écran) */}
        <div className="mt-3 p-3 rounded border" style={{ borderColor: 'var(--adm-border)' }}>
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
            Photos rappeur — diaporama plein écran (slide « Photos rappeur ») :
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <label className="px-3 py-1.5 rounded text-sm font-semibold border-2 border-zinc-300 hover:border-[color:var(--adm-accent)] cursor-pointer">
              {artistePhotosUploading ? (
                <><Loader2 size={13} className="inline mr-1 animate-spin"/>Upload…</>
              ) : (
                'Ajouter photo(s)'
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handleArtistePhotosFiles}
                disabled={artistePhotosUploading}
                className="hidden"
              />
            </label>
            {artistePhotos.length > 0 && (
              <>
                <span className="text-xs text-zinc-500 italic">
                  {artistePhotos.length} photo{artistePhotos.length > 1 ? 's' : ''} prête{artistePhotos.length > 1 ? 's' : ''}
                </span>
                <button
                  onClick={clearArtistePhotos}
                  className="text-xs text-red-600 hover:underline"
                >
                  vider
                </button>
              </>
            )}
          </div>

          {artistePhotos.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {artistePhotos.map((p, i) => (
                <div key={i} className="relative">
                  <img
                    src={p.url}
                    alt=""
                    className="h-14 w-14 object-cover rounded border border-zinc-300"
                  />
                  <button
                    onClick={() => removeArtistePhoto(i)}
                    className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full h-4 w-4 text-[10px] leading-none"
                    title="Retirer"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {ARTISTES.map((a) => (
              <button
                key={a}
                onClick={() => sendRappeurPhotos(a)}
                disabled={artistePhotos.length === 0}
                className="px-3 py-1.5 rounded text-sm font-semibold border-2 border-zinc-300 hover:border-[color:var(--adm-accent)] hover:text-[color:var(--adm-accent)] disabled:opacity-40 transition"
              >
                Envoyer photos {a}
              </button>
            ))}
            <button
              onClick={() => customArtiste.trim() && sendRappeurPhotos(customArtiste.trim())}
              disabled={!customArtiste.trim() || artistePhotos.length === 0}
              className="px-3 py-1.5 rounded text-sm font-semibold bg-[color:var(--adm-accent)] text-white disabled:opacity-40"
            >
              Envoyer photos (nom perso)
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
