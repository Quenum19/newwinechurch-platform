/**
 * Layout des pages publiques NWC : LiveBanner + Navbar + Outlet + Footer.
 * Le bandeau live est sticky en haut quand un live est actif (très visible).
 */
import { Outlet } from 'react-router-dom'
import Navbar from '@/components/public/Navbar.jsx'
import Footer from '@/components/public/Footer.jsx'
import LiveBanner from '@/components/public/LiveBanner.jsx'
import { useLiveStore } from '@/store/liveStore'

export default function PublicLayout() {
  const liveOn = useLiveStore((s) => !! s.current)

  return (
    <div className="min-h-screen flex flex-col bg-public-bone">
      {/* Bandeau live au-dessus du navbar — z-index 60 pour rester visible. */}
      <div className="fixed top-0 inset-x-0 z-[60]">
        <LiveBanner />
      </div>

      <Navbar liveOn={liveOn} />

      {/* Padding top dynamique : nav 4rem mobile / 5rem desktop, +2.5rem si banner. */}
      <main className={liveOn ? 'flex-1 pt-[6.5rem] lg:pt-[7.5rem]' : 'flex-1 pt-16 lg:pt-20'}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
