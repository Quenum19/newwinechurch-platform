/**
 * SafeBoundary — Error Boundary React classique.
 *
 * Isole un sous-arbre de composant : si un composant enfant throw pendant
 * le render, on affiche `fallback` (par défaut null) au lieu de laisser
 * l'erreur remonter jusqu'à la racine et faire disparaître toute la page.
 *
 * Utile pour les widgets non-critiques (MyStaffAssignments, KpiCards, etc.)
 * qui ne doivent JAMAIS pouvoir crasher le dashboard entier s'ils échouent.
 */
import { Component } from 'react'

export default class SafeBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Log en console pour debug — mais on n'expose rien à l'utilisateur.
    if (typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn('[SafeBoundary] Composant en erreur:', error?.message, info?.componentStack)
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null
    return this.props.children
  }
}
