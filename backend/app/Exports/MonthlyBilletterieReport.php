<?php

namespace App\Exports;

use App\Models\Event;
use App\Models\EventTicket;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;

/**
 * Sprint C — Rapport mensuel billetterie multi-feuilles.
 *
 *  Sheet 1 : Résumé (KPIs du mois)
 *  Sheet 2 : Détail par événement
 *  Sheet 3 : Détail par méthode de paiement
 *  Sheet 4 : Liste des transactions du mois
 *
 * Style : header bordeaux NWC (#8B1A2F), logo, zébrures ivoire.
 */
class MonthlyBilletterieReport implements WithMultipleSheets
{
    public function __construct(
        protected int $year,
        protected int $month,
    ) {}

    public function sheets(): array
    {
        $start = Carbon::create($this->year, $this->month, 1)->startOfMonth();
        $end   = $start->copy()->endOfMonth();

        return [
            new MonthlyBilletterieSummarySheet($start, $end),
            new MonthlyBilletterieEventsSheet($start, $end),
            new MonthlyBilletteriePaymentsSheet($start, $end),
            new MonthlyBilletterieTransactionsSheet($start, $end),
        ];
    }
}

/**
 * =====================================================================
 * Sheet 1 : Résumé du mois (KPIs synthétiques).
 * =====================================================================
 */
class MonthlyBilletterieSummarySheet implements FromCollection, WithHeadings, ShouldAutoSize, WithEvents, WithTitle
{
    use Exportable;

    public function __construct(protected Carbon $start, protected Carbon $end) {}

    public function title(): string { return 'Résumé'; }

    public function headings(): array
    {
        return ['Indicateur', 'Valeur'];
    }

    public function collection(): Collection
    {
        $ticketsSold = EventTicket::whereIn('payment_status', ['free', 'paid'])
            ->whereBetween('created_at', [$this->start, $this->end])->count();
        $paidCount = EventTicket::where('payment_status', 'paid')
            ->whereBetween('payment_validated_at', [$this->start, $this->end])->count();
        $freeCount = EventTicket::where('payment_status', 'free')
            ->whereBetween('created_at', [$this->start, $this->end])->count();
        $pendingCount = EventTicket::where('payment_status', 'pending')
            ->whereBetween('created_at', [$this->start, $this->end])->count();
        $revenue = (int) EventTicket::where('payment_status', 'paid')
            ->whereBetween('payment_validated_at', [$this->start, $this->end])->sum('price_fcfa');
        $refunded = (int) EventTicket::where('payment_status', 'refunded')
            ->whereBetween('refunded_at', [$this->start, $this->end])->sum('refund_amount_fcfa');
        $refundedCount = EventTicket::where('payment_status', 'refunded')
            ->whereBetween('refunded_at', [$this->start, $this->end])->count();
        $orders = EventTicket::whereIn('payment_status', ['free', 'paid'])
            ->whereBetween('created_at', [$this->start, $this->end])
            ->distinct('order_code')->count('order_code');
        $avgBasket = $orders > 0 ? (int) round($revenue / $orders) : 0;
        $eventsCount = Event::where('ticketing_enabled', true)
            ->whereHas('tickets', fn ($q) =>
                $q->whereBetween('created_at', [$this->start, $this->end]))
            ->count();
        $scanned = EventTicket::where('status', 'used')
            ->whereBetween('used_at', [$this->start, $this->end])->count();

        return collect([
            ['Mois',                    $this->start->locale('fr')->isoFormat('MMMM YYYY')],
            ['Tickets vendus',          $ticketsSold],
            ['Tickets payés',           $paidCount],
            ['Tickets gratuits',        $freeCount],
            ['Tickets en attente',      $pendingCount],
            ['Revenus (FCFA)',          $revenue],
            ['Remboursements (FCFA)',   $refunded],
            ['Nombre remboursements',   $refundedCount],
            ['Revenu net (FCFA)',       $revenue - $refunded],
            ['Commandes distinctes',    $orders],
            ['Panier moyen (FCFA)',     $avgBasket],
            ['Events avec ventes',      $eventsCount],
            ['Tickets scannés',         $scanned],
        ]);
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                MonthlyBilletterieStyler::styleHeader($sheet, 'A1:B1', 2);
                MonthlyBilletterieStyler::styleBody($sheet, 'B');
            },
        ];
    }
}

/**
 * =====================================================================
 * Sheet 2 : Détail par événement.
 * =====================================================================
 */
class MonthlyBilletterieEventsSheet implements FromCollection, WithHeadings, ShouldAutoSize, WithEvents, WithTitle
{
    use Exportable;

    public function __construct(protected Carbon $start, protected Carbon $end) {}

    public function title(): string { return 'Par événement'; }

    public function headings(): array
    {
        return [
            'Événement', 'Date', 'Capacité', 'Tickets vendus',
            'Revenus (FCFA)', 'Remboursements (FCFA)', 'Places restantes',
        ];
    }

