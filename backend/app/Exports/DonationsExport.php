<?php

namespace App\Exports;

use App\Models\Donation;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStartRow;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;

/**
 * Export Excel des dons NWC — design professionnel cohérent avec MembersExport.
 *
 * Spécificités dons : montant en colonne C formaté en FCFA avec séparateur,
 * ligne TOTAL en bas avec fond gold, statuts colorés (Confirmé=vert, En attente=orange).
 */
class DonationsExport implements FromQuery, WithHeadings, WithMapping, ShouldAutoSize, WithEvents, WithTitle, WithStartRow
{
    public function __construct(protected array $filters = []) {}

    public function title(): string  { return 'Dons NWC'; }
    public function startRow(): int  { return 6; }

    public function query()
    {
        $query = Donation::query()->with('user', 'confirmer');

        foreach (['status', 'method', 'type'] as $key) {
            if ($v = $this->filters[$key] ?? null) {
                $query->where($key, $v);
            }
        }
        if ($from = $this->filters['from'] ?? null) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $this->filters['to'] ?? null) {
            $query->whereDate('created_at', '<=', $to);
        }

        return $query->orderByDesc('created_at');
    }

    public function headings(): array
    {
        return [
            'ID', 'Date', 'Montant', 'Devise', 'Méthode', 'Type', 'Statut',
            'Référence', 'Donateur', 'Email donateur', 'Téléphone',
            'Confirmé le', 'Confirmé par', 'Note',
        ];
    }

    public function map($d): array
    {
        $methodLabels = [
            'orange_money' => 'Orange Money', 'wave' => 'Wave',
            'mtn_momo' => 'MTN MoMo', 'card' => 'Carte',
            'cash' => 'Espèces', 'other' => 'Autre',
        ];
        $statusLabels = ['pending' => 'En attente', 'completed' => 'Confirmé', 'failed' => 'Rejeté'];

        return [
            $d->id,
            $d->created_at?->format('d/m/Y H:i'),
            (float) $d->amount,
            $d->currency,
            $methodLabels[$d->method] ?? $d->method,
            ucfirst($d->type),
            $statusLabels[$d->status] ?? $d->status,
            $d->reference,
            $d->user?->full_name ?? $d->donor_name ?? 'Anonyme',
            $d->user?->email ?? '',
            $d->donor_phone ?? $d->user?->phone ?? '',
            $d->confirmed_at?->format('d/m/Y H:i'),
            $d->confirmer?->full_name,
            $d->note,
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastCol = 'N';
                $lastRow = $sheet->getHighestRow();

                // === HEADER NWC ===
                $sheet->mergeCells("A1:{$lastCol}3");
                $sheet->setCellValue('A1', 'NEW WINE CHURCH');
                $sheet->getStyle('A1')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 18, 'color' => ['rgb' => '8B1A2F']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FAF6EE']],
                ]);

                if ($logoPath = $this->resolveLogoPath()) {
                    $drawing = new Drawing();
                    $drawing->setPath($logoPath)->setHeight(60)
                            ->setCoordinates('A1')->setOffsetX(10)->setOffsetY(5)
                            ->setWorksheet($sheet);
                }

                $sheet->mergeCells("A4:{$lastCol}4");
                $sheet->setCellValue('A4', 'JOURNAL DES DONS');
                $sheet->getStyle('A4')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 13, 'color' => ['rgb' => '1F1A14']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F0E7D1']],
                ]);

                $sheet->mergeCells("A5:{$lastCol}5");
                $sheet->setCellValue('A5', sprintf(
                    'Export du %s · %d don(s) · %s',
                    now()->locale('fr')->isoFormat('LL [à] HH:mm'),
                    max(0, $lastRow - 6),
                    $this->describeFilters(),
                ));
                $sheet->getStyle('A5')->applyFromArray([
                    'font' => ['size' => 10, 'italic' => true, 'color' => ['rgb' => '6B5F4E']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F0E7D1']],
                ]);

                foreach ([1, 2, 3] as $r) $sheet->getRowDimension($r)->setRowHeight(28);
                $sheet->getRowDimension(4)->setRowHeight(22);
                $sheet->getRowDimension(5)->setRowHeight(20);

                // === EN-TÊTES COLONNES ===
                $sheet->getStyle("A6:{$lastCol}6")->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '8B1A2F']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '6B1422']]],
                ]);
                $sheet->getRowDimension(6)->setRowHeight(24);

                // === CORPS ===
                if ($lastRow > 6) {
                    for ($row = 7; $row <= $lastRow; $row++) {
                        $bg = ($row % 2 === 0) ? 'FFFFFF' : 'FAF6EE';
                        $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg]],
                            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E0D0']]],
                            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                            'font' => ['size' => 10, 'color' => ['rgb' => '1F1A14']],
                        ]);

                        // Coloration des statuts (col G)
                        $statut = $sheet->getCell("G{$row}")->getValue();
                        $color = match ($statut) {
                            'Confirmé'   => '16A34A',
                            'En attente' => 'D97706',
                            'Rejeté'     => 'B91C1C',
                            default      => null,
                        };
                        if ($color) {
                            $sheet->getStyle("G{$row}")->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color($color));
                        }
                    }
                    // Montant formaté FCFA (col C)
                    $sheet->getStyle("C7:C{$lastRow}")->getNumberFormat()
                          ->setFormatCode('#,##0 "FCFA"');
                    $sheet->getStyle("C7:C{$lastRow}")->getAlignment()
                          ->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                    $sheet->getStyle("C7:C{$lastRow}")->getFont()->setBold(true);

                    // ID en gras
                    $sheet->getStyle("A7:A{$lastRow}")->getFont()->setBold(true);
                    foreach (['D', 'G'] as $col) {
                        $sheet->getStyle("{$col}7:{$col}{$lastRow}")->getAlignment()
                              ->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    }

                    // === LIGNE TOTAL ===
                    $totalRow = $lastRow + 1;
                    $sheet->setCellValue("A{$totalRow}", 'TOTAL');
                    $sheet->mergeCells("A{$totalRow}:B{$totalRow}");
                    $sheet->setCellValue("C{$totalRow}", "=SUM(C7:C{$lastRow})");
                    $sheet->getStyle("A{$totalRow}:{$lastCol}{$totalRow}")->applyFromArray([
                        'font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => '1F1A14']],
                        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'C9A961']],
                        'alignment' => ['vertical' => Alignment::VERTICAL_CENTER, 'horizontal' => Alignment::HORIZONTAL_RIGHT],
                        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['rgb' => '8B1A2F']]],
                    ]);
                    $sheet->getStyle("A{$totalRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
                    $sheet->getStyle("C{$totalRow}")->getNumberFormat()->setFormatCode('#,##0 "FCFA"');
                    $sheet->getRowDimension($totalRow)->setRowHeight(28);
                }

                $sheet->freezePane('A7');

                // Footer
                $footerRow = ($lastRow > 6 ? $lastRow + 1 : 6) + 2;
                $sheet->mergeCells("A{$footerRow}:{$lastCol}{$footerRow}");
                $sheet->setCellValue("A{$footerRow}",
                    '© New Wine Church · Document confidentiel — usage interne uniquement'
                );
                $sheet->getStyle("A{$footerRow}")->applyFromArray([
                    'font' => ['italic' => true, 'size' => 9, 'color' => ['rgb' => '999999']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);
            },
        ];
    }

    private function describeFilters(): string
    {
        $parts = [];
        if ($v = $this->filters['status'] ?? null) $parts[] = "statut : $v";
        if ($v = $this->filters['method'] ?? null) $parts[] = "méthode : $v";
        if ($v = $this->filters['type']   ?? null) $parts[] = "type : $v";
        if ($v = $this->filters['from']   ?? null) $parts[] = "depuis : $v";
        if ($v = $this->filters['to']     ?? null) $parts[] = "jusqu'à : $v";
        return $parts ? 'filtres : ' . implode(' · ', $parts) : 'tous les dons';
    }

    /** Voir App\Exports\MembersExport::resolveLogoPath() — même logique. */
    protected function resolveLogoPath(): ?string
    {
        $candidates = [
            public_path('logos/logo_newwine.png'),
            base_path('public/logos/logo_newwine.png'),
            dirname(base_path()) . '/public_html/logos/logo_newwine.png',
        ];
        foreach ($candidates as $path) {
            if ($path && @file_exists($path)) return $path;
        }
        $cached = storage_path('app/exports-logo-cache/logo_newwine.png');
        if (@file_exists($cached) && filesize($cached) > 500) return $cached;
        $url = rtrim(config('app.frontend_url', 'https://newinechurch.org'), '/')
             . '/logos/logo_newwine.png';
        try {
            $ctx = stream_context_create(['http' => ['timeout' => 5, 'follow_location' => 1]]);
            $content = @file_get_contents($url, false, $ctx);
            if ($content && strlen($content) > 500) {
                @mkdir(dirname($cached), 0775, true);
                @file_put_contents($cached, $content);
                return $cached;
            }
        } catch (\Throwable $e) {}
        return null;
    }
}
