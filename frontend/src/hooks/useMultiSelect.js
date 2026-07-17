/**
 * Hook de sélection multiple réutilisable pour les listes admin.
 *
 * API :
 *   const sel = useMultiSelect()
 *
 *   sel.selected            → Set<number|string>
 *   sel.count               → number
 *   sel.isSelected(id)      → bool
 *   sel.toggle(id, ev?)     → toggle + support shift+click pour sélection range
 *   sel.add(id)             → ajout silencieux
 *   sel.remove(id)          → retrait silencieux
 *   sel.clear()             → vide la sélection
 *   sel.selectAll(ids)      → sélectionne tous les ids du tableau
 *   sel.allSelected(ids)    → tous les ids du tableau sont-ils sélectionnés ?
 *   sel.someSelected(ids)   → au moins un ?
 *   sel.toggleAll(ids)      → tout / rien
 *   sel.ids                 → tableau d'ids (utile pour POST API)
 *
 * Shift+click : pour activer le mode "range", passe l'événement onClick et la
 * liste ORDONNÉE des ids visibles à `toggle(id, ev, orderedIds)`.
 */
import { useCallback, useRef, useState } from 'react'

export default function useMultiSelect(initial = []) {
  const [selected, setSelected] = useState(() => new Set(initial))
  const lastClickedRef = useRef(null)

  const isSelected = useCallback((id) => selected.has(id), [selected])

  const add = useCallback((id) => {
    setSelected((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev); next.add(id); return next
    })
  }, [])

  const remove = useCallback((id) => {
    setSelected((prev) => {
      if (! prev.has(id)) return prev
      const next = new Set(prev); next.delete(id); return next
    })
  }, [])

  const toggle = useCallback((id, ev = null, orderedIds = null) => {
    // Shift+click → sélectionne tous les éléments entre le dernier cliqué et celui-ci.
    if (ev?.shiftKey && lastClickedRef.current != null && Array.isArray(orderedIds)) {
      const from = orderedIds.indexOf(lastClickedRef.current)
      const to   = orderedIds.indexOf(id)
      if (from >= 0 && to >= 0) {
        const [start, end] = from < to ? [from, to] : [to, from]
        const slice = orderedIds.slice(start, end + 1)
        setSelected((prev) => {
          const next = new Set(prev)
          slice.forEach((x) => next.add(x))
          return next
        })
        lastClickedRef.current = id
        return
      }
    }
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    lastClickedRef.current = id
  }, [])

  const clear = useCallback(() => {
    setSelected((prev) => prev.size === 0 ? prev : new Set())
    lastClickedRef.current = null
  }, [])

  const selectAll = useCallback((ids) => {
    setSelected(new Set(ids))
  }, [])

  const allSelected = useCallback((ids) => {
    if (! ids || ids.length === 0) return false
    return ids.every((id) => selected.has(id))
  }, [selected])

  const someSelected = useCallback((ids) => {
    if (! ids || ids.length === 0) return false
    return ids.some((id) => selected.has(id))
  }, [selected])

  const toggleAll = useCallback((ids) => {
    if (! ids || ids.length === 0) return
    const all = ids.every((id) => selected.has(id))
    if (all) {
      // Tous sélectionnés → on retire ceux de la page courante.
      setSelected((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      })
    }
  }, [selected])

  return {
    selected,
    count: selected.size,
    ids: Array.from(selected),
    isSelected,
    toggle,
    add,
    remove,
    clear,
    selectAll,
    allSelected,
    someSelected,
    toggleAll,
  }
}
