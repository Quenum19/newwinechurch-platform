/** Newsletter — Refonte 2026 admin-v2 native (onglets compose / subscribers). */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Send, Users, Trash2, Check, Mail } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import TiptapEditor from '@/components/admin/TiptapEditor.jsx'
import { newsletter } from '@/api/admin'
import { cn } from '@/utils/cn'

export default function NewsletterPage() {
  const [tab, setTab] = useState('compose')

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1>Newsletter</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
          Communication groupée — composez votre email, testez avant l'envoi de masse.
        </p>
      </header>

      <div className="flex gap-1 border-b -mb-px overflow-x-auto" style={{ borderColor: 'var(--adm-border)' }}>
        <TabBtn active={tab === 'compose'} onClick={() => setTab('compose')}>
          <Send size={14} /> Composer
        </TabBtn>
        <TabBtn active={tab === 'subscribers'} onClick={() => setTab('subscribers')}>
          <Users size={14} /> Abonnés
        </TabBtn>
      </div>

      {tab === 'compose' ? <ComposeTab /> : <SubscribersTab />}
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2.5 text-sm border-b-2 inline-flex items-center gap-2 transition whitespace-nowrap',
        active ? 'font-medium' : ''
      )}
      style={{
        borderColor: active ? 'var(--adm-accent)' : 'transparent',
        color: active ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
      }}
    >
      {children}
    </button>
  )
}

