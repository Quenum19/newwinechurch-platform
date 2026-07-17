/**
 * Panneau Staff événement — Étape B.
 *
 * Affiche 4 sections regroupées par grant :
 *   - Managers            (contrôle total, invités par un autre manager)
 *   - Scanner Lead        (respo Sécurité, auto-attribué par l'observer)
 *   - Scanners internes   (membres NWC scannant + voyant la liste)
 *   - Scanners externes   (magic-links invités — création en Étape C)
 *
 * Actions :
 *   - Ajouter un staff (search user + choix grant)
 *   - Retirer un staff (soft revoke)
 *   - Suspendre / réactiver / révoquer un scanner externe
 */
import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  UserPlus, Trash2, Pause, Play, Ban, Crown, ShieldCheck, ScanLine,
  Search, Loader2, X, Check, AlertCircle, Mail, Phone, Clock, Info,
  Link2, Copy, MessageCircle, RefreshCw, Send, ExternalLink, MailPlus,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import Modal from '@/components/ui/Modal.jsx'
import { events, userSearch } from '@/api/admin'
import { getMyStaffAssignments } from '@/api/me'
import { useAuthStore } from '@/store/authStore'

// Labels et styles par grant — cohérents avec la palette admin (wine/gold).
const GRANT_META = {
  manager: {
    label: 'Manager',
    icon: Crown,
    color: 'bg-[#8B1A2F]/10 text-[#8B1A2F] border-[#8B1A2F]/40',
    description: 'Contrôle total — édition event, liste, waitlist, export, staff.',
  },
  scanner_lead: {
    label: 'Chef sécurité',
    icon: ShieldCheck,
    color: 'bg-amber-50 text-amber-800 border-amber-300',
    description: 'Scanne + gère les scanners externes (invités).',
  },
  scanner: {
    label: 'Scanner',
    icon: ScanLine,
    color: 'bg-blue-50 text-blue-800 border-blue-300',
    description: 'Scanne à l\'entrée + consulte la liste inscrits en lecture.',
  },
}