    public function collection(): Collection
    {
        return Event::where('ticketing_enabled', true)
            ->with(['tickets' => fn ($q) =>
                $q->select('id', 'event_id', 'status', 'payment_status', 'price_fcfa',
                           'refund_amount_fcfa', 'created_at', 'payment_validated_at', 'refunded_at')])
            ->get()
            ->map(function (Event $e) {
                $inRange = $e->tickets->filter(function ($t) {
                    return ($t->created_at && $t->created_at->between($this->start, $this->end))
                        || ($t->payment_validated_at && $t->payment_validated_at->between($this->start, $this->end));
                });
                $sold     = $inRange->whereIn('payment_status', ['free', 'paid'])
                                    ->whereIn('status', ['confirmed', 'used'])->count();
                $revenue  = (int) $inRange->where('payment_status', 'paid')->sum('price_fcfa');
                $refunded = (int) $e->tickets->filter(fn ($t) =>
                        $t->refunded_at && $t->refunded_at->between($this->start, $this->end))
                    ->sum('refund_amount_fcfa');
                if ($sold === 0 && $revenue === 0 && $refunded === 0) return null;
                $remaining = $e->tickets_capacity ? max(0, $e->tickets_capacity - $sold) : null;
                return [
                    $e->title,
                    $e->starts_at?->format('d/m/Y H:i'),
                    $e->tickets_capacity ?? '—',
                    $sold,
                    $revenue,
                    $refunded,
                    $remaining ?? '—',
                ];
            })
            ->filter()
            ->values();
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                MonthlyBilletterieStyler::styleHeader($sheet, 'A1:G1', 7);
                MonthlyBilletterieStyler::styleBody($sheet, 'G');
            },
        ];
    }
}

/**
 * =====================================================================
 * Sheet 3 : Détail par méthode de paiement.
 * =====================================================================
 */
class MonthlyBilletteriePaymentsSheet implements FromCollection, WithHeadings, ShouldAutoSize, WithEvents, WithTitle
{
    use Exportable;

    public function __construct(protected Carbon $start, protected Carbon $end) {}

    public function title(): string { return 'Par méthode paiement'; }

    public function headings(): array
    {
        return ['Méthode', 'Passerelle', 'Nombre tickets', 'Revenus (FCFA)'];
    }

    public function collection(): Collection
    {
        return EventTicket::where('payment_status', 'paid')
            ->whereBetween('payment_validated_at', [$this->start, $this->end])
            ->selectRaw('COALESCE(payment_method, "non_precise") as payment_method,
                         COALESCE(gateway_provider, "-") as gateway_provider,
                         COUNT(*) as count,
                         SUM(price_fcfa) as revenue')
            ->groupBy('payment_method', 'gateway_provider')
            ->orderByDesc('revenue')
            ->get()
            ->map(fn ($r) => [
                $this->methodLabel($r->payment_method),
                $r->gateway_provider,
                (int) $r->count,
                (int) $r->revenue,
            ]);
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                MonthlyBilletterieStyler::styleHeader($sheet, 'A1:D1', 4);
                MonthlyBilletterieStyler::styleBody($sheet, 'D');
            },
        ];
    }

    private function methodLabel(?string $code): string
    {
        return match ($code) {
            'orange_money' => 'Orange Money',
            'wave'         => 'Wave',
            'mtn_momo'     => 'MTN MoMo',
            'moov_money'   => 'Moov Money',
            'cash'         => 'Espèces',
            'non_precise'  => 'Non précisé',
            null, ''       => 'Non précisé',
            default        => ucfirst(str_replace('_', ' ', $code)),
        };
    }
}

/**
 * =====================================================================
 * Sheet 4 : Liste transactions du mois (utile pour compta).
 * =====================================================================
 */
class MonthlyBilletterieTransactionsSheet implements FromCollection, WithHeadings, ShouldAutoSize, WithEvents, WithTitle
{
    use Exportable;

    public function __construct(protected Carbon $start, protected Carbon $end) {}

    public function title(): string { return 'Transactions'; }

    public function headings(): array
    {
        return [
            'Code commande', 'Ticket #', 'Événement', 'Date validation',
            'Nom', 'Email', 'Téléphone',
            'Méthode', 'Passerelle', 'Référence', 'Montant (FCFA)', 'Statut',
        ];
    }

    public function collection(): Collection
    {
        return EventTicket::with('event:id,title')
            ->whereIn('payment_status', ['paid', 'refunded'])
            ->where(function ($q) {
                $q->whereBetween('payment_validated_at', [$this->start, $this->end])
                  ->orWhereBetween('refunded_at', [$this->start, $this->end]);
            })
            ->orderBy('payment_validated_at')
            ->get()
            ->map(fn (EventTicket $t) => [
                $t->order_code,
                $t->ticket_number,
                $t->event?->title,
                $t->payment_validated_at?->format('d/m/Y H:i'),
                trim($t->first_name . ' ' . $t->last_name),
                $t->email,
                $t->phone,
                $t->payment_method,
                $t->gateway_provider,
                $t->payment_reference ?? $t->gateway_transaction_id,
                $t->payment_status === 'refunded' ? -1 * (int) $t->refund_amount_fcfa : (int) $t->price_fcfa,
                $t->payment_status,
            ]);
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                MonthlyBilletterieStyler::styleHeader($sheet, 'A1:L1', 12);
                MonthlyBilletterieStyler::styleBody($sheet, 'L');
            },
        ];
    }
}

/**
 * =====================================================================
 * Utilitaire de style partagé — factorise l'apparence des 4 feuilles.
 * =====================================================================
 */
class MonthlyBilletterieStyler
{
    public static function styleHeader($sheet, string $range, int $colCount): void
    {
        $sheet->getStyle($range)->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '8B1A2F']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '6B1422']]],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(24);
    }

    public static function styleBody($sheet, string $lastCol): void
    {
        $lastRow = $sheet->getHighestRow();
        if ($lastRow < 2) return;
        for ($row = 2; $row <= $lastRow; $row++) {
            $bg = ($row % 2 === 0) ? 'FFFFFF' : 'FAF6EE';
            $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray([
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg]],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E0D0']]],
                'font'    => ['size' => 10, 'color' => ['rgb' => '1F1A14']],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
            ]);
        }
    }
}
