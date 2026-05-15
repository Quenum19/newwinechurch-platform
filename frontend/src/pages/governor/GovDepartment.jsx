/**
 * GovDepartment — département + édition du profil gouverneur.
 * 2 onglets : "Mon département" (lecture) et "Mon profil" (édition).
 */
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Building2, UserCog, Upload, Save } from 'lucide-react'
import {
  useGovernorDepartment,
  useGovernorProfile,
  useUpdateGovernorProfile,
} from '@/api/governor'
import Button from '@/components/ui/Button'
import GovernorProfileCard from '@/components/shared/GovernorProfileCard'
import { SkeletonCard } from '@/components/shared/Skeleton'
import { cn } from '@/utils/cn'

const profileSchema = z.object({
  bio:              z.string().max(1000).optional().nullable(),
  vision_statement: z.string().max(500).optional().nullable(),
  phone_direct:     z.string().max(30).optional().nullable(),
  years_in_role:    z.coerce.number().int().min(0).max(50).optional().nullable(),
})

export default function GovDepartment() {
  const [tab, setTab] = useState('dept')
  const { data: dept, isLoading: loadingDept } = useGovernorDepartment()
  const { data: profile, isLoading: loadingProfile } = useGovernorProfile()
  const update = useUpdateGovernorProfile()

  const [form, setForm] = useState({
    bio: '', vision_statement: '', phone_direct: '', years_in_role: 0,
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (profile) {
      setForm({
        bio: profile.bio ?? '',
        vision_statement: profile.vision_statement ?? '',
        phone_direct: profile.phone_direct ?? '',
        years_in_role: profile.years_in_role ?? 0,
      })
    }
  }, [profile])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const parsed = profileSchema.safeParse(form)
    if (!parsed.success) {
      const errs = {}
      parsed.error.issues.forEach((i) => { errs[i.path[0]] = i.message })
      setErrors(errs)
      return
    }
    setErrors({})

    let payload = parsed.data
    if (photoFile || bannerFile) {
      const fd = new FormData()
      Object.entries(parsed.data).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') fd.append(k, v)
      })
      if (photoFile) fd.append('photo_profile', photoFile)
      if (bannerFile) fd.append('banner_image', bannerFile)
      payload = fd
    }

    try {
      await update.mutateAsync(payload)
      toast.success('Profil mis à jour. Les images sont traitées en arrière-plan.')
      setPhotoFile(null); setBannerFile(null)
      setPhotoPreview(null); setBannerPreview(null)
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Erreur lors de la mise à jour.')
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Mon département</h1>
        <p className="text-sm text-white/50 mt-1">Informations & profil gouverneur</p>
      </header>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-white/5">
        {[
          { key: 'dept',    icon: Building2, label: 'Département' },
          { key: 'profile', icon: UserCog,   label: 'Mon profil gouverneur' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition',
              tab === t.key
                ? 'border-gold-500 text-gold-300'
                : 'border-transparent text-white/60 hover:text-white'
            )}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dept' && (
        loadingDept ? <SkeletonCard /> : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 rounded-2xl bg-ink-900 border border-white/5 p-6 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="h-10 w-10 rounded-lg"
                    style={{ background: dept?.color_theme ?? '#C9A84C' }}
                  />
                  <h2 className="text-xl font-semibold text-white">{dept?.name}</h2>
                </div>
                <p className="text-xs text-white/40">{dept?.slug}</p>
              </div>
              {dept?.description && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-1">Description</p>
                  <p className="text-sm text-white/80 leading-relaxed">{dept.description}</p>
                </div>
              )}
              {dept?.vision && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-gold-300 mb-1">Vision</p>
                  <blockquote className="text-sm text-white/80 italic border-l-2 border-gold-500/50 pl-3">
                    « {dept.vision} »
                  </blockquote>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <Stat label="Membres" value={dept?.member_count_cache ?? dept?.members_count ?? 0} />
                <Stat label="Fondé en" value={dept?.founded_at ?? '—'} />
              </div>
            </div>

            <GovernorProfileCard
              governor={dept?.governor ?? { full_name: '—' }}
              profile={dept?.governor?.profile}
              departmentName={dept?.name}
              className="h-fit"
            />
          </motion.div>
        )
      )}

      {tab === 'profile' && (
        loadingProfile ? <SkeletonCard /> : (
          <form onSubmit={handleSubmit} className="rounded-2xl bg-ink-900 border border-white/5 p-5 sm:p-6 space-y-5 max-w-3xl">
            {/* Photos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FileField
                label="Photo de profil (carré)"
                accept="image/*"
                onFile={(file) => {
                  setPhotoFile(file)
                  setPhotoPreview(file ? URL.createObjectURL(file) : null)
                }}
                preview={photoPreview ?? profile?.photo_profile_url}
                aspect="aspect-square max-w-[180px]"
              />
              <FileField
                label="Bannière (16:9, min 1200×675)"
                accept="image/*"
                onFile={(file) => {
                  setBannerFile(file)
                  setBannerPreview(file ? URL.createObjectURL(file) : null)
                }}
                preview={bannerPreview ?? profile?.banner_image_url}
                aspect="aspect-[16/9]"
              />
            </div>

            <Textarea
              label="Bio (1000 caractères max)"
              value={form.bio} max={1000}
              onChange={(v) => setForm({ ...form, bio: v })}
              error={errors.bio}
            />
            <Textarea
              label="Vision (500 caractères max)"
              value={form.vision_statement} max={500} rows={3}
              onChange={(v) => setForm({ ...form, vision_statement: v })}
              error={errors.vision_statement}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label="Téléphone direct"
                value={form.phone_direct}
                onChange={(v) => setForm({ ...form, phone_direct: v })}
                error={errors.phone_direct}
              />
              <TextField
                type="number"
                label="Années en fonction"
                value={form.years_in_role}
                onChange={(v) => setForm({ ...form, years_in_role: v })}
                error={errors.years_in_role}
              />
            </div>

            <Button type="submit" disabled={update.isPending} className="gap-2">
              <Save size={16} />
              {update.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </form>
        )
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="text-lg font-semibold text-white mt-0.5">{value}</p>
    </div>
  )
}

function TextField({ label, value, onChange, type = 'text', error }) {
  return (
    <div>
      <label className="block text-sm text-white/80 mb-1.5">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        className="w-full rounded-lg bg-ink-950 border border-white/10 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}

function Textarea({ label, value, onChange, max, rows = 4, error }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm text-white/80">{label}</label>
        <span className="text-xs text-white/40">{(value ?? '').length}/{max}</span>
      </div>
      <textarea
        value={value ?? ''}
        rows={rows}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-ink-950 border border-white/10 px-3 py-2 text-sm text-white resize-y focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}

function FileField({ label, accept, onFile, preview, aspect }) {
  return (
    <div>
      <label className="block text-sm text-white/80 mb-1.5">{label}</label>
      <label className={cn(
        'relative cursor-pointer rounded-lg border-2 border-dashed border-white/10 hover:border-gold-500/50 bg-ink-950 transition flex items-center justify-center overflow-hidden',
        aspect,
      )}>
        {preview ? (
          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="text-center px-4">
            <Upload className="mx-auto text-white/40" size={24} />
            <p className="text-xs text-white/40 mt-1">Cliquer pour téléverser</p>
          </div>
        )}
        <input
          type="file"
          accept={accept}
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  )
}
