/**
 * Paramètres du site — Refonte 2026 (admin-v2 native).
 *
 *  - Navigation par sections (sticky pill nav en haut sur mobile/desktop)
 *  - Save bar sticky en bas quand draft modifié
 *  - Upload logos/hero avec preview light
 *  - Tous les inputs en adm-input, tous les boutons en adm-btn-*
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ImagePlus, Save, Building2, Phone, Palette, Globe, Wallet, Tv, Settings as SettingsIcon,
  Check, X,
} from 'lucide-react'
import { settings } from '@/api/admin'

const GROUPS = {
  identity: { icon: Building2,    label: 'Identité' },
  contact:  { icon: Phone,        label: 'Coordonnées' },
  branding: { icon: Palette,      label: 'Logos & Hero' },
  donation: { icon: Wallet,       label: 'Mobile Money' },
  social:   { icon: Globe,        label: 'Réseaux sociaux' },
  live:     { icon: Tv,           label: 'Live streaming' },
  misc:     { icon: SettingsIcon, label: 'Divers' },
}
const ORDERED = ['identity', 'contact', 'branding', 'donation', 'social', 'live', 'misc']

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: settings.list,
  })

  const [draft, setDraft] = useState({})
  const [activeGroup, setActiveGroup] = useState(null)
  const dirty = Object.keys(draft).length > 0

  useEffect(() => { setDraft({}) }, [data])

  const save = useMutation({
    mutationFn: settings.update,
    onSuccess: () => {
      toast.success('Paramètres enregistrés.')
      setDraft({})
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
    },
    onError: () => toast.error('Erreur de sauvegarde.'),
  })

  const uploadLogo = useMutation({
    mutationFn: ({ file, target }) => settings.uploadLogo(file, target),
    onSuccess: () => {
      toast.success('Image mise à jour.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
    },
    onError: () => toast.error('Erreur upload.'),
  })

  const availableGroups = useMemo(
    () => ORDERED.filter((g) => data?.[g]?.length),
    [data]
  )

  // Auto-sélection du 1er groupe au chargement.
  useEffect(() => {
    if (!activeGroup && availableGroups.length > 0) {
      setActiveGroup(availableGroups[0])
    }
  }, [availableGroups, activeGroup])

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded animate-pulse" style={{ background: '#F4F4F5' }} />
        <div className="adm-card h-96 animate-pulse" />
      </div>
    )
  }

  const change = (k, v) => setDraft((d) => ({ ...d, [k]: v }))

  return (
    <div className="space-y-5 sm:space-y-6 pb-24">
      <header>
        <h1>Paramètres</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
          Configuration du site · logos, comptes Mobile Money, réseaux sociaux, identité.
        </p>
      </header>

      {/* Pill nav sections (sticky) */}
      <nav
        className="sticky top-14 z-10 -mx-4 sm:mx-0 px-4 sm:px-0 py-2 overflow-x-auto"
        style={{ background: 'var(--adm-bg)', borderBottom: '1px solid var(--adm-border)' }}
      >
        <div className="flex gap-1 min-w-min">
          {availableGroups.map((g) => {
            const meta = GROUPS[g]
            const Icon = meta.icon
            const isActive = activeGroup === g
            return (
              <button
                key={g}
                onClick={() => {
                  setActiveGroup(g)
                  document.getElementById(`group-${g}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="adm-btn adm-btn-ghost shrink-0 text-sm"
                style={
                  isActive
                    ? { background: 'var(--adm-card-hover)', color: 'var(--adm-text)' }
                    : undefined
                }
              >
                <Icon size={14} /> {meta.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Sections */}
      <div className="space-y-5">
        {availableGroups.map((group) => {
          const meta = GROUPS[group]
          const Icon = meta.icon
          return (
            <section key={group} id={`group-${group}`} className="adm-card p-4 sm:p-6 scroll-mt-32">
              <h2 className="flex items-center gap-2 mb-4">
                <Icon size={16} style={{ color: 'var(--adm-text-muted)' }} />
                <span>{meta.label}</span>
              </h2>

              {group === 'branding' ? (
                <BrandingPanel
                  data={data[group]}
                  onUpload={(file, target) => uploadLogo.mutate({ file, target })}
                  uploading={uploadLogo.isPending}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {data[group].map((row) => {
                    const value = draft[row.key] !== undefined ? draft[row.key] : (row.value ?? '')
                    const isDirty = draft[row.key] !== undefined && draft[row.key] !== (row.value ?? '')
                    return (
                      <SettingField
                        key={row.key}
                        label={prettyKey(row.key)}
                        value={value}
                        placeholder={row.value ? '' : '—'}
                        onChange={(v) => change(row.key, v)}
                        dirty={isDirty}
                      />
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {/* Save bar sticky en bas */}
      {dirty && (
        <div
          className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-8 lg:bottom-6 z-30 max-w-md mx-auto lg:mx-0"
          role="status"
        >
          <div
            className="adm-card p-3 flex items-center gap-3 shadow-lg"
            style={{ borderColor: 'var(--adm-accent)', borderWidth: 1 }}
          >
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--adm-accent-soft)', color: 'var(--adm-accent)' }}
            >
              <Save size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>
                {Object.keys(draft).length} modification{Object.keys(draft).length > 1 ? 's' : ''} en attente
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--adm-text-muted)' }}>
                Cliquez pour sauvegarder
              </div>
            </div>
            <button
              onClick={() => setDraft({})}
              className="adm-btn adm-btn-ghost"
              disabled={save.isPending}
            >
              <X size={14} />
            </button>
            <button
              onClick={() => save.mutate(draft)}
              className="adm-btn adm-btn-primary"
              disabled={save.isPending}
            >
              {save.isPending ? '…' : <><Save size={14} /> Enregistrer</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Champ paramètre standard (input texte) avec indicateur "modifié". */
function SettingField({ label, value, placeholder, onChange, dirty }) {
  return (
    <div>
      <label
        className="flex items-center justify-between text-sm mb-1.5"
        style={{ color: 'var(--adm-text)' }}
      >
        <span>{label}</span>
        {dirty && (
          <span
            className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded"
            style={{ background: 'var(--adm-accent-soft)', color: 'var(--adm-accent)' }}
          >
            Modifié
          </span>
        )}
      </label>
      <input
        type="text"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="adm-input"
      />
    </div>
  )
}

function prettyKey(key) {
  const part = key.split('.').pop().replace(/_/g, ' ')
  return part.charAt(0).toUpperCase() + part.slice(1)
}

function BrandingPanel({ data, onUpload, uploading }) {
  const nwcLogo    = data.find((r) => r.key === 'logo.nwc')?.value
  const parentLogo = data.find((r) => r.key === 'logo.parent')?.value
  const heroImage  = data.find((r) => r.key === 'branding.hero_image')?.value
  const heroVideo  = data.find((r) => r.key === 'branding.hero_video')?.value

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <LogoUploader
          label="Logo New Wine Church"
          currentUrl={nwcLogo}
          target="logo.nwc"
          onUpload={onUpload}
          uploading={uploading}
        />
        <LogoUploader
          label="Logo Maison de la Destinée"
          currentUrl={parentLogo}
          target="logo.parent"
          onUpload={onUpload}
          uploading={uploading}
        />
      </div>
      <HeroImageUploader
        currentUrl={heroImage}
        onUpload={onUpload}
        uploading={uploading}
      />
      <HeroVideoUploader
        currentUrl={heroVideo}
        hasImage={!!heroImage}
        onUpload={onUpload}
        uploading={uploading}
      />
    </div>
  )
}

function HeroVideoUploader({ currentUrl, hasImage, onUpload, uploading }) {
  return (
    <div className="adm-card p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <span
          className="text-[11px] uppercase tracking-wider font-medium"
          style={{ color: 'var(--adm-text-faint)' }}
        >
          Vidéo de fond hero (optionnel) — prioritaire sur l'image
        </span>
        {currentUrl && (
          <span className="adm-badge adm-badge-success">
            <Check size={10} /> Active
          </span>
        )}
      </div>
      <div
        className="aspect-video rounded-lg flex items-center justify-center overflow-hidden border"
        style={{ background: '#0A0908', borderColor: 'var(--adm-border)' }}
      >
        {currentUrl ? (
          <video src={currentUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
        ) : (
          <div className="text-center px-4 text-white/60">
            <ImagePlus size={36} className="mx-auto mb-2" />
            <span className="text-sm">
              {hasImage ? 'Pas de vidéo — l\'image hero est utilisée' : 'Pas de vidéo ni d\'image — fond crème par défaut'}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
        <p className="text-xs" style={{ color: 'var(--adm-text-muted)' }}>
          MP4 / WebM · paysage 16:9 · <strong>loop court 10-20s recommandé</strong> · Max 30 Mo · muet (autoplay)
        </p>
        <label className="adm-btn adm-btn-secondary cursor-pointer">
          <ImagePlus size={14} />
          {uploading ? 'Upload…' : currentUrl ? 'Remplacer' : 'Ajouter'}
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onUpload(file, 'branding.hero_video')
            }}
          />
        </label>
      </div>
      <p className="text-xs mt-2" style={{ color: 'var(--adm-text-muted)' }}>
        💡 Vidéo cinématique courte qui boucle (foule en culte, drone, etc.).
        Sera lue en autoplay muet sur la home → garde-la légère pour les mobiles.
      </p>
    </div>
  )
}

function HeroImageUploader({ currentUrl, onUpload, uploading }) {
  return (
    <div className="adm-card p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <span
          className="text-[11px] uppercase tracking-wider font-medium"
          style={{ color: 'var(--adm-text-faint)' }}
        >
          Image hero accueil (optionnel)
        </span>
        {currentUrl && (
          <span className="adm-badge adm-badge-success">
            <Check size={10} /> Active
          </span>
        )}
      </div>
      <div
        className="aspect-video rounded-lg flex items-center justify-center overflow-hidden border"
        style={{ background: '#F4F4F5', borderColor: 'var(--adm-border)' }}
      >
        {currentUrl ? (
          <img src={currentUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="text-center px-4" style={{ color: 'var(--adm-text-faint)' }}>
            <ImagePlus size={36} className="mx-auto mb-2" />
            <span className="text-sm">Pas d'image — la home utilise le fond crème par défaut</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
        <p className="text-xs" style={{ color: 'var(--adm-text-muted)' }}>
          Photo paysage <strong>16:9 HD</strong> · 1920×1080 min · JPG/PNG/WebP · Max 8 Mo
        </p>
        <label className="adm-btn adm-btn-secondary cursor-pointer">
          <ImagePlus size={14} />
          {uploading ? 'Upload…' : currentUrl ? 'Remplacer' : 'Ajouter'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onUpload(file, 'branding.hero_image')
            }}
          />
        </label>
      </div>
      <p className="text-xs mt-2" style={{ color: 'var(--adm-text-muted)' }}>
        💡 Conseil : photo de culte (foule + lumière scénique), bien exposée,{' '}
        <strong>côté droit relativement uniforme</strong> (le headline « SAUVÉ. POUR SAUVER. » se pose à gauche).
      </p>
    </div>
  )
}

function LogoUploader({ label, currentUrl, target, onUpload, uploading }) {
  return (
    <div className="adm-card p-4">
      <p
        className="text-[11px] uppercase tracking-wider font-medium mb-3"
        style={{ color: 'var(--adm-text-faint)' }}
      >
        {label}
      </p>
      <div className="flex items-center gap-4">
        <div
          className="h-24 w-24 rounded-lg flex items-center justify-center overflow-hidden border shrink-0"
          style={{ background: '#F4F4F5', borderColor: 'var(--adm-border)' }}
        >
          {currentUrl ? (
            <img src={currentUrl} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
          ) : (
            <ImagePlus size={28} style={{ color: 'var(--adm-text-faint)' }} />
          )}
        </div>
        <label className="adm-btn adm-btn-secondary cursor-pointer">
          <ImagePlus size={14} />
          {uploading ? 'Upload…' : 'Changer'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onUpload(file, target)
            }}
          />
        </label>
      </div>
      <p className="text-xs mt-2" style={{ color: 'var(--adm-text-muted)' }}>
        PNG, JPG, WebP ou SVG. Max 2 Mo.
      </p>
    </div>
  )
}
