/**
 * useSeoMeta — gestion légère des meta SEO/OpenGraph sans dépendance.
 *
 * Injecte / met à jour : <title>, meta[name=description], meta[property=og:*],
 * meta[name=twitter:*]. Au unmount, ne nettoie pas (la page suivante les
 * écrasera). Cleanup auto sur navigation puisque chaque page appelle ce hook.
 *
 * Usage :
 *   useSeoMeta({ title: 'Galerie | NWC', description: '...', image: '...', url })
 */
import { useEffect } from 'react'

function setMeta(key, attr, value) {
  if (value === null || value === undefined) return
  let el = document.head.querySelector(`meta[${key}="${attr}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(key, attr)
    document.head.appendChild(el)
  }
  el.setAttribute('content', String(value))
}

export function useSeoMeta({
  title,
  description,
  image,
  url,
  type = 'website',
  siteName = 'New Wine Church',
} = {}) {
  useEffect(() => {
    if (title) {
      document.title = title
    }
    if (description) {
      setMeta('name', 'description', description)
      setMeta('property', 'og:description', description)
      setMeta('name', 'twitter:description', description)
    }
    if (title) {
      setMeta('property', 'og:title', title)
      setMeta('name', 'twitter:title', title)
    }
    if (image) {
      setMeta('property', 'og:image', image)
      setMeta('name', 'twitter:image', image)
    }
    if (url) {
      setMeta('property', 'og:url', url)
    }
    setMeta('property', 'og:type', type)
    setMeta('property', 'og:site_name', siteName)
    setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
  }, [title, description, image, url, type, siteName])
}
