/**
 * ==============================================================
 *  NEW WINE CHURCH — Routeur principal
 *
 *  - Public sous PublicLayout
 *  - Auth sous AuthLayout
 *  - /mon-espace/*    (membre)        sous MemberLayout
 *  - /gouverneur/*    (lazy, rôle gouverneur) sous MemberLayout (sidebar adaptée)
 *  - /leader/*        (lazy, rôle leader)     sous MemberLayout (sidebar adaptée)
 *  - /admin/*         (lazy, staff)           sous AdminLayout
 *
 *  /espace-perso redirige selon rôle (gouverneur > leader > membre).
 * ==============================================================
 */
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

// === Public (eager) ===
import PublicLayout from './layouts/PublicLayout.jsx'
import Home from './pages/public/Home.jsx'
import SermonsPage from './pages/public/SermonsPage.jsx'
import SermonDetail from './pages/public/SermonDetail.jsx'
import EventsPage from './pages/public/EventsPage.jsx'
import EventDetail from './pages/public/EventDetail.jsx'
import BlogPage from './pages/public/BlogPage.jsx'
import BlogPostDetail from './pages/public/BlogPostDetail.jsx'
import CommunityPage from './pages/public/CommunityPage.jsx'
import DepartmentDetailPublic from './pages/public/DepartmentDetail.jsx'
import DonatePage from './pages/public/DonatePage.jsx'
import ContactPage from './pages/public/ContactPage.jsx'
import LivePage from './pages/public/LivePage.jsx'
import GalleryPage from './pages/public/GalleryPage.jsx'
import NotFound from './pages/public/NotFound.jsx'

// === Auth ===
import AuthLayout from './layouts/AuthLayout.jsx'
import LoginPage from './pages/auth/LoginPage.jsx'
import RegisterPage from './pages/auth/RegisterPage.jsx'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx'
import ForceChangePasswordPage from './pages/auth/ForceChangePasswordPage.jsx'

// === Espace membre (eager) ===
import MemberLayout from './layouts/MemberLayout.jsx'
import MyDashboard from './pages/member/MyDashboard.jsx'
import MyProfile from './pages/member/MyProfile.jsx'
import ChangePasswordPage from './pages/member/ChangePasswordPage.jsx'
import MyDonations from './pages/member/MyDonations.jsx'
import MyEvents from './pages/member/MyEvents.jsx'
import MyCell from './pages/member/MyCell.jsx'

// === Espace gouverneur — LAZY ===
const GovDashboard  = lazy(() => import('./pages/governor/GovDashboard.jsx'))
const GovDepartment = lazy(() => import('./pages/governor/GovDepartment.jsx'))
const GovMembers    = lazy(() => import('./pages/governor/GovMembers.jsx'))
const GovCells      = lazy(() => import('./pages/governor/GovCells.jsx'))
const GovCellDetail = lazy(() => import('./pages/governor/GovCellDetail.jsx'))
const GovReports    = lazy(() => import('./pages/governor/GovReports.jsx'))
const GovReportForm = lazy(() => import('./pages/governor/GovReportForm.jsx'))
const GovAnalytics  = lazy(() => import('./pages/governor/GovAnalytics.jsx'))

// === Espace leader — LAZY ===
const LeaderDashboard  = lazy(() => import('./pages/leader/LeaderDashboard.jsx'))
const LeaderCell       = lazy(() => import('./pages/leader/LeaderCell.jsx'))
const LeaderAttendance = lazy(() => import('./pages/leader/LeaderAttendance.jsx'))
const LeaderReports    = lazy(() => import('./pages/leader/LeaderReports.jsx'))
const LeaderReportForm = lazy(() => import('./pages/leader/LeaderReportForm.jsx'))

