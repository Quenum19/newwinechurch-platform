<?php

namespace App\Exports;

use App\Models\Event;
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
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;

/**
 * Export Excel des inscrits à un événement — design pro cohérent NWC.
 *
 * Rétro-compat avec l'ancien EventTicketsExport (constructor accepte l'Event).
 * Utilise FromCollection (Eloquent, pas raw DB Builder) pour un mapping correct.
 * Résolution logo robuste en prod (essaie plusieurs chemins possibles).
 */
class EventTicketsExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithEvents, WithTitle
{
    public function __construct(protected Event $event) {}

    public function title(): string { return 'Inscrits — ' . mb_substr($this->event->title, 0, 25); }

    public function collection()
    {
        return $this->event->tickets()
            ->with(['usedBy:id,name,first_name', 'ticketType:id,name,price_fcfa'])
            ->orderByDesc('created_at')
            ->get();
    }

    public function headings(): array
    {
        return [
            'ID', 'N° Commande', 'N° Ticket', 'Code Court',
            'Prénom', 'Nom', 'Email', 'Téléphone',
            'Type', 'Prix (FCFA)', 'Statut', 'Paiement',
            'Scanné le', 'Scanné par', 'Inscrit le',
        ];
    }

    public function map($t): array
    {
        $statusLabels = [
            'confirmed' => 'Confirmé',
            'used'      => 'Entré',
            'cancelled' => 'Annulé',
            'waitlist'  => 'Liste attente',
        ];
        $paymentLabels = [
            'free'     => 'Gratuit',
            'pending'  => 'En attente',
            'paid'     => 'Payé',
            'refused'  => 'Refusé',
            'expired'  => 'Expiré',
            'refunded' => 'Remboursé',
        ];

        return [
            $t->id,
            $t->order_code,
            $t->ticket_number,
            $t->short_code,
            $t->first_name,
            $t->last_name,
            $t->email,
            $t->phone,
            $t->ticketType?->name ?? '—',
            $t->price_fcfa ?? 0,
            $statusLabels[$t->status] ?? $t->status,
            $paymentLabels[$t->payment_status] ?? ($t->payment_status ?? '—'),
            $t->used_at?->format('d/m/Y H:i'),
            $t->usedBy ? trim(($t->usedBy->first_name ?? '') . ' ' . ($t->usedBy->name ?? '')) : '',
            $t->created_at?->format('d/m/Y H:i'),
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastCol = 'O'; // 15 colonnes A→O

                // Sans WithStartRow, les headings sont en row 1 et les data en row 2+.
                // On INSÈRE 5 rows AU-DESSUS pour placer notre header custom.
                $sheet->insertNewRowBefore(1, 5);

                // Après insertion :
                //   Row 1-3 : header NWC (à styler)
                //   Row 4   : LISTE DES INSCRITS
                //   Row 5   : Meta (Export du... · X inscrits)
                //   Row 6   : Headings (ex row 1)
                //   Row 7+  : Data
                $lastRow = $sheet->getHighestRow();
                $inscritsCount = max(0, $lastRow - 6);

                // === Header NWC (row 1-3) ===
                $sheet->mergeCells("A1:{$lastCol}3");
                $sheet->setCellValue('A1', 'NEW WINE CHURCH');
                $sheet->getStyle('A1')->applyFromArray([
                    'font'      => ['bold' => true, 'size' => 22, 'color' => ['rgb' => '8B1A2F']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FAF6EE']],
                ]);

                // Logo (best effort — silencieux si pas trouvé)
                try {
                    if ($logo = $this->resolveLogoPath()) {
                        $drawing = new Drawing();
                        $drawing->setPath($logo)
                                ->setHeight(70)
                                ->setCoordinates('A1')
                                ->setOffsetX(15)
                                ->setOffsetY(8)
                                ->setWorksheet($sheet);
                    }
                } catch (\Throwable $e) {
                    // On ne bloque JAMAIS l'export à cause du logo.
                }

                // Sous-titre event
                $sheet->mergeCells("A4:{$lastCol}4");
                $sheet->setCellValue('A4', 'LISTE DES INSCRITS — ' . mb_strtoupper($this->event->title));
                $sheet->getStyle('A4')->applyFromArray([
                    'font'      => ['bold' => true, 'size' => 14, 'color' => ['rgb' => '1F1A14']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F0E7D1']],
                ]);

                // Meta line (row 5)
                $sheet->mergeCells("A5:{$lastCol}5");
                $meta = sprintf(
                    'Export du %s · %d inscrit(s)%s%s',
                    now()->locale('fr')->isoFormat('LL [à] HH:mm'),
                    $inscritsCount,
                    $this->event->starts_at
                        ? ' · événement du ' . $this->event->starts_at->locale('fr')->isoFormat('LL')
                        : '',
                    $this->event->location ? ' · ' . $this->event->location : '',
                );
                $sheet->setCellValue('A5', $meta);
                $sheet->getStyle('A5')->applyFromArray([
                    'font'      => ['size' => 10, 'italic' => true, 'color' => ['rgb' => '6B5F4E']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F0E7D1']],
                ]);

                foreach ([1, 2, 3] as $r) $sheet->getRowDimension($r)->setRowHeight(30);
                $sheet->getRowDimension(4)->setRowHeight(24);
                $sheet->getRowDimension(5)->setRowHeight(22);

                // === Headers colonnes (row 6) — wine banner ===
                $sheet->getStyle("A6:{$lastCol}6")->applyFromArray([
                    'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '8B1A2F']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '6B1422']]],
                ]);
                $sheet->getRowDimension(6)->setRowHeight(26);

                // === Corps ===
                // Force format TEXTE sur colonnes techniques (évite notation scientifique
                // pour N° Commande, N° Ticket, Code Court, Téléphone qui sont des grands "numbers"
                // interprétés à tort par Excel).
                if ($lastRow > 6) {
                    foreach (['B', 'C', 'D', 'H'] as $textCol) {
                        // 1. Applique format text sur toute la colonne
                        $sheet->getStyle("{$textCol}7:{$textCol}{$lastRow}")
                              ->getNumberFormat()->setFormatCode('@');
                        // 2. RE-écrit la valeur en TYPE_STRING explicite pour empêcher
                        //    Excel d'interpréter en scientifique (fix bulletproof)
                        for ($r = 7; $r <= $lastRow; $r++) {
                            $cell = $sheet->getCell("{$textCol}{$r}");
                            $v = (string) $cell->getValue();
                            $cell->setValueExplicit($v, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                        }
                    }
                    for ($row = 7; $row <= $lastRow; $row++) {
                        $bg = ($row % 2 === 0) ? 'FFFFFF' : 'FAF6EE';
                        $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray([
                            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg]],
                            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E0D0']]],
                            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                            'font'      => ['size' => 10, 'color' => ['rgb' => '1F1A14']],
                        ]);

                        // Colonne K = Statut, L = Paiement (indices 11-12 → colonnes K-L)
                        $statutCell  = $sheet->getCell("K{$row}")->getValue();
                        $paiementCell= $sheet->getCell("L{$row}")->getValue();

                        $colorStatut = match ($statutCell) {
                            'Entré'         => '16A34A',
                            'Confirmé'      => '0EA5E9',
                            'Annulé'        => 'B91C1C',
                            'Liste attente' => 'D97706',
                            default         => null,
                        };
                        if ($colorStatut) {
                            $sheet->getStyle("K{$row}")->getFont()->setBold(true)
                                  ->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color($colorStatut));
                        }

                        $colorPaid = match ($paiementCell) {
                            'Payé'       => '16A34A',
                            'En attente' => 'D97706',
                            'Refusé'     => 'B91C1C',
                            'Expiré'     => '999999',
                            'Remboursé'  => '9333EA',
                            default      => null,
                        };
                        if ($colorPaid) {
                            $sheet->getStyle("L{$row}")->getFont()->setBold(true)
                                  ->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color($colorPaid));
                        }
                    }

                    // Codes en gras (A, C, D = ID, N° ticket, Code court)
                    foreach (['A', 'C', 'D'] as $col) {
                        $sheet->getStyle("{$col}7:{$col}{$lastRow}")->getFont()->setBold(true);
                    }
                    // Centrer les colonnes techniques
                    foreach (['A', 'B', 'C', 'D', 'I', 'J', 'K', 'L'] as $col) {
                        $sheet->getStyle("{$col}7:{$col}{$lastRow}")->getAlignment()
                              ->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    }
                    // Prix aligné droite avec format
                    $sheet->getStyle("J7:J{$lastRow}")->getAlignment()
                          ->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                    $sheet->getStyle("J7:J{$lastRow}")->getNumberFormat()
                          ->setFormatCode('# ##0');
                }

                $sheet->freezePane('A7');

                // === Footer ===
                $footerRow = $lastRow + 2;
                $sheet->mergeCells("A{$footerRow}:{$lastCol}{$footerRow}");
                $sheet->setCellValue("A{$footerRow}",
                    '© New Wine Church · Document confidentiel — usage interne uniquement');
                $sheet->getStyle("A{$footerRow}")->applyFromArray([
                    'font'      => ['italic' => true, 'size' => 9, 'color' => ['rgb' => '999999']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);
            },
        ];
    }

    /**
     * Résout le chemin du logo en essayant plusieurs emplacements.
     * On CATCHE public_path() qui peut throw sur Hostinger.
     */
    protected function resolveLogoPath(): ?string
    {
        $candidates = [];

        // Try public_path() — peut throw sur Hostinger custom
        try {
            $candidates[] = public_path('logos/logo_newwine.png');
        } catch (\Throwable $e) {}

        // Fallbacks robustes
        try { $candidates[] = base_path('public/logos/logo_newwine.png'); } catch (\Throwable $e) {}

        // Hostinger : le vrai document root du sous-domaine
        $candidates[] = '/home/u781799599/domains/newinechurch.org/public_html/logos/logo_newwine.png';
        $candidates[] = '/home/u781799599/domains/newinechurch.org/public_html/api/logos/logo_newwine.png';

        // Cache local pour prod
        try {
            $candidates[] = storage_path('app/exports-logo-cache/logo_newwine.png');
        } catch (\Throwable $e) {}

        foreach ($candidates as $path) {
            if ($path && is_string($path) && @file_exists($path) && @filesize($path) > 500) {
                return $path;
            }
        }
        return null;
    }
}
