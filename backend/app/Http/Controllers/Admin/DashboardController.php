<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Cell;
use App\Models\CellReport;
use App\Models\ContactMessage;
use App\Models\Donation;
use App\Models\Event;
use App\Models\PrayerRequest;
use App\Models\Sermon;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Admin → Dashboard (stats globales).
 *
 * Cache 60 secondes pour limiter la charge sur les écrans qui rafraîchissent
 * souvent (idéal sur grand écran d'admin sur mur).
 */
class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->can('view dashboard')) abort(403);

        $stats = Cache::remember('admin:dashboard', 60, function () {
            $now = now();

            // === KPI principaux ===
            $totalMembers = User::count();
            $activeMembers = User::where('status', 'active')->count();
            $pendingMembers = User::where('status', 'pending')->count();
            $verifiedMembers = User::whereNotNull('email_verified_at')->count();

            // Croissance membres (30 derniers jours)
            $newMembersThisMonth = User::where('created_at', '>=', $now->copy()->subDays(30))->count();

            // Dons
            $donationsThisMonth = (float) Donation::where('status', 'completed')
                ->where('created_at', '>=', $now->copy()->startOfMonth())->sum('amount');
            $donationsThisYear = (float) Donation::where('status', 'completed')
                ->where('created_at', '>=', $now->copy()->startOfYear())->sum('amount');
            $pendingDonations = Donation::where('status', 'pending')->count();
            $pendingDonationsAmount = (float) Donation::where('status', 'pending')->sum('amount');

            // Événements
            $upcomingEvents = Event::where('is_published', true)
                ->where('starts_at', '>=', $now)->count();

            // Sermons
            $publishedSermons = Sermon::published()->count();
            $totalSermonViews = (int) Sermon::sum('views_count');

            // Cellules
            $activeCells = Cell::where('status', 'active')->count();
            $pendingReports = CellReport::where('status', 'submitted')->count();

            // Prières non lues / non publiées
            $newPrayers = PrayerRequest::where('is_published', false)
                ->where('created_at', '>=', $now->copy()->subDays(7))->count();

            // Messages de contact non lus
            $unreadContacts = ContactMessage::where('is_read', false)->count();

            // === Séries pour graphiques (12 derniers mois) ===
            $membersGrowth = User::where('created_at', '>=', $now->copy()->subYear()->startOfMonth())
                ->select(DB::raw("DATE_FORMAT(created_at, '%Y-%m') as month"), DB::raw('COUNT(*) as count'))
                ->groupBy('month')->orderBy('month')->get();

            $donationsMonthly = Donation::where('status', 'completed')
                ->where('created_at', '>=', $now->copy()->subYear()->startOfMonth())
                ->select(
                    DB::raw("DATE_FORMAT(created_at, '%Y-%m') as month"),
                    DB::raw('COALESCE(SUM(amount),0) as total')
                )
                ->groupBy('month')->orderBy('month')->get();

            return [
                'kpis' => [
                    'members' => [
                        'total'    => $totalMembers,
                        'active'   => $activeMembers,
                        'pending'  => $pendingMembers,
                        'verified' => $verifiedMembers,
                        'new_30d'  => $newMembersThisMonth,
                    ],
                    'donations' => [
                        'this_month'      => $donationsThisMonth,
                        'this_year'       => $donationsThisYear,
                        'pending_count'   => $pendingDonations,
                        'pending_amount'  => $pendingDonationsAmount,
                    ],
                    'content' => [
                        'upcoming_events'    => $upcomingEvents,
                        'published_sermons'  => $publishedSermons,
                        'total_sermon_views' => $totalSermonViews,
                    ],
                    'community' => [
                        'active_cells'    => $activeCells,
                        'pending_reports' => $pendingReports,
                        'new_prayers'     => $newPrayers,
                        'unread_contacts' => $unreadContacts,
                    ],
                ],
                'charts' => [
                    'members_growth'  => $membersGrowth,
                    'donations_month' => $donationsMonthly,
                ],
                'generated_at' => now()->toIso8601String(),
            ];
        });

        return response()->json($stats);
    }
}