// === Admin — LAZY ===
const AdminLayout       = lazy(() => import('./layouts/AdminLayout.jsx'))
const AdminDashboard    = lazy(() => import('./pages/admin/AdminDashboard.jsx'))
const MembersList       = lazy(() => import('./pages/admin/MembersList.jsx'))
const MemberDetail      = lazy(() => import('./pages/admin/MemberDetail.jsx'))
const MemberCreate      = lazy(() => import('./pages/admin/MemberCreate.jsx'))
const DepartmentsList   = lazy(() => import('./pages/admin/DepartmentsList.jsx'))
const DepartmentDetail  = lazy(() => import('./pages/admin/DepartmentDetail.jsx'))
const DepartmentCreate  = lazy(() => import('./pages/admin/DepartmentCreate.jsx'))
const CellsList         = lazy(() => import('./pages/admin/CellsList.jsx'))
const CellDetail        = lazy(() => import('./pages/admin/CellDetail.jsx'))
const CellCreate        = lazy(() => import('./pages/admin/CellCreate.jsx'))
const UsersAdminPage    = lazy(() => import('./pages/admin/UsersAdminPage.jsx'))
const DonationsList     = lazy(() => import('./pages/admin/DonationsList.jsx'))
const DonationMethodsPage = lazy(() => import('./pages/admin/DonationMethodsPage.jsx'))
const AuthImagesPage      = lazy(() => import('./pages/admin/AuthImagesPage.jsx'))
const MembershipRequestsPage = lazy(() => import('./pages/admin/MembershipRequestsPage.jsx'))
const SettingsPage      = lazy(() => import('./pages/admin/SettingsPage.jsx'))
const SermonsList       = lazy(() => import('./pages/admin/SermonsList.jsx'))
const SermonForm        = lazy(() => import('./pages/admin/SermonForm.jsx'))
const EventsList        = lazy(() => import('./pages/admin/EventsList.jsx'))
const EventForm         = lazy(() => import('./pages/admin/EventForm.jsx'))
const EventRegistrations = lazy(() => import('./pages/admin/EventRegistrations.jsx'))
const PostsList         = lazy(() => import('./pages/admin/PostsList.jsx'))
const PostForm          = lazy(() => import('./pages/admin/PostForm.jsx'))
const MediaGalleryPage  = lazy(() => import('./pages/admin/MediaGalleryPage.jsx'))
const PrayersList       = lazy(() => import('./pages/admin/PrayersList.jsx'))
const NewsletterPage    = lazy(() => import('./pages/admin/NewsletterPage.jsx'))
const ActivityLogPage   = lazy(() => import('./pages/admin/ActivityLogPage.jsx'))
const AdminReportsList  = lazy(() => import('./pages/admin/AdminReportsList.jsx'))
const AdminReportDetail = lazy(() => import('./pages/admin/AdminReportDetail.jsx'))
const ReportTemplateBuilder = lazy(() => import('./pages/admin/ReportTemplateBuilder.jsx'))

import { AuthGuard, FullPageSpinner } from './components/AuthGuard.jsx'
import { useLiveBootstrap } from './hooks/useLive.js'
import { useAuthStore } from './store/authStore.js'

/** Redirige /departements/:slug → /communaute/:slug en conservant le slug. */
function RedirectDeptSlug() {
  const { slug } = useParams()
  return <Navigate to={`/communaute/${slug}`} replace />
}

/** Redirige /espace-perso vers le bon dashboard selon le rôle.
 *
 * Priorité (un user peut avoir plusieurs rôles, cumul gouverneur+leader autorisé) :
 *   1. gouverneur → /gouverneur (même s'il est aussi leader — il peut switcher)
 *   2. leader (sans gouverneur) → /leader
 *   3. staff (admin/pasteur/rh/superadmin) → /admin
 *   4. autres → /mon-espace (membre)
 */
