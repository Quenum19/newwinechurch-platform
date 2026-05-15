/**
 * ReportFormRenderer — rend un formulaire dynamique depuis un schéma JSON.
 *
 * Deux formats supportés :
 *
 *   1) Format SECTIONS (nouveau, depuis Étape 5 Templates DB) :
 *      [
 *        { title: 'Identité', fields: [ {key, label, type, ...}, ... ] },
 *        { title: 'Programmes', fields: [ {key, type: 'table', rows, columns}, ... ] },
 *      ]
 *
 *   2) Format FLAT (legacy) : [ {key, label, type, ...}, ... ]
 *
 * Types de champs :
 *   text · textarea · number · date · time · datetime · select · yesno · checkbox · checkbox-group · table
 *
 * Valeurs : objet plat { [key]: value }. Pour `table`, value = { [rowKey]: { [colKey]: cellValue } }
 * onChange(newValues) appelé à chaque modif (parent gère l'auto-save).
 */
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

const baseInput =
  'w-full rounded-lg bg-ink-950 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition'

export default function ReportFormRenderer({
  schema = [],
  values = {},
  onChange,
  errors = {},
  disabled = false,
}) {
  const { t } = useTranslation()
  const set = useCallback(
    (key, value) => {
      onChange?.({ ...values, [key]: value })
    },
    [values, onChange],
  )

  if (!Array.isArray(schema) || schema.length === 0) {
    return <p className="text-white/50 text-sm">{t('reportForm.noFields', 'Aucun champ à afficher.')}</p>
  }

  // Détection du format : si le 1er élément a `fields`, c'est SECTIONS.
  const isSectioned = schema.length > 0 && Array.isArray(schema[0]?.fields)

  if (isSectioned) {
    return (
      <div className="space-y-6">
        {schema.map((section, idx) => (
          <section
            key={section.title ?? `section-${idx}`}
            className="rounded-xl border border-white/10 bg-ink-900/40 p-4 sm:p-5"
          >
            {section.title && (
              <h3 className="text-sm font-semibold text-gold-400 uppercase tracking-wider mb-4">
                {section.title}
              </h3>
            )}
            <div className="space-y-5">
              {(section.fields ?? []).map((field) => (
                <FieldRenderer
                  key={field.key}
                  field={field}
                  value={values[field.key]}
                  error={errors[field.key]}
                  disabled={disabled}
                  onSet={set}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {schema.map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          value={values[field.key]}
          error={errors[field.key]}
          disabled={disabled}
          onSet={set}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FieldRenderer — un seul champ (utilisé par les deux formats)
// ─────────────────────────────────────────────────────────────────────────────
function FieldRenderer({ field, value, error, disabled, onSet }) {
  const { t } = useTranslation()
  const v = value
  const err = error

  return (
    <div>
      <label htmlFor={`fld-${field.key}`} className="block text-sm text-white/80 mb-1.5">
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </label>

      {field.type === 'textarea' && (
        <textarea
          id={`fld-${field.key}`}
          value={v ?? ''}
          disabled={disabled}
          rows={field.rows ?? 4}
          placeholder={field.placeholder}
          maxLength={field.max}
          onChange={(e) => onSet(field.key, e.target.value)}
          className={cn(baseInput, 'resize-y min-h-[100px]')}
        />
      )}

      {field.type === 'number' && (
        <input
          id={`fld-${field.key}`}
          type="number"
          value={v ?? ''}
          min={field.min}
          max={field.max}
          disabled={disabled}
          onChange={(e) => onSet(field.key, e.target.value === '' ? null : Number(e.target.value))}
          className={baseInput}
        />
      )}

      {field.type === 'date' && (
        <input
          id={`fld-${field.key}`}
          type="date"
          value={v ?? ''}
          disabled={disabled}
          onChange={(e) => onSet(field.key, e.target.value)}
          className={baseInput}
        />
      )}

      {field.type === 'time' && (
        <input
          id={`fld-${field.key}`}
          type="time"
          value={v ?? ''}
          disabled={disabled}
          onChange={(e) => onSet(field.key, e.target.value)}
          className={baseInput}
        />
      )}

      {field.type === 'datetime' && (
        <input
          id={`fld-${field.key}`}
          type="datetime-local"
          value={v ?? ''}
          disabled={disabled}
          onChange={(e) => onSet(field.key, e.target.value)}
          className={baseInput}
        />
      )}

      {field.type === 'select' && (
        <select
          id={`fld-${field.key}`}
          value={v ?? ''}
          disabled={disabled}
          onChange={(e) => onSet(field.key, e.target.value)}
          className={baseInput}
        >
          <option value="">{t('reportForm.selectPlaceholder', '— Sélectionner —')}</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value ?? o} value={o.value ?? o}>
              {o.label ?? o}
            </option>
          ))}
        </select>
      )}

      {field.type === 'yesno' && (
        <div className="flex gap-3">
          {[
            { value: 'oui', label: t('common.yes', 'Oui') },
            { value: 'non', label: t('common.no', 'Non') },
          ].map((opt) => {
            const checked = v === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => onSet(field.key, checked ? null : opt.value)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition border',
                  checked
                    ? 'bg-gold-500 text-ink-950 border-gold-500'
                    : 'bg-ink-950 text-white/70 border-white/10 hover:border-gold-500/50',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}

      {field.type === 'checkbox' && (
        <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
          <input
            type="checkbox"
            checked={!!v}
            disabled={disabled}
            onChange={(e) => onSet(field.key, e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-ink-950 text-gold-500 focus:ring-gold-500"
          />
          {field.checkboxLabel ?? field.label}
        </label>
      )}

      {field.type === 'checkbox-group' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(field.options ?? []).map((o) => {
            const val = o.value ?? o
            const label = o.label ?? o
            const checked = Array.isArray(v) && v.includes(val)
            return (
              <label
                key={val}
                className="flex items-center gap-2 text-sm text-white/80 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => {
                    const arr = Array.isArray(v) ? [...v] : []
                    onSet(
                      field.key,
                      checked ? arr.filter((x) => x !== val) : [...arr, val],
                    )
                  }}
                  className="h-4 w-4 rounded border-white/20 bg-ink-950 text-gold-500 focus:ring-gold-500"
                />
                {label}
              </label>
            )
          })}
        </div>
      )}

      {field.type === 'table' && (
        <TableField
          field={field}
          value={v}
          disabled={disabled}
          onSet={(newTableValue) => onSet(field.key, newTableValue)}
        />
      )}

      {(!field.type || field.type === 'text') && (
        <input
          id={`fld-${field.key}`}
          type="text"
          value={v ?? ''}
          placeholder={field.placeholder}
          maxLength={field.max}
          disabled={disabled}
          onChange={(e) => onSet(field.key, e.target.value)}
          className={baseInput}
        />
      )}

      {field.help && <p className="mt-1 text-xs text-white/40">{field.help}</p>}
      {err && <p className="mt-1 text-xs text-red-400">{err}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TableField — tableau à lignes fixes × colonnes typées
//   field.rows    : [{key, label}, ...]
//   field.columns : [{key, label, type}, ...]
//   value         : { [rowKey]: { [colKey]: cellValue } }
// ─────────────────────────────────────────────────────────────────────────────
function TableField({ field, value, disabled, onSet }) {
  const { t } = useTranslation()
  const rows = field.rows ?? []
  const cols = field.columns ?? []
  const tableValue = value ?? {}

  const setCell = (rowKey, colKey, cellValue) => {
    onSet({
      ...tableValue,
      [rowKey]: { ...(tableValue[rowKey] ?? {}), [colKey]: cellValue },
    })
  }

  return (
    <>
      {/* Desktop : tableau classique */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-ink-950/80">
            <tr>
              <th className="text-left text-white/70 font-medium px-3 py-2 border-b border-white/10">
                {t('reportForm.program', 'Programme')}
              </th>
              {cols.map((c) => (
                <th
                  key={c.key}
                  className="text-left text-white/70 font-medium px-3 py-2 border-b border-white/10"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-white/5 last:border-0">
                <td className="px-3 py-2 text-white/90 font-medium">{r.label}</td>
                {cols.map((c) => (
                  <td key={c.key} className="px-2 py-1.5">
                    <TableCell
                      column={c}
                      value={tableValue[r.key]?.[c.key]}
                      disabled={disabled}
                      onChange={(val) => setCell(r.key, c.key, val)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : cards empilées */}
      <div className="md:hidden space-y-3">
        {rows.map((r) => (
          <div
            key={r.key}
            className="rounded-lg border border-white/10 bg-ink-950/60 p-3 space-y-2"
          >
            <p className="text-sm font-semibold text-gold-400">{r.label}</p>
            {cols.map((c) => (
              <div key={c.key}>
                <label className="block text-xs text-white/60 mb-1">{c.label}</label>
                <TableCell
                  column={c}
                  value={tableValue[r.key]?.[c.key]}
                  disabled={disabled}
                  onChange={(val) => setCell(r.key, c.key, val)}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

function TableCell({ column, value, disabled, onChange }) {
  const { t } = useTranslation()
  const inputCls =
    'w-full rounded-md bg-ink-950 border border-white/10 px-2 py-1.5 text-sm text-white placeholder-white/30 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition'

  if (column.type === 'time')
    return (
      <input
        type="time"
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    )

  if (column.type === 'number')
    return (
      <input
        type="number"
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={inputCls}
      />
    )

  if (column.type === 'yesno')
    return (
      <select
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
        className={inputCls}
      >
        <option value="">—</option>
        <option value="oui">{t('common.yes', 'Oui')}</option>
        <option value="non">{t('common.no', 'Non')}</option>
      </select>
    )

  if (column.type === 'select')
    return (
      <select
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
        className={inputCls}
      >
        <option value="">—</option>
        {(column.options ?? []).map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
    )

  // text par défaut
  return (
    <input
      type="text"
      value={value ?? ''}
      placeholder={column.placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  )
}

/**
 * Schéma de secours (utilisé seulement si aucun template n'est défini en DB).
 * Format flat — compatible legacy.
 */
export const DEFAULT_DEPARTMENT_REPORT_SCHEMA = [
  {
    key: 'activities_summary',
    label: 'Résumé des activités du mois',
    type: 'textarea',
    rows: 4,
    max: 2000,
    required: true,
    placeholder: "Réunions, formations, sorties d'évangélisation, événements...",
  },
  {
    key: 'attendance_avg',
    label: 'Présence moyenne aux activités',
    type: 'number',
    min: 0,
    max: 1000,
    help: 'Nombre moyen de personnes par activité.',
  },
  {
    key: 'highlights',
    label: 'Points forts / témoignages',
    type: 'textarea',
    rows: 3,
    max: 1500,
    placeholder: 'Bénédictions, conversions, succès...',
  },
  { key: 'challenges', label: 'Défis rencontrés', type: 'textarea', rows: 3, max: 1500 },
  { key: 'budget_used', label: 'Budget consommé (FCFA)', type: 'number', min: 0 },
  {
    key: 'next_month_plan',
    label: 'Plan pour le mois suivant',
    type: 'textarea',
    rows: 3,
    max: 1500,
    placeholder: 'Objectifs et activités prévues.',
  },
]
