<?php

namespace App\Jobs;

use App\Mail\MonthlyBirthdaysListMail;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

/**
 * Job — Envoyé le 1er du mois à 8h00.
 *
 * 1. Récupère tous les membres actifs dont le birth_date tombe dans le mois courant.
 * 2. Génère un PDF avec la liste triée par jour.
 * 3. Envoie le PDF en pièce jointe à chaque utilisateur ayant le rôle 'rh'.
 */
class SendMonthlyBirthdaysListJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $backoff = 120;

    public function handle(): void
    {
        $now   = Carbon::now();
        $month = $now->month;
        $monthName = $now->isoFormat('MMMM YYYY');

        // SQL portable (MySQL/SQLite) : extraire le mois du birth_date.
        $driver = DB::connection()->getDriverName();
        $monthExpr = $driver === 'sqlite'
            ? "CAST(strftime('%m', birth_date) AS INTEGER)"
            : "MONTH(birth_date)";
        $dayExpr = $driver === 'sqlite'
            ? "CAST(strftime('%d', birth_date) AS INTEGER)"
            : "DAY(birth_date)";

        $members = User::query()
            ->where('status', 'active')
            ->whereNotNull('birth_date')
            ->whereRaw("$monthExpr = ?", [$month])
            ->orderByRaw($dayExpr)
            ->get(['id', 'first_name', 'name', 'email', 'phone', 'birth_date', 'avatar']);

        if ($members->isEmpty()) {
            Log::info("Aucun anniversaire ce mois ({$monthName}). Aucun mail envoyé.");
            return;
        }

        // Rendu PDF
        $pdf = Pdf::loadView('pdf.monthly_birthdays', [
            'members'   => $members,
            'month'     => $month,
            'monthName' => $monthName,
            'year'      => $now->year,
            'count'     => $members->count(),
        ])->setPaper('a4', 'portrait');

        $filename = sprintf('birthdays/anniversaires-%s-%02d.pdf', $now->year, $month);
        Storage::disk('local')->put($filename, $pdf->output());

        $absolutePath = Storage::disk('local')->path($filename);
        $downloadName = sprintf('Anniversaires_NWC_%s.pdf', $now->isoFormat('YYYY-MM'));

        // Envoi aux RH actifs (+ fallback pasteur si pas de RH)
        $rhs = User::role('rh')->where('status', 'active')->get();
        if ($rhs->isEmpty()) {
            $rhs = User::role('pasteur')->where('status', 'active')->get();
        }

        foreach ($rhs as $recipient) {
            Mail::to($recipient->email)->queue(
                new MonthlyBirthdaysListMail(
                    recipient:   $recipient,
                    monthName:   $monthName,
                    count:       $members->count(),
                    pdfPath:     $absolutePath,
                    downloadName: $downloadName,
                )
            );
        }

        Log::info("PDF anniversaires {$monthName} généré ({$members->count()} membres) + email à {$rhs->count()} destinataire(s).");
    }
}
