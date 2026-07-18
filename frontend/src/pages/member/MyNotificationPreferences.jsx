/**
 * Sprint B — Page /admin/profil/notifications.
 * Permet à chaque user d'activer/désactiver certaines notifications.
 * Les entrées `critical` sont affichées mais désactivées (verrou).
 */
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Lock, BellRing } from 'lucide-react'

import Button from '@/components/ui/Button.jsx'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/api/me'

export default function MyNotificationPreferences() {
  const queryClient = useQueryClient()

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['me', 'notification-preferences'],
    queryFn: getNotificationPreferences,
    staleTime: 60_000,
  })

  // Copie locale éditable (draft avant save).
  const [draft, setDraft] = useState({})

  useEffect(() => {
    if (prefs) {
      const initial = {}
      prefs.forEach((p) => { initial[p.key] = p.enabled })
      setDraft(initial)
    }
  }, [prefs])

  const mutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: () => {
      toast.success('Préférences enregistrées.')
      queryClient.invalidateQueries({ queryKey: ['me', 'notification-preferences'] })
    },
    onError: () => toast.error('Impossible d\'enregistrer.'),
  })

  const isDirty = prefs?.some((p) => !p.critical && draft[p.key] !== p.enabled)

  const handleSave = () => {
    const payload = (prefs || [])
      .filter((p) => !p.critical)
      .map((p) => ({ key: p.key, enabled: !!draft[p.key] }))
    mutation.mutate(payload)
  }

  if (isLoading) {
    return <div className="text-white/60">Chargement…</div>
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-white flex items-center gap-3">
          <BellRing size={26} className="text-gold-400" /> Mes notifications
        </h1>
        <p className="text-white/60 mt-1">
          Choisis les types de notifications que tu souhaites recevoir par email.
        </p>
      </header>

      <section className="card-nwc p-2">
        <ul className="divide-y divide-white/10">
          {(prefs || []).map((p) => (
            <li key={p.key} className="flex items-center justify-between px-4 py-4">
              <div className="min-w-0 pr-4">
                <p className="text-white font-medium flex items-center gap-2">
                  {p.label}
                  {p.critical && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest bg-wine-700/40 text-gold-400 px-2 py-0.5 rounded">
                      <Lock size={10} /> critique
                    </span>
                  )}
                </p>
                {p.critical && (
                  <p className="text-xs text-white/40 mt-1">
                    Non désactivable — sécurité de la plateforme.
                  </p>
                )}
              </div>

              <label className={`inline-flex items-center cursor-pointer ${p.critical ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="checkbox"
                  className="sr-only peer"
                  disabled={p.critical}
                  checked={p.critical ? true : !!draft[p.key]}
                  onChange={(e) => {
                    if (p.critical) return
                    setDraft((d) => ({ ...d, [p.key]: e.target.checked }))
                  }}
                />
                <div className={`w-11 h-6 rounded-full peer-focus:ring-2 peer-focus:ring-gold-500/50
                                 ${(p.critical || draft[p.key]) ? 'bg-gold-500' : 'bg-white/15'}
                                 after:content-[''] after:absolute after:h-5 after:w-5 after:rounded-full after:bg-white
                                 after:transition-all after:top-0.5 after:left-0.5
                                 ${(p.critical || draft[p.key]) ? 'after:translate-x-5' : ''}
                                 relative`} />
              </label>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!isDirty || mutation.isPending}
          loading={mutation.isPending}
        >
          Enregistrer
        </Button>
      </div>
    </div>
  )
}
