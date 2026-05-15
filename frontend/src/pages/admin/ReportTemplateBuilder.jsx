/**
 * ReportTemplateBuilder — Builder visuel du template de rapport d'un département.
 *
 *  - Charge le template ACTIF (s'il existe)
 *  - Permet d'ajouter / supprimer / réordonner sections et champs
 *  - Champs supportés : text, textarea, number, date, time, datetime, select, yesno, checkbox, table
 *  - Aperçu live via <ReportFormRenderer> (lecture seule)
 *  - À la sauvegarde : versioning auto (le backend crée une nouvelle version, l'ancienne reste archivée)
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Save, Plus, Trash2, ChevronUp, ChevronDown, Layers, Eye, EyeOff,
  Type, AlignLeft, Hash, Calendar, Clock, Check, ListChecks, Table as TableIcon,
} from 'lucide-react'

import { reportTemplates, departments } from '@/api/admin'
import ReportFormRenderer from '@/components/shared/ReportFormRenderer'

const FIELD_TYPES = [
  { value: 'text',           label: 'Texte court',     icon: Type },
  { value: 'textarea',       label: 'Zone de texte',   icon: AlignLeft },
  { value: 'number',         label: 'Nombre',          icon: Hash },
  { value: 'date',           label: 'Date',            icon: Calendar },
  { value: 'time',           label: 'Heure',           icon: Clock },
  { value: 'datetime',       label: 'Date + heure',    icon: Calendar },
  { value: 'select',         label: 'Liste déroulante',icon: ListChecks },
  { value: 'yesno',          label: 'Oui / Non',       icon: Check },
  { value: 'checkbox',       label: 'Case à cocher',   icon: Check },
  { value: 'checkbox-group', label: 'Cases multiples', icon: ListChecks },
  { value: 'table',          label: 'Tableau',         icon: TableIcon },
]

const slugify = (s) =>
  s.toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
   .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50) || 'champ'

export default function ReportTemplateBuilder() {
  const { id } = useParams()
  const departmentId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [showPreview, setShowPreview] = useState(true)
  const [previewValues, setPreviewValues] = useState({})

  const { data: dept } = useQuery({
    queryKey: ['admin', 'departments', departmentId],
    queryFn: () => departments.get(departmentId).then((d) => d?.data ?? d),
  })

  const { data: template, isLoading } = useQuery({
    queryKey: ['admin', 'report-templates', departmentId, 'active'],
    queryFn: () => reportTemplates.active(departmentId).catch(() => null),
  })

  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState('weekly')
  const [sections, setSections] = useState([])

  useEffect(() => {
    if (template) {
      setName(template.name ?? '')
      setFrequency(template.frequency ?? 'weekly')
      setSections(normalizeSchema(template.schema))
    } else if (!isLoading) {
      // Pas de template → init avec un squelette
      setName(dept?.name ? `Rapport hebdomadaire — ${dept.name}` : '')
      setSections([
        { title: 'Identité du rapport', fields: [
          { key: 'periode',     label: 'Période',       type: 'text',     required: true, placeholder: 'Semaine du …' },
          { key: 'leader_name', label: 'Nom du leader', type: 'text',     required: true },
        ]},
      ])
    }
  }, [template, isLoading, dept?.name])

  const saveMut = useMutation({
    mutationFn: (payload) => {
      if (template?.id) return reportTemplates.update(departmentId, template.id, payload)
      return reportTemplates.create(departmentId, payload)
    },
    onSuccess: () => {
      toast.success('Template enregistré.')
      qc.invalidateQueries({ queryKey: ['admin', 'report-templates', departmentId] })
    },
    onError: (err) => {
      const msg = err?.response?.data?.message ?? 'Erreur de sauvegarde.'
      const errors = err?.response?.data?.errors
      if (errors) {
        const first = Object.values(errors)[0]?.[0]
        toast.error(first ?? msg)
      } else {
        toast.error(msg)
      }
    },
  })

  const handleSave = () => {
    if (!name.trim()) return toast.error('Donnez un nom au template.')
    if (sections.length === 0) return toast.error('Ajoutez au moins une section.')
    saveMut.mutate({ name: name.trim(), frequency, schema: sections })
  }

  // === Section helpers ===
  const addSection = () => setSections([...sections, { title: 'Nouvelle section', fields: [] }])
  const updateSection = (i, patch) => setSections(sections.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  const removeSection = (i) => setSections(sections.filter((_, idx) => idx !== i))
  const moveSection = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= sections.length) return
    const next = [...sections]
    ;[next[i], next[j]] = [next[j], next[i]]
    setSections(next)
  }

  // === Field helpers ===
  const addField = (sIdx, type = 'text') => {
    const next = [...sections]
    const baseLabel = FIELD_TYPES.find((t) => t.value === type)?.label ?? 'Champ'
    const newField = { key: slugify(`${baseLabel}_${next[sIdx].fields.length + 1}`), label: baseLabel, type }
    if (type === 'select' || type === 'checkbox-group') newField.options = [{ value: 'opt1', label: 'Option 1' }]
    if (type === 'table') {
      newField.rows = [{ key: 'ligne_1', label: 'Ligne 1' }]
      newField.columns = [{ key: 'col_1', label: 'Colonne 1', type: 'text' }]
    }
    next[sIdx] = { ...next[sIdx], fields: [...next[sIdx].fields, newField] }
    setSections(next)
  }
  const updateField = (sIdx, fIdx, patch) => {
    const next = [...sections]
    const fields = [...next[sIdx].fields]
    fields[fIdx] = { ...fields[fIdx], ...patch }
    // Si le label change, on resynchronise la key si l'utilisateur ne l'a pas customisée.
    if (patch.label && !patch.key && fields[fIdx]._keyTouched !== true) {
      fields[fIdx].key = slugify(patch.label)
    }
    next[sIdx] = { ...next[sIdx], fields }
    setSections(next)
  }
  const removeField = (sIdx, fIdx) => {
    const next = [...sections]
    next[sIdx] = { ...next[sIdx], fields: next[sIdx].fields.filter((_, i) => i !== fIdx) }
    setSections(next)
  }
  const moveField = (sIdx, fIdx, dir) => {
    const next = [...sections]
    const fields = [...next[sIdx].fields]
    const j = fIdx + dir
    if (j < 0 || j >= fields.length) return
    ;[fields[fIdx], fields[j]] = [fields[j], fields[fIdx]]
    next[sIdx] = { ...next[sIdx], fields }
    setSections(next)
  }

  // Aperçu — schema sans propriétés internes _keyTouched.
  const previewSchema = useMemo(() =>
    sections.map((s) => ({
      ...s,
      fields: s.fields.map(({ _keyTouched, ...rest }) => rest),
    })),
    [sections],
  )

  if (isLoading) {
    return <p className="text-sm" style={{ color: 'var(--adm-text-muted)' }}>Chargement du template…</p>
  }

  return (
    <div className="space-y-5">
      <Link to={`/admin/departements/${departmentId}`} className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--adm-text-muted)' }}>
        <ArrowLeft size={14} /> Retour au département
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>
            <Layers size={18} className="inline mr-2" />
            Template de rapport — {dept?.name ?? 'Département'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Conçois le formulaire que le gouverneur remplira pour chaque rapport.
            {template && <> Version actuelle : <strong>v{template.version}</strong></>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPreview((v) => !v)} className="adm-btn adm-btn-secondary">
            {showPreview ? <><EyeOff size={14} /> Cacher aperçu</> : <><Eye size={14} /> Voir aperçu</>}
          </button>
          <button onClick={handleSave} disabled={saveMut.isPending} className="adm-btn adm-btn-primary">
            <Save size={14} /> {saveMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </header>

      <div className={showPreview ? 'grid grid-cols-1 lg:grid-cols-2 gap-5' : ''}>
        {/* === Édition === */}
        <div className="space-y-4">
          {/* Méta template */}
          <section className="adm-card p-4 sm:p-5 space-y-3">
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--adm-text-faint)' }}>Nom du template</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="adm-input w-full" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--adm-text-faint)' }}>Fréquence</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="adm-input w-full sm:w-auto">
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
              </select>
            </div>
          </section>

          {/* Sections */}
          {sections.map((section, sIdx) => (
            <section key={sIdx} className="adm-card p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSection(sIdx, { title: e.target.value })}
                  placeholder="Titre de la section"
                  className="adm-input flex-1 font-semibold"
                />
                <button onClick={() => moveSection(sIdx, -1)} disabled={sIdx === 0} className="adm-btn-icon" title="Monter"><ChevronUp size={14} /></button>
                <button onClick={() => moveSection(sIdx, +1)} disabled={sIdx === sections.length - 1} className="adm-btn-icon" title="Descendre"><ChevronDown size={14} /></button>
                <button onClick={() => removeSection(sIdx)} className="adm-btn-icon" title="Supprimer la section" style={{ color: '#b91c1c' }}><Trash2 size={14} /></button>
              </div>

              {/* Fields */}
              {section.fields.map((field, fIdx) => (
                <FieldEditor
                  key={fIdx}
                  field={field}
                  onChange={(patch) => updateField(sIdx, fIdx, patch)}
                  onRemove={() => removeField(sIdx, fIdx)}
                  onMoveUp={() => moveField(sIdx, fIdx, -1)}
                  onMoveDown={() => moveField(sIdx, fIdx, +1)}
                  isFirst={fIdx === 0}
                  isLast={fIdx === section.fields.length - 1}
                />
              ))}

              <AddFieldMenu onAdd={(type) => addField(sIdx, type)} />
            </section>
          ))}

          <button onClick={addSection} className="adm-btn adm-btn-secondary w-full">
            <Plus size={14} /> Ajouter une section
          </button>
        </div>

        {/* === Aperçu === */}
        {showPreview && (
          <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
            <div className="adm-card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--adm-text-faint)' }}>
                  Aperçu en temps réel
                </p>
                <span className="text-xs" style={{ color: 'var(--adm-text-faint)' }}>
                  Vue du formulaire que le gouverneur remplira
                </span>
              </div>
              {/* L'aperçu se rend sur fond clair pour rester lisible dans l'admin.
                  Le scope sombre ne sera activé que dans l'espace gouverneur réel. */}
              <div
                className="rounded-lg overflow-hidden border"
                style={{ background: 'var(--adm-bg)', borderColor: 'var(--adm-border)' }}
              >
                <div className="p-4">
                  <ReportFormRenderer
                    schema={previewSchema}
                    values={previewValues}
                    onChange={setPreviewValues}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FieldEditor — édition d'un champ individuel
// ─────────────────────────────────────────────────────────────────────────────
function FieldEditor({ field, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const isOptionType = field.type === 'select' || field.type === 'checkbox-group'
  const isTable      = field.type === 'table'

  return (
    <div className="rounded-lg p-3 sm:p-4 border" style={{ background: 'var(--adm-bg-soft)', borderColor: 'var(--adm-border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Libellé du champ"
          className="adm-input flex-1"
        />
        <select
          value={field.type}
          onChange={(e) => onChange({ type: e.target.value })}
          className="adm-input"
        >
          {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button onClick={onMoveUp} disabled={isFirst} className="adm-btn-icon"><ChevronUp size={14} /></button>
        <button onClick={onMoveDown} disabled={isLast} className="adm-btn-icon"><ChevronDown size={14} /></button>
        <button onClick={onRemove} className="adm-btn-icon" style={{ color: '#b91c1c' }}><Trash2 size={14} /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--adm-text-muted)' }}>
          <input type="checkbox" checked={!!field.required} onChange={(e) => onChange({ required: e.target.checked })} />
          Requis
        </label>
        <input
          type="text"
          value={field.key ?? ''}
          onChange={(e) => onChange({ key: slugify(e.target.value), _keyTouched: true })}
          placeholder="clé technique"
          className="adm-input text-xs"
        />
        <input
          type="text"
          value={field.placeholder ?? ''}
          onChange={(e) => onChange({ placeholder: e.target.value })}
          placeholder="placeholder (optionnel)"
          className="adm-input text-xs"
        />
      </div>

      {isOptionType && (
        <OptionsEditor options={field.options ?? []} onChange={(options) => onChange({ options })} />
      )}

      {isTable && (
        <TableSchemaEditor
          rows={field.rows ?? []}
          columns={field.columns ?? []}
          onRowsChange={(rows) => onChange({ rows })}
          onColsChange={(columns) => onChange({ columns })}
        />
      )}
    </div>
  )
}

function OptionsEditor({ options, onChange }) {
  const update = (i, patch) => onChange(options.map((o, idx) => idx === i ? { ...o, ...patch } : o))
  const add = () => onChange([...options, { value: `opt${options.length + 1}`, label: `Option ${options.length + 1}` }])
  const remove = (i) => onChange(options.filter((_, idx) => idx !== i))

  return (
    <div className="mt-3 space-y-1">
      <p className="text-xs" style={{ color: 'var(--adm-text-faint)' }}>Options :</p>
      {options.map((o, i) => (
        <div key={i} className="flex gap-2">
          <input value={o.label} onChange={(e) => update(i, { label: e.target.value, value: slugify(e.target.value) })} placeholder="Libellé" className="adm-input text-xs flex-1" />
          <button onClick={() => remove(i)} className="adm-btn-icon" style={{ color: '#b91c1c' }}><Trash2 size={12} /></button>
        </div>
      ))}
      <button onClick={add} className="adm-btn adm-btn-secondary text-xs"><Plus size={12} /> Ajouter une option</button>
    </div>
  )
}

function TableSchemaEditor({ rows, columns, onRowsChange, onColsChange }) {
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1">
        <p className="text-xs" style={{ color: 'var(--adm-text-faint)' }}>Lignes :</p>
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={r.label}
              onChange={(e) => onRowsChange(rows.map((x, idx) => idx === i ? { label: e.target.value, key: slugify(e.target.value) } : x))}
              placeholder="Libellé ligne"
              className="adm-input text-xs flex-1"
            />
            <button onClick={() => onRowsChange(rows.filter((_, idx) => idx !== i))} className="adm-btn-icon" style={{ color: '#b91c1c' }}><Trash2 size={12} /></button>
          </div>
        ))}
        <button
          onClick={() => onRowsChange([...rows, { key: slugify(`ligne_${rows.length + 1}`), label: `Ligne ${rows.length + 1}` }])}
          className="adm-btn adm-btn-secondary text-xs"
        >
          <Plus size={12} /> Ligne
        </button>
      </div>
      <div className="space-y-1">
        <p className="text-xs" style={{ color: 'var(--adm-text-faint)' }}>Colonnes :</p>
        {columns.map((c, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={c.label}
              onChange={(e) => onColsChange(columns.map((x, idx) => idx === i ? { ...x, label: e.target.value, key: slugify(e.target.value) } : x))}
              placeholder="Libellé colonne"
              className="adm-input text-xs flex-1"
            />
            <select
              value={c.type}
              onChange={(e) => onColsChange(columns.map((x, idx) => idx === i ? { ...x, type: e.target.value } : x))}
              className="adm-input text-xs"
            >
              <option value="text">Texte</option>
              <option value="number">Nombre</option>
              <option value="time">Heure</option>
              <option value="yesno">Oui/Non</option>
              <option value="select">Liste</option>
            </select>
            <button onClick={() => onColsChange(columns.filter((_, idx) => idx !== i))} className="adm-btn-icon" style={{ color: '#b91c1c' }}><Trash2 size={12} /></button>
          </div>
        ))}
        <button
          onClick={() => onColsChange([...columns, { key: slugify(`col_${columns.length + 1}`), label: `Colonne ${columns.length + 1}`, type: 'text' }])}
          className="adm-btn adm-btn-secondary text-xs"
        >
          <Plus size={12} /> Colonne
        </button>
      </div>
    </div>
  )
}

function AddFieldMenu({ onAdd }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="adm-btn adm-btn-secondary text-sm">
        <Plus size={14} /> Ajouter un champ
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-64 rounded-lg shadow-lg border" style={{ background: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
          <div className="p-1 max-h-72 overflow-y-auto">
            {FIELD_TYPES.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.value}
                  onClick={() => { onAdd(t.value); setOpen(false) }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  style={{ color: 'var(--adm-text)' }}
                >
                  <Icon size={14} /> {t.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * normalizeSchema : accepte les 2 formats (sections OU flat) et retourne toujours
 * un tableau de sections. Schemas legacy flat → enveloppés dans une section unique.
 */
function normalizeSchema(schema) {
  if (!Array.isArray(schema) || schema.length === 0) return []
  if (schema[0]?.fields) return schema
  return [{ title: 'Données', fields: schema }]
}
