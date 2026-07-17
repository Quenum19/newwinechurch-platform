<?php

namespace App\Exports;

use App\Models\Event;
use App\Models\EventTicket;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

/**
 * Phase 4 — Export Excel récap trans-events (1 ligne = 1 event ticketé).
 *
 * Idéal pour bilan trimestriel/annuel : revenus par event, taux conversion,
 * taux scan, ratio WhatsApp opt-in.
 */
class TicketingOverviewExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithEvents, WithTitle
{
    public function title(): string { return 'Récap billetterie'; }

    public function collection()
    {
        return Event::where('ticketing_enabled', true)
            ->with(['tickets' => fn ($q) => $q->select('id', 'event_id', 'status', 'payment_status', 'price_fcfa', 'whatsapp_opt_in', 'whatsapp_sent_at')])
            ->orderByDesc('starts_at')
            ->get();
    }

    public function headings(): array
    {
        return [
            'ID', 'Événement', 'Date', 'Lieu', 'Capacité',
            'Inscrits', 'Validés', 'Entrés', 'Annulés', 'Expirés',
            'Taux remplissage %', 'Taux conversion %', 'Taux scan %',
            'Revenus payés FCFA', 'Revenus pending FCFA',
            'WhatsApp opt-in %', 'WhatsApp envoyés',
        ];
    }

    public function map($event): array
    {
        $tickets   = $event->tickets;
        $total     = $tickets->count();
        $active    = $tickets->whereIn('payment_status', ['free', 'pending', 'paid'])->count();
        $issued    = $tickets->whereIn('payment_status', ['free', 'paid'])->count();
        $used      = $tickets->where('status', 'used')->count();
        $cancelled = $tickets->where('status', 'cancelled')->count();
        $expired   = $tickets->where('payment_status', 'expired')->count();
        $paidRev   = $tickets->where('payment_status', 'paid')->sum('price_fcfa');
        $pendRev   = $tickets->where('payment_status', 'pending')->sum('price_fcfa');
        $waOpt     = $tickets->where('whatsapp_opt_in', true)->count();
        $waSent    = $tickets->whereNotNull('whatsapp_sent_at')->count();

        $fillRate = $event->tickets_capacity ? round($active / $event->tickets_capacity * 100, 1) : 0;
        $convRate = $total > 0 ? round($issued / $total * 100, 1) : 0;
        $scanRate = $issued > 0 ? round($used / $issued * 100, 1) : 0;
        $waRate   = $total > 0 ? round($waOpt / $total * 100, 1) : 0;

        return [
            $event->id,
            $event->title,
            $event->starts_at?->format('Y-m-d H:i'),
            $event->location,
            $event->tickets_capacity ?? '—',
            $total, $issued, $used, $cancelled, $expired,
            $fillRate, $convRate, $scanRate,
            $paidRev, $pendRev,
            $waRate, $waSent,
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                // Header en bandeau wine NWC
                $sheet->getStyle('A1:Q1')->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '8B1A2F']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                ]);
                $sheet->getRowDimension(1)->setRowHeight(28);
                $sheet->getStyle('A:Q')->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

                // Highlight colonnes revenus (gold soft)
                $rows = $sheet->getHighestRow();
                $sheet->getStyle("N2:O{$rows}")->getFill()
                    ->setFillType(Fill::FILL_SOLID)
                    ->getStartColor()->setRGB('FAF2DF');
            },
        ];
    }
}
