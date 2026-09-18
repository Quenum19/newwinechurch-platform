/**
 * Slide — Écran totalement noir (pour laisser la place aux vidéos/direct
 * depuis l'autre ordi via HDMI switch).
 */
export default function NoirSlide() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000000' }} />
  )
}