export default function StaffPanel({ eventId }) {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [addGrant, setAddGrant] = useState('scanner')
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [confirmRevokeGuest, setConfirmRevokeGuest] = useState(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  // Résultat d'une invitation ou régénération — contient { magic_link, display_name, contact, contact_type }.
  // Affiche la modal "Copier / WhatsApp / Email".
  const [linkResult, setLinkResult] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'events', eventId, 'staff'],
    queryFn: () => events.staffList(eventId),
    refetchInterval: 60_000,
  })

  // === Autorisations UI selon le rôle courant sur CE event ===
  // Fetch les assignments du user courant → détermine quelle action il peut voir.
  const authRoles = useAuthStore((s) => s.roles) ?? []
  const isGlobalAdmin = ['superadmin', 'admin', 'pasteur', 'rh'].some((r) => authRoles.includes(r))

  const { data: myAssignments = [] } = useQuery({
    queryKey: ['me', 'staff-assignments'],
    queryFn: getMyStaffAssignments,
    staleTime: 60_000,
  })
  const myGrantOnThisEvent = myAssignments.find(
    (a) => a.event_id === parseInt(eventId, 10) || a.event?.id === parseInt(eventId, 10),
  )?.grant

  // Manager de l'event OU admin global → contrôle total (peut ajouter Manager/Scanner Lead/Scanner)
  const canManageManagers = isGlobalAdmin || myGrantOnThisEvent === 'manager'
  // Chef sécurité OU admin/manager → peut ajouter/retirer des SCANNERS uniquement
  const canManageScanners = canManageManagers || myGrantOnThisEvent === 'scanner_lead'

  const staff = data?.staff ?? []
  const guests = data?.guests ?? []

  // Groupement par grant, membres actifs uniquement.
  const groups = useMemo(() => {
    const active = staff.filter((s) => s.is_active)
    return {
      manager:      active.filter((s) => s.grant === 'manager'),
      scanner_lead: active.filter((s) => s.grant === 'scanner_lead'),
      scanner:      active.filter((s) => s.grant === 'scanner'),
    }
  }, [staff])

  const activeGuests    = guests.filter((g) => g.status !== 'revoked')
  const revokedCount    = staff.length - (groups.manager.length + groups.scanner_lead.length + groups.scanner.length)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'events', eventId, 'staff'] })

  const addMutation = useMutation({
    mutationFn: ({ user_id, grant }) => events.staffAdd(eventId, { user_id, grant }),
    // Attend le refetch AVANT de fermer la modal → l'utilisateur voit tout de
    // suite la nouvelle ligne apparaître.
    onSuccess: async (res) => {
      toast.success(res?.message || 'Staff ajouté.')
      setAddOpen(false)
      await queryClient.refetchQueries({ queryKey: ['admin', 'events', eventId, 'staff'] })
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Erreur ajout staff.'),
  })

  const removeMutation = useMutation({
    mutationFn: (staffId) => events.staffRemove(eventId, staffId),
    onSuccess: () => { toast.success('Staff retiré.'); invalidate(); setConfirmRemove(null) },
    onError:   (e) => toast.error(e?.response?.data?.message || 'Erreur retrait staff.'),
  })

  const resendNotifMutation = useMutation({
    mutationFn: (staffId) => events.staffResendNotification(eventId, staffId),
    onSuccess: (res) => toast.success(res?.message || 'Notification renvoyée.'),
    onError:   (e)   => toast.error(e?.response?.data?.message || 'Erreur renvoi.'),
  })

  const guestStatusMutation = useMutation({
    mutationFn: ({ tokenId, status }) => events.guestUpdateStatus(eventId, tokenId, status),
    onSuccess: (res) => { toast.success(res?.message || 'Statut mis à jour.'); invalidate() },
    onError:   (e) => toast.error(e?.response?.data?.message || 'Erreur.'),
  })

  const guestRevokeMutation = useMutation({
    mutationFn: (tokenId) => events.guestRevoke(eventId, tokenId),
    onSuccess: () => { toast.success('Scanner invité révoqué.'); invalidate(); setConfirmRevokeGuest(null) },
    onError:   (e) => toast.error(e?.response?.data?.message || 'Erreur.'),
  })

  const inviteMutation = useMutation({
    mutationFn: (payload) => events.guestInvite(eventId, payload),
    onSuccess: (res) => {
      toast.success('Lien créé — copie-le ou envoie-le.')
      invalidate()
      setInviteOpen(false)
      setLinkResult({
        magic_link:   res.magic_link,
        display_name: res.guest?.display_name,
        contact:      res.guest?.contact,
        contact_type: res.guest?.contact_type,
      })
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Erreur création invité.'),
  })

  const regenerateMutation = useMutation({
    mutationFn: (tokenId) => events.guestRegenerate(eventId, tokenId),
    onSuccess: (res) => {
      toast.success('Nouveau lien généré.')
      invalidate()
      setLinkResult({
        magic_link:   res.magic_link,
        display_name: res.guest?.display_name,
        contact:      res.guest?.contact,
        contact_type: res.guest?.contact_type,
      })
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Erreur.'),
  })

  if (isLoading) {
    return <div className="adm-card p-8 text-center text-public-ink/50"><Loader2 className="inline animate-spin"/></div>
  }

  return (
    <div className="space-y-6">
      {/* Bandeau info : rappel du modèle rôles + auto-révocation */}
      <div className="adm-card p-4 bg-amber-50 border border-amber-200">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-amber-700 shrink-0 mt-0.5"/>
          <div className="text-sm text-amber-900 space-y-1">
            <p className="font-medium">Rôles scopés à cet événement uniquement.</p>
            <p className="text-amber-800/90 text-[13px] leading-relaxed">
              Chaque grant s'applique UNIQUEMENT à cet événement. Aucun accès global n'est donné.
              Les grants sont révoqués automatiquement 24h après la fin de l'événement.
            </p>
          </div>
        </div>
      </div>

      {/* Boutons d'action — visibles selon le rôle courant sur cet event.
          - Chef sécurité (scanner_lead) : peut inviter externe + ajouter scanners internes
          - Manager / admin global : peut aussi ajouter des managers */}
      {canManageScanners && (
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap sm:justify-end gap-2">
          <button
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 border-2 border-public-flame text-public-flame text-[11px] sm:text-xs uppercase tracking-wider font-mono hover:bg-public-flame hover:text-white transition"
          >
            <Link2 size={14}/> Inviter scanner externe
          </button>
          <button
            onClick={() => { setAddGrant('scanner'); setAddOpen(true) }}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-public-flame text-white text-[11px] sm:text-xs uppercase tracking-wider font-mono hover:bg-public-flame/90 transition"
          >
            <UserPlus size={14}/> {canManageManagers ? 'Ajouter un staff' : 'Ajouter un scanner'}
          </button>
        </div>
      )}

      {/* 3 sections grants (managers / scanner_lead / scanners) */}
      <StaffSection
        grant="manager"
        rows={groups.manager}
        onRemove={canManageManagers ? setConfirmRemove : null}
        onResendNotif={canManageManagers ? (s) => resendNotifMutation.mutate(s.id) : null}
        resendPending={resendNotifMutation.isPending}
        readOnly={! canManageManagers}
        emptyText="Aucun manager. Il faut au moins 1 manager pour gérer cet événement."
      />
      <StaffSection
        grant="scanner_lead"
        rows={groups.scanner_lead}
        onRemove={canManageManagers ? setConfirmRemove : null}
        onResendNotif={canManageManagers ? (s) => resendNotifMutation.mutate(s.id) : null}
        resendPending={resendNotifMutation.isPending}
        readOnly={! canManageManagers}
        emptyText="Aucun chef sécurité (le respo du dépt Sécurité est ajouté automatiquement)."
      />
      <StaffSection
        grant="scanner"
        rows={groups.scanner}
        onRemove={canManageScanners ? setConfirmRemove : null}
        onResendNotif={canManageScanners ? (s) => resendNotifMutation.mutate(s.id) : null}
        resendPending={resendNotifMutation.isPending}
        readOnly={! canManageScanners}
        emptyText="Aucun scanner interne pour l'instant. Ajoute un membre ou invite un scanner externe."
      />

      {/* Section scanners externes / invités */}
      <GuestScannersSection
        guests={activeGuests}
        onSuspend={canManageScanners ? (g) => guestStatusMutation.mutate({ tokenId: g.id, status: g.status === 'suspended' ? 'active' : 'suspended' }) : null}
        onRevoke={canManageScanners ? setConfirmRevokeGuest : null}
        onRegenerate={canManageScanners ? (g) => regenerateMutation.mutate(g.id) : null}
        regenerating={regenerateMutation.isPending}
        readOnly={! canManageScanners}
      />

      {/* MODAL — ajouter un staff.
          allowedGrants : filtre les niveaux d'accès affichés selon le rôle
          courant sur cet event. Un chef sécurité ne peut ajouter QUE des
          scanners internes (pas d'autres managers ni d'autres chefs sécu). */}
      <AddStaffModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        grant={addGrant}
        onGrantChange={setAddGrant}
        allowedGrants={canManageManagers ? ['manager', 'scanner_lead', 'scanner'] : ['scanner']}
        onSubmit={(userId) => addMutation.mutate({ user_id: userId, grant: addGrant })}
        loading={addMutation.isPending}
      />

      {/* MODAL — confirmer retrait staff */}
      <Modal open={!! confirmRemove} onClose={() => setConfirmRemove(null)}
             title="Retirer ce staff ?"
             description={confirmRemove ? `${confirmRemove.user?.name} perdra immédiatement son accès à cet événement.` : ''}>
        <p className="text-[13px] text-[#6B5F4E]">
          L'historique reste conservé pour audit. Tu peux le réintégrer plus tard si besoin.
        </p>
        <Modal.Footer>
          <button onClick={() => setConfirmRemove(null)}
                  className="px-4 py-2 text-sm text-[#6B5F4E] hover:text-[#1F1A14]">Annuler</button>
          <button onClick={() => removeMutation.mutate(confirmRemove.id)}
                  disabled={removeMutation.isPending}
                  className="px-4 py-2 text-sm bg-[#8B1A2F] text-white hover:bg-[#6F1425] transition disabled:opacity-60">
            {removeMutation.isPending ? <Loader2 size={14} className="animate-spin inline"/> : 'Retirer'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* MODAL — inviter scanner externe (Étape C) */}
      <InviteGuestModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSubmit={(payload) => inviteMutation.mutate(payload)}
        loading={inviteMutation.isPending}
      />

      {/* MODAL — résultat magic-link avec 3 boutons (Copier / WhatsApp / Email) */}
      <MagicLinkModal
        result={linkResult}
        onClose={() => setLinkResult(null)}
      />

      {/* MODAL — confirmer révocation invité */}
      <Modal open={!! confirmRevokeGuest} onClose={() => setConfirmRevokeGuest(null)}
             title="Révoquer ce scanner invité ?"
             description={confirmRevokeGuest ? `${confirmRevokeGuest.display_name} perdra définitivement son magic-link.` : ''}>
        <p className="text-[13px] text-[#6B5F4E]">
          Le lien devient inutilisable. Contrairement à Suspendre, cette action n'est pas réversible.
        </p>
        <Modal.Footer>
          <button onClick={() => setConfirmRevokeGuest(null)}
                  className="px-4 py-2 text-sm text-[#6B5F4E] hover:text-[#1F1A14]">Annuler</button>
          <button onClick={() => guestRevokeMutation.mutate(confirmRevokeGuest.id)}
                  disabled={guestRevokeMutation.isPending}
                  className="px-4 py-2 text-sm bg-[#8B1A2F] text-white hover:bg-[#6F1425] transition disabled:opacity-60">
            {guestRevokeMutation.isPending ? <Loader2 size={14} className="animate-spin inline"/> : 'Révoquer'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
//  Section staff par grant
// ---------------------------------------------------------------------------
function StaffSection({ grant, rows, onRemove, onResendNotif, resendPending, emptyText, readOnly = false }) {
  const meta = GRANT_META[grant]
  const Icon = meta.icon

  return (
    <section className="adm-card overflow-hidden">
      <header className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-public-ink/10">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full inline-flex items-center justify-center border ${meta.color}`}>
            <Icon size={16}/>
          </div>
          <div>
            <h3 className="font-display text-sm uppercase tracking-wider">{meta.label}</h3>
            <p className="text-[11px] text-public-ink/50">{meta.description}</p>
          </div>
        </div>
        <span className="text-xs font-mono text-public-ink/50">{rows.length}</span>
      </header>

      {rows.length === 0 ? (
        <p className="px-4 sm:px-5 py-6 text-sm text-public-ink/50 text-center italic">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-public-ink/5">
          {rows.map((s) => (
            <li key={s.id} className="px-4 sm:px-5 py-3 flex items-center gap-4">
              <Avatar user={s.user}/>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-public-ink truncate">{s.user?.name || '—'}</p>
                <p className="text-xs text-public-ink/60 truncate">{s.user?.email}</p>
              </div>
              <div className="text-right shrink-0">
                {s.assigned_at && (
                  <p className="text-[11px] font-mono text-public-ink/50">
                    <Clock size={10} className="inline mr-1"/>
                    {format(new Date(s.assigned_at), 'd MMM', { locale: fr })}
                  </p>
                )}
              </div>
              {onResendNotif && (
                <button
                  onClick={() => onResendNotif(s)}
                  disabled={resendPending}
                  className="p-2 text-public-ink/40 hover:text-blue-600 hover:bg-blue-50 rounded transition disabled:opacity-40"
                  title="Renvoyer la notification par email"
                >
                  <MailPlus size={15}/>
                </button>
              )}
              {onRemove && (
                <button
                  onClick={() => onRemove(s)}
                  className="p-2 text-public-ink/40 hover:text-[#8B1A2F] hover:bg-red-50 rounded transition"
                  title="Retirer ce staff"
                >
                  <Trash2 size={15}/>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
//  Section scanners externes (magic-links invités)
// ---------------------------------------------------------------------------
function GuestScannersSection({ guests, onSuspend, onRevoke, onRegenerate, regenerating, readOnly = false }) {
  return (
    <section className="adm-card overflow-hidden">
      <header className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-public-ink/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full inline-flex items-center justify-center border bg-purple-50 text-purple-800 border-purple-300">
            <ScanLine size={16}/>
          </div>
          <div>
            <h3 className="font-display text-sm uppercase tracking-wider">Scanners invités externes</h3>
            <p className="text-[11px] text-public-ink/50">
              Non-membres invités par magic-link, expirent après l'événement.
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-public-ink/50">{guests.length}</span>
      </header>

      {guests.length === 0 ? (
        <div className="px-4 sm:px-5 py-8 text-center">
          <p className="text-sm text-public-ink/50 italic">
            Aucun scanner invité pour l'instant.
          </p>
          <p className="text-[12px] text-public-ink/40 mt-2">
            Clique sur "Inviter un scanner externe" pour créer un magic-link.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-public-ink/5">
          {guests.map((g) => (
            <li key={g.id} className="px-4 sm:px-5 py-3 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-700 inline-flex items-center justify-center font-medium text-sm">
                {g.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-public-ink truncate">{g.display_name}</p>
                <p className="text-xs text-public-ink/60 truncate inline-flex items-center gap-1">
                  {g.contact_type === 'email' ? <Mail size={11}/> : <Phone size={11}/>}
                  {g.contact ?? '—'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <StatusBadge status={g.status} isValid={g.is_valid}/>
                <p className="text-[11px] font-mono text-public-ink/50 mt-1">
                  {g.scan_count} scan{g.scan_count > 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onRegenerate && (
                  <button
                    onClick={() => onRegenerate(g)}
                    disabled={regenerating}
                    className="p-2 text-public-ink/40 hover:text-public-flame hover:bg-orange-50 rounded transition disabled:opacity-50"
                    title="Régénérer le lien (l'ancien devient invalide)"
                  >
                    <RefreshCw size={15} className={regenerating ? 'animate-spin' : ''}/>
                  </button>
                )}
                {onSuspend && (
                  <button
                    onClick={() => onSuspend(g)}
                    className="p-2 text-public-ink/40 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                    title={g.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
                  >
                    {g.status === 'suspended' ? <Play size={15}/> : <Pause size={15}/>}
                  </button>
                )}
                {onRevoke && (
                  <button
                    onClick={() => onRevoke(g)}
                    className="p-2 text-public-ink/40 hover:text-[#8B1A2F] hover:bg-red-50 rounded transition"
                    title="Révoquer définitivement"
                  >
                    <Ban size={15}/>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function StatusBadge({ status, isValid }) {
  if (status === 'suspended') return <span className="text-[11px] px-2 py-0.5 border border-amber-300 bg-amber-50 text-amber-800">Suspendu</span>
  if (status === 'revoked')   return <span className="text-[11px] px-2 py-0.5 border border-red-300 bg-red-50 text-red-800">Révoqué</span>
  if (! isValid)              return <span className="text-[11px] px-2 py-0.5 border border-gray-300 bg-gray-50 text-gray-700">Expiré</span>
  return <span className="text-[11px] px-2 py-0.5 border border-green-300 bg-green-50 text-green-800">Actif</span>
}

function Avatar({ user }) {
  if (user?.avatar) {
    return <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover"/>
  }
  const initial = user?.name?.[0]?.toUpperCase() ?? '?'
  return (
    <div className="w-10 h-10 rounded-full bg-public-ink/5 text-public-ink/70 inline-flex items-center justify-center font-medium">
      {initial}
    </div>
  )
}

// ---------------------------------------------------------------------------
//  Modal ajouter un staff
// ---------------------------------------------------------------------------
function AddStaffModal({ open, onClose, grant, onGrantChange, onSubmit, loading, allowedGrants = ['manager', 'scanner_lead', 'scanner'] }) {
  const [selectedUser, setSelectedUser] = useState(null)

  // Reset la sélection à chaque ouverture. Auto-force le grant sélectionné à
  // rester dans la liste autorisée (utile si le user courant est chef sécu).
  useEffect(() => {
    if (open) {
      setSelectedUser(null)
      if (! allowedGrants.includes(grant)) onGrantChange(allowedGrants[0])
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal open={open} onClose={onClose} title="Ajouter un staff à l'événement"
           description="Recherche un membre par nom ou email et choisis son niveau d'accès." size="lg">
      <div className="space-y-5">
        {/* Étape 1 — Choix grant (limité selon le rôle courant) */}
        <div>
          <label className="text-[12px] uppercase tracking-wider font-mono text-[#6B5F4E]">
            Niveau d'accès {allowedGrants.length === 1 && '(Scanner seul possible pour ton rôle)'}
          </label>
          <div className={`grid ${allowedGrants.length === 1 ? 'grid-cols-1' : allowedGrants.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-2 mt-2`}>
            {allowedGrants.map((g) => {
              const meta = GRANT_META[g]
              const Icon = meta.icon
              const active = grant === g
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => onGrantChange(g)}
                  className={`p-3 border-2 text-left transition rounded ${
                    active
                      ? 'border-[#8B1A2F] bg-[#8B1A2F]/5'
                      : 'border-[#E8DFC9] hover:border-[#8B1A2F]/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={active ? 'text-[#8B1A2F]' : 'text-[#6B5F4E]'}/>
                    <span className={`text-sm font-medium ${active ? 'text-[#8B1A2F]' : 'text-[#1F1A14]'}`}>{meta.label}</span>
                  </div>
                  <p className="text-[11px] text-[#6B5F4E] mt-1 leading-tight">{meta.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Étape 2 — Search user */}
        <div>
          <label className="text-[12px] uppercase tracking-wider font-mono text-[#6B5F4E]">Rechercher un membre</label>
          <UserSearchInput onSelect={setSelectedUser} selected={selectedUser}/>
        </div>
      </div>

      <Modal.Footer>
        <button onClick={onClose} className="px-4 py-2 text-sm text-[#6B5F4E] hover:text-[#1F1A14]">Annuler</button>
        <button
          onClick={() => selectedUser && onSubmit(selectedUser.id)}
          disabled={! selectedUser || loading}
          className="px-4 py-2 text-sm bg-[#8B1A2F] text-white hover:bg-[#6F1425] transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
          Attribuer
        </button>
      </Modal.Footer>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
//  UserSearchInput — autocomplete pour ajouter un staff
// ---------------------------------------------------------------------------
function UserSearchInput({ onSelect, selected }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const timerRef = useRef(null)

  // Debounce 250ms sur la recherche.
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(q.trim()), 250)
    return () => clearTimeout(timerRef.current)
  }, [q])

  const { data, isFetching } = useQuery({
    queryKey: ['admin', 'users', 'search', debounced],
    queryFn: () => userSearch.find(debounced),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  })

  const results = data?.data ?? []

  if (selected) {
    return (
      <div className="mt-2 flex items-center gap-3 p-3 border border-[#8B1A2F]/40 bg-[#8B1A2F]/5 rounded">
        <div className="w-10 h-10 rounded-full bg-[#8B1A2F]/10 text-[#8B1A2F] inline-flex items-center justify-center font-medium">
          {selected.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#1F1A14] truncate">{selected.name}</p>
          <p className="text-xs text-[#6B5F4E] truncate">{selected.email}</p>
        </div>
        <button
          onClick={() => { onSelect(null); setQ(''); setOpen(true) }}
          className="p-1.5 text-[#6B5F4E] hover:text-[#1F1A14] hover:bg-[#F0E7D1] rounded transition"
        >
          <X size={16}/>
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2 relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B5F4E]"/>
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Nom, prénom, email ou téléphone (min. 2 caractères)..."
          className="w-full pl-9 pr-9 py-2.5 text-sm border border-[#E8DFC9] bg-white rounded focus:outline-none focus:border-[#8B1A2F]"
        />
        {isFetching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B5F4E] animate-spin"/>}
      </div>

      {open && debounced.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E8DFC9] rounded shadow-lg max-h-60 overflow-y-auto z-10">
          {results.length === 0 && ! isFetching && (
            <p className="p-3 text-sm text-[#6B5F4E] text-center italic">Aucun résultat.</p>
          )}
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => { onSelect(u); setOpen(false) }}
              className="w-full flex items-center gap-3 p-3 hover:bg-[#F5EFE2] border-b border-[#E8DFC9] last:border-b-0 text-left"
            >
              <div className="w-9 h-9 rounded-full bg-[#F0E7D1] text-[#8B1A2F] inline-flex items-center justify-center font-medium">
                {u.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#1F1A14] truncate">{u.name}</p>
                <p className="text-xs text-[#6B5F4E] truncate">{u.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
//  InviteGuestModal — invitation scanner externe (magic-link)
// ---------------------------------------------------------------------------
function InviteGuestModal({ open, onClose, onSubmit, loading }) {
  const [displayName, setDisplayName] = useState('')
  const [contactType, setContactType] = useState('whatsapp')
  const [contact, setContact]         = useState('')

  useEffect(() => {
    if (open) {
      setDisplayName('')
      setContact('')
      setContactType('whatsapp')
    }
  }, [open])

  const canSubmit = displayName.trim().length >= 2 && contact.trim().length >= 3

  return (
    <Modal open={open} onClose={onClose} size="lg"
           title="Inviter un scanner externe"
           description="Génère un lien unique à envoyer via WhatsApp, email ou en copiant. L'invité n'a pas besoin de compte NWC.">
      <div className="space-y-5">
        <div>
          <label className="text-[12px] uppercase tracking-wider font-mono text-[#6B5F4E]">
            Nom de la personne
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ex : Kader Yao"
            className="w-full mt-2 px-3 py-2.5 text-sm border border-[#E8DFC9] bg-white rounded focus:outline-none focus:border-[#8B1A2F]"
            autoFocus
          />
        </div>

        <div>
          <label className="text-[12px] uppercase tracking-wider font-mono text-[#6B5F4E]">
            Canal de contact
          </label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={() => setContactType('whatsapp')}
              className={`p-3 border-2 rounded flex items-center gap-2 transition ${
                contactType === 'whatsapp'
                  ? 'border-green-600 bg-green-50 text-green-800'
                  : 'border-[#E8DFC9] hover:border-green-500 text-[#1F1A14]'
              }`}
            >
              <MessageCircle size={14}/>
              <span className="text-sm font-medium">WhatsApp / SMS</span>
            </button>
            <button
              type="button"
              onClick={() => setContactType('email')}
              className={`p-3 border-2 rounded flex items-center gap-2 transition ${
                contactType === 'email'
                  ? 'border-blue-600 bg-blue-50 text-blue-800'
                  : 'border-[#E8DFC9] hover:border-blue-500 text-[#1F1A14]'
              }`}
            >
              <Mail size={14}/>
              <span className="text-sm font-medium">Email</span>
            </button>
          </div>
        </div>

        <div>
          <label className="text-[12px] uppercase tracking-wider font-mono text-[#6B5F4E]">
            {contactType === 'whatsapp' ? 'Numéro WhatsApp' : 'Adresse email'}
          </label>
          <input
            type={contactType === 'email' ? 'email' : 'tel'}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={contactType === 'whatsapp' ? '+225 07 12 34 56 78' : 'exemple@mail.com'}
            className="w-full mt-2 px-3 py-2.5 text-sm border border-[#E8DFC9] bg-white rounded focus:outline-none focus:border-[#8B1A2F]"
          />
          <p className="text-[11px] text-[#6B5F4E] mt-1.5">
            {contactType === 'whatsapp'
              ? "Format international recommandé. Utilisé pour l'envoi rapide via WhatsApp."
              : "Un compte NWC existant avec cette adresse ? Utilise plutôt \"Ajouter un staff\"."}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-[12px] text-blue-900">
          <p className="font-medium mb-1 flex items-center gap-1.5"><Info size={13}/> Sécurité</p>
          <ul className="space-y-0.5 text-blue-800/90 list-disc pl-4">
            <li>Le lien expire automatiquement quelques heures après l'événement.</li>
            <li>Tu peux suspendre ou révoquer l'accès à tout moment.</li>
            <li>L'invité ne peut QUE scanner sur cet événement précis.</li>
          </ul>
        </div>
      </div>

      <Modal.Footer>
        <button onClick={onClose} className="px-4 py-2 text-sm text-[#6B5F4E] hover:text-[#1F1A14]">
          Annuler
        </button>
        <button
          onClick={() => onSubmit({
            display_name: displayName.trim(),
            contact:      contact.trim(),
            contact_type: contactType,
          })}
          disabled={! canSubmit || loading}
          className="px-4 py-2 text-sm bg-[#8B1A2F] text-white hover:bg-[#6F1425] transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin"/> : <Link2 size={14}/>}
          Créer le lien
        </button>
      </Modal.Footer>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
//  MagicLinkModal — affichage du lien avec 3 boutons (Copier / WhatsApp / Email)
//  Le lien N'EST PLUS accessible après fermeture — regénérer si besoin.
// ---------------------------------------------------------------------------
function MagicLinkModal({ result, onClose }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (! result) setCopied(false)
  }, [result])

  if (! result) return null

  const link = result.magic_link
  const shareMessage = `Bonjour ${result.display_name}, tu es invité(e) à scanner les tickets à l'entrée. Ouvre ce lien sur ton téléphone pour accéder au scanner : ${link}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success('Lien copié dans le presse-papier.')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Copie impossible. Sélectionne le lien manuellement.')
    }
  }

  const openWhatsApp = () => {
    const phone = result.contact_type === 'whatsapp'
      ? (result.contact || '').replace(/[^\d]/g, '')
      : ''
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(shareMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(shareMessage)}`
    window.open(url, '_blank', 'noopener')
  }

  const openEmail = () => {
    const to      = result.contact_type === 'email' ? (result.contact || '') : ''
    const subject = 'Ton accès scanner NWC'
    const body    = shareMessage
    const url     = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = url
  }

  return (
    <Modal open={!! result} onClose={onClose} size="lg"
           title="Lien scanner généré"
           description={`Envoie ce lien à ${result.display_name}. Il expire automatiquement après l'événement.`}>
      <div className="space-y-5">
        {/* Zone lien à copier */}
        <div>
          <label className="text-[12px] uppercase tracking-wider font-mono text-[#6B5F4E]">
            Magic-link unique
          </label>
          <div className="mt-2 flex items-stretch gap-0 border border-[#E8DFC9] rounded overflow-hidden bg-white">
            <input
              type="text"
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
              className="flex-1 px-3 py-2.5 text-sm font-mono text-[#1F1A14] bg-transparent focus:outline-none"
            />
            <button
              onClick={copyLink}
              className={`px-3 flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-wider transition ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-[#8B1A2F] text-white hover:bg-[#6F1425]'
              }`}
            >
              {copied ? <Check size={14}/> : <Copy size={14}/>}
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>
          <p className="text-[11px] text-amber-700 mt-2 flex items-center gap-1">
            <AlertCircle size={12}/> Ce lien ne sera plus affiché après fermeture. Régénère-le si tu le perds.
          </p>
        </div>

        {/* Grille des 3 canaux d'envoi */}
        <div>
          <label className="text-[12px] uppercase tracking-wider font-mono text-[#6B5F4E]">
            Envoyer le lien
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
            <button
              onClick={copyLink}
              className="p-4 border-2 border-[#E8DFC9] hover:border-[#8B1A2F] hover:bg-[#8B1A2F]/5 rounded transition flex flex-col items-center gap-2 text-[#1F1A14]"
            >
              <Copy size={20} className="text-[#8B1A2F]"/>
              <span className="text-sm font-medium">Copier</span>
              <span className="text-[11px] text-[#6B5F4E] text-center">Colle-le où tu veux</span>
            </button>
            <button
              onClick={openWhatsApp}
              className="p-4 border-2 border-[#E8DFC9] hover:border-green-600 hover:bg-green-50 rounded transition flex flex-col items-center gap-2 text-[#1F1A14]"
            >
              <MessageCircle size={20} className="text-green-600"/>
              <span className="text-sm font-medium">WhatsApp</span>
              <span className="text-[11px] text-[#6B5F4E] text-center">
                {result.contact_type === 'whatsapp' && result.contact
                  ? `Vers ${result.contact}` : 'Choisis le contact'}
              </span>
            </button>
            <button
              onClick={openEmail}
              className="p-4 border-2 border-[#E8DFC9] hover:border-blue-600 hover:bg-blue-50 rounded transition flex flex-col items-center gap-2 text-[#1F1A14]"
            >
              <Mail size={20} className="text-blue-600"/>
              <span className="text-sm font-medium">Email</span>
              <span className="text-[11px] text-[#6B5F4E] text-center">
                {result.contact_type === 'email' && result.contact
                  ? `Vers ${result.contact}` : 'Choisis le destinataire'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <Modal.Footer>
        <button onClick={onClose}
                className="px-4 py-2 text-sm bg-[#8B1A2F] text-white hover:bg-[#6F1425] transition">
          Terminé
        </button>
      </Modal.Footer>
    </Modal>
  )
}