function SmartAreaRedirect() {
  // Lecture directe des rôles (plus robuste qu'un appel de méthode store
  // avec optional chaining — l'optional chaining ne nous protège pas d'un
  // rôle absent, et le test d'inclusion est trivial et déterministe).
  const roles = useAuthStore((s) => s.roles) ?? []
  if (roles.includes('gouverneur')) return <Navigate to="/gouverneur" replace />
  if (roles.includes('leader'))     return <Navigate to="/leader" replace />
  if (['superadmin', 'admin', 'admin-site', 'pasteur', 'rh'].some((r) => roles.includes(r)))
    return <Navigate to="/admin" replace />
  return <Navigate to="/mon-espace" replace />
}

export default function App() {
  useLiveBootstrap()

  return (
    <>
      <Toaster
        toastOptions={{
          style: {
            background: '#1A1A1A',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
      <Routes>
        {/* === PUBLIC === */}
        <Route element={<PublicLayout />}>
          <Route path="/"                    element={<Home />} />
          <Route path="/messages"            element={<SermonsPage />} />
          <Route path="/messages/:slug"      element={<SermonDetail />} />
          <Route path="/evenements"          element={<EventsPage />} />
          <Route path="/evenements/:slug"    element={<EventDetail />} />
          <Route path="/blog"                element={<BlogPage />} />
          <Route path="/blog/:slug"          element={<BlogPostDetail />} />
          <Route path="/galerie"             element={<GalleryPage />} />
          <Route path="/communaute"          element={<CommunityPage />} />
          <Route path="/communaute/:slug"    element={<DepartmentDetailPublic />} />
          <Route path="/donner"              element={<DonatePage />} />
          <Route path="/contact"             element={<ContactPage />} />
          <Route path="/live"                element={<LivePage />} />
        </Route>

        {/* === AUTH === */}
        <Route element={<AuthLayout />}>
          <Route path="/connexion"                  element={<LoginPage />} />
          <Route path="/rejoindre"                  element={<RegisterPage />} />
          <Route path="/mot-de-passe-oublie"        element={<ForgotPasswordPage />} />
          <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
        </Route>

        {/* Force-change pwd : page autonome (pas dans AuthLayout, sans hero image)
            Affichée quand l'utilisateur a `must_change_password=true`. */}
        <Route
          path="/changer-mot-de-passe"
          element={
            <AuthGuard>
              <ForceChangePasswordPage />
            </AuthGuard>
          }
        />

        {/* Smart redirect : /espace-perso → bonne aire selon rôle */}
        <Route
          path="/espace-perso"
          element={
            <AuthGuard>
              <SmartAreaRedirect />
            </AuthGuard>
          }
        />

        {/* === ESPACE MEMBRE === */}
        <Route element={<AuthGuard><MemberLayout /></AuthGuard>}>
          <Route path="/mon-espace"                element={<MyDashboard />} />
          <Route path="/mon-espace/profil"         element={<MyProfile />} />
          <Route path="/mon-espace/mot-de-passe"   element={<ChangePasswordPage />} />
          <Route path="/mon-espace/mes-dons"       element={<MyDonations />} />
          <Route path="/mon-espace/mes-evenements" element={<MyEvents />} />
          <Route path="/mon-espace/ma-cellule"     element={<MyCell />} />
        </Route>

        {/* === ESPACE GOUVERNEUR === */}
        <Route
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <AuthGuard role="gouverneur">
                <MemberLayout />
              </AuthGuard>
            </Suspense>
          }
        >
          <Route path="/gouverneur"                       element={<GovDashboard />} />
          <Route path="/gouverneur/departement"           element={<GovDepartment />} />
          <Route path="/gouverneur/membres"               element={<GovMembers />} />
          <Route path="/gouverneur/cellules"              element={<GovCells />} />
          <Route path="/gouverneur/cellules/:id"          element={<GovCellDetail />} />
          <Route path="/gouverneur/rapports"              element={<GovReports />} />
          <Route path="/gouverneur/rapports/nouveau"      element={<GovReportForm />} />
          <Route path="/gouverneur/rapports/:id"          element={<GovReportForm />} />
          <Route path="/gouverneur/analytics"             element={<GovAnalytics />} />
        </Route>

        {/* === ESPACE LEADER === */}
        <Route
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <AuthGuard role="leader">
                <MemberLayout />
              </AuthGuard>
            </Suspense>
          }
        >
          <Route path="/leader"                  element={<LeaderDashboard />} />
          <Route path="/leader/cellule"          element={<LeaderCell />} />
          <Route path="/leader/presences"        element={<LeaderAttendance />} />
          <Route path="/leader/rapports"         element={<LeaderReports />} />
          <Route path="/leader/rapports/nouveau" element={<LeaderReportForm />} />
          <Route path="/leader/rapports/:id"     element={<LeaderReportForm />} />
        </Route>

        {/* === ADMIN === */}
        <Route
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <AuthGuard staffOnly>
                <AdminLayout />
              </AuthGuard>
            </Suspense>
          }
        >
          <Route path="/admin"                            element={<AdminDashboard />} />
          <Route path="/admin/membres"                    element={<MembersList />} />
          <Route path="/admin/membres/nouveau"            element={<MemberCreate />} />
          <Route path="/admin/membres/:id"                element={<MemberDetail />} />
          <Route path="/admin/departements"               element={<DepartmentsList />} />
          <Route path="/admin/departements/nouveau"       element={<DepartmentCreate />} />
          <Route path="/admin/departements/:id"           element={<DepartmentDetail />} />
          <Route path="/admin/departements/:id/template"  element={<ReportTemplateBuilder />} />
          <Route path="/admin/rapports-departement"       element={<AdminReportsList />} />
          <Route path="/admin/rapports-departement/:id"   element={<AdminReportDetail />} />
          <Route path="/admin/cellules"                   element={<CellsList />} />
          <Route path="/admin/cellules/nouveau"           element={<CellCreate />} />
          <Route path="/admin/cellules/:id"               element={<CellDetail />} />
          <Route path="/admin/utilisateurs"               element={<UsersAdminPage />} />
          <Route path="/admin/dons"                       element={<DonationsList />} />
          <Route path="/admin/methodes-don"               element={<DonationMethodsPage />} />
          <Route path="/admin/images-auth"                element={<AuthImagesPage />} />
          <Route path="/admin/demandes-adhesion"          element={<MembershipRequestsPage />} />
          <Route path="/admin/parametres"                 element={<SettingsPage />} />
          <Route path="/admin/sermons"                    element={<SermonsList />} />
          <Route path="/admin/sermons/nouveau"            element={<SermonForm />} />
          <Route path="/admin/sermons/:id"                element={<SermonForm />} />
          <Route path="/admin/evenements"                 element={<EventsList />} />
          <Route path="/admin/evenements/nouveau"         element={<EventForm />} />
          <Route path="/admin/evenements/:id"             element={<EventForm />} />
          <Route path="/admin/evenements/:id/inscrits"    element={<EventRegistrations />} />
          <Route path="/admin/blog"                       element={<PostsList />} />
          <Route path="/admin/blog/nouveau"               element={<PostForm />} />
          <Route path="/admin/blog/:id"                   element={<PostForm />} />
          <Route path="/admin/galerie"                    element={<MediaGalleryPage />} />
          <Route path="/admin/prieres"                    element={<PrayersList />} />
          <Route path="/admin/newsletter"                 element={<NewsletterPage />} />
          <Route path="/admin/journal"                    element={<ActivityLogPage />} />
          <Route path="/admin/profil"                     element={<MyProfile />} />
          <Route path="/admin/mot-de-passe"               element={<ChangePasswordPage />} />
        </Route>

        {/* Aliases anglais → FR */}
        <Route path="/login"    element={<Navigate to="/connexion" replace />} />
        <Route path="/register" element={<Navigate to="/rejoindre" replace />} />

        {/* Étape 5 — alias /departements → communauté (liste publique des dépts) */}
        <Route path="/departements"        element={<Navigate to="/communaute" replace />} />
        <Route path="/departements/:slug"  element={<RedirectDeptSlug />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