function ComposeTab() {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [language, setLanguage] = useState('')
  const [testEmail, setTestEmail] = useState('')

  const sendMutation = useMutation({
    mutationFn: (payload) => newsletter.send(payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Envoyé.', { duration: 6000 })
      if (!data?.batches_queued) setTestEmail('')
    },
    onError: (err) => {
      const errs = err?.response?.data?.errors
      const first = errs ? Object.values(errs).flat()[0] : err?.response?.data?.message
      toast.error(first || 'Erreur d\'envoi.')
    },
  })

  const handleSendTest = () => {
    if (!testEmail) return toast.error('Renseignez une adresse de test.')
    sendMutation.mutate({ subject, body, test_email: testEmail })
  }
  const handleSendAll = () => {
    if (!confirm(`Envoyer la newsletter à TOUS les abonnés confirmés${language ? ` (${language})` : ''} ?`)) return
    sendMutation.mutate({ subject, body, language: language || undefined })
  }

  const valid = subject.length >= 5 && body.replace(/<[^>]*>/g, '').trim().length >= 20

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Compose principal */}
      <div className="lg:col-span-2">
        <div className="adm-card p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--adm-text)' }}>
              Sujet <span style={{ color: 'var(--adm-danger)' }}>*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="ex: Newsletter NWC — Mai 2026"
              className="adm-input"
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--adm-text)' }}>
              Corps de l'email
            </label>
            <TiptapEditor value={body} onChange={setBody} />
            <p className="text-xs mt-2" style={{ color: 'var(--adm-text-muted)' }}>
              Variables disponibles :{' '}
              <code
                className="text-xs font-mono px-1 py-0.5 rounded"
                style={{ background: 'var(--adm-card-hover)', color: 'var(--adm-accent)' }}
              >{'{{name}}'}</code> (prénom abonné),{' '}
              <code
                className="text-xs font-mono px-1 py-0.5 rounded"
                style={{ background: 'var(--adm-card-hover)', color: 'var(--adm-accent)' }}
              >{'{{unsubscribe_url}}'}</code> (lien désinscription).
            </p>
          </div>
        </div>
      </div>

      {/* Side : cible + test + envoi */}
      <div className="space-y-4">
        <div className="adm-card p-4 sm:p-5 space-y-3">
          <h2>Cible</h2>
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--adm-text)' }}>Langue</label>
            <select
              className="adm-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="">Tous les abonnés</option>
              <option value="fr">Français uniquement</option>
              <option value="en">Anglais uniquement</option>
            </select>
          </div>
        </div>

        <div className="adm-card p-4 sm:p-5 space-y-3">
          <h2>Test</h2>
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--adm-text)' }}>Email de test</label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="vous@example.com"
              className="adm-input"
            />
          </div>
          <button
            type="button"
            onClick={handleSendTest}
            disabled={!valid || !testEmail || sendMutation.isPending}
            className="adm-btn adm-btn-secondary w-full justify-center"
          >
            {sendMutation.isPending ? '…' : 'Envoyer un test'}
          </button>
        </div>

        <div
          className="adm-card p-4 sm:p-5 space-y-3"
          style={{ borderColor: 'var(--adm-accent)' }}
        >
          <h2>Envoi définitif</h2>
          <p className="text-xs" style={{ color: 'var(--adm-text-muted)' }}>
            L'envoi est planifié en arrière-plan par lots de 1000 abonnés.
            Vous pouvez fermer cet écran après confirmation.
          </p>
          <button
            type="button"
            onClick={handleSendAll}
            disabled={!valid || sendMutation.isPending}
            className="adm-btn adm-btn-primary w-full justify-center"
          >
            <Send size={14} /> {sendMutation.isPending ? '…' : 'Envoyer la newsletter'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SubscribersTab() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ per_page: 50 })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'newsletter', 'subscribers', filters],
    queryFn: () => newsletter.subscribers(filters),
  })

  const remove = useMutation({
    mutationFn: (id) => newsletter.deleteSubscriber(id),
    onSuccess: () => {
      toast.success('Abonné supprimé.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'newsletter', 'subscribers'] })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="adm-card h-20 animate-pulse" />
          ))}
        </div>
        <div className="adm-card h-96 animate-pulse" />
      </div>
    )
  }

  const subs = data?.subscribers?.data ?? []
  const stats = data?.stats ?? {}

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total ?? 0} icon={Mail} />
        <StatCard label="Confirmés actifs" value={stats.confirmed ?? 0} tone="success" />
        <StatCard label="Non confirmés" value={stats.unconfirmed ?? 0} tone="warning" />
        <StatCard label="Désinscrits" value={stats.unsubscribed ?? 0} />
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap items-center">
        <select
          className="adm-select w-auto text-sm h-9"
          value={filters.confirmed ?? ''}
          onChange={(e) => setFilters({ ...filters, confirmed: e.target.value === '' ? undefined : e.target.value })}
        >
          <option value="">Tous</option>
          <option value="1">Confirmés</option>
          <option value="0">Non confirmés</option>
        </select>
        <select
          className="adm-select w-auto text-sm h-9"
          value={filters.language ?? ''}
          onChange={(e) => setFilters({ ...filters, language: e.target.value || undefined })}
        >
          <option value="">Toutes langues</option>
          <option value="fr">Français</option>
          <option value="en">Anglais</option>
        </select>
        <input
          type="search"
          placeholder="Email ou nom…"
          className="adm-input flex-1 min-w-[180px] h-9 text-sm"
          value={filters.search ?? ''}
          onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block adm-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nom</th>
                <th>Langue</th>
                <th>Statut</th>
                <th>Inscrit le</th>
                <th className="text-right"></th>
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12" style={{ color: 'var(--adm-text-muted)' }}>
                    Aucun abonné.
                  </td>
                </tr>
              ) : subs.map((s) => (
                <tr key={s.id}>
                  <td className="text-xs" style={{ color: 'var(--adm-text)' }}>{s.email}</td>
                  <td>{s.name || <span style={{ color: 'var(--adm-text-faint)' }}>—</span>}</td>
                  <td className="uppercase text-xs">{s.language}</td>
                  <td><SubStatus s={s} /></td>
                  <td className="text-xs tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>
                    {s.created_at && format(new Date(s.created_at), 'dd MMM yyyy', { locale: fr })}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => { if (confirm('Supprimer cet abonné ?')) remove.mutate(s.id) }}
                      className="p-1.5 rounded hover:bg-red-50 transition"
                      style={{ color: 'var(--adm-danger)' }}
                      aria-label="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {subs.length === 0 ? (
          <div className="adm-card p-8 text-center text-sm" style={{ color: 'var(--adm-text-muted)' }}>
            Aucun abonné.
          </div>
        ) : subs.map((s) => (
          <div key={s.id} className="adm-card p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>
                  {s.email}
                </div>
                <div className="text-xs" style={{ color: 'var(--adm-text-muted)' }}>
                  {s.name || '—'} · <span className="uppercase">{s.language}</span>
                </div>
                <div className="mt-1.5"><SubStatus s={s} /></div>
              </div>
              <button
                onClick={() => { if (confirm('Supprimer cet abonné ?')) remove.mutate(s.id) }}
                className="adm-btn adm-btn-secondary p-1.5 shrink-0"
                style={{ color: 'var(--adm-danger)' }}
                aria-label="Supprimer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SubStatus({ s }) {
  if (s.unsubscribed_at) return <span className="adm-badge adm-badge-danger">Désinscrit</span>
  if (s.is_confirmed) return <span className="adm-badge adm-badge-success"><Check size={10} /> Confirmé</span>
  return <span className="adm-badge adm-badge-warning">En attente</span>
}

function StatCard({ label, value, icon: Icon, tone }) {
  const styles =
    tone === 'success' ? { borderColor: '#BBF7D0', background: '#F0FDF4' }
    : tone === 'warning' ? { borderColor: '#FDE68A', background: '#FFFBEB' }
    : undefined
  return (
    <div className="adm-card p-3 sm:p-4" style={styles}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--adm-text-faint)' }}>
          {label}
        </span>
        {Icon && <Icon size={14} style={{ color: 'var(--adm-text-faint)' }} />}
      </div>
      <div className="text-2xl font-semibold tabular-nums mt-2" style={{ color: 'var(--adm-text)' }}>
        {value}
      </div>
    </div>
  )
}
