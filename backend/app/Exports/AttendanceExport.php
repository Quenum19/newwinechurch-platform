<?php

namespace App\Exports;

use App\Models\Event;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStartRow;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;

/**
 * Export Excel de la liste de présence — DESIGN PRO NWC 2026.
 *
 * Fix v2 (2026-07-20) : refonte pour éviter le warning "fusion de cellules
 * réparée" à l'ouverture — retire ShouldAutoSize (conflit avec mergeCells)
 * et fixe les largeurs manuellement via WithColumnWidths.
 *
 * Colonnes : # | Prénom | Nom | Téléphone | Email | Type ticket | Code | Heure arrivée | Scanné par
 */
class AttendanceExport implements FromCollection, WithHeadings, WithMapping, WithEvents, WithTitle, WithStartRow, WithColumnWidths
{
    private int $rowNumber = 0;

    public function __construct(protected Event $event) {}

    public function title(): string
    {
        return 'Présence';
    }

    /** Les données commencent ligne 7 (1-3 header, 4 titre, 5 sous-titre, 6 = headings). */
    public function startRow(): int
    {
        return 7;
    }

    /** Largeurs fixes — évite le conflit ShouldAutoSize/mergeCells. */
    public function columnWidths(): array
    {
        return [
            'A' => 6,   // #
            'B' => 18,  // Prénom
            'C' => 20,  // Nom
            'D' => 16,  // Téléphone
            'E' => 30,  // Email
            'F' => 14,  // Type ticket
            'G' => 12,  // Code
            'H' => 12,  // Heure arrivée
            'I' => 22,  // Scanné par
        ];
    }

    public function collection()
    {
        return $this->event->tickets()
            ->where('status', 'used')
            ->whereNotNull('used_at')
            ->with(['ticketType:id,name', 'usedBy:id,name,first_name'])
            ->orderBy('used_at')
            ->get();
    }

    public function headings(): array
    {
        return [
            '#', 'Prénom', 'Nom', 'Téléphone', 'Email',
            'Type ticket', 'Code', 'Heure d\'arrivée', 'Scanné par',
        ];
    }

    public function map($ticket): array
    {
        $this->rowNumber++;
        return [
            $this->rowNumber,
            $ticket->first_name ?? '—',
            $ticket->last_name ?? '—',
            $ticket->phone ?? '—',
            $ticket->email ?? '—',
            $ticket->ticketType?->name ?? 'Standard',
            strtoupper($ticket->short_code ?? '—'),
            $ticket->used_at?->format('H:i:s') ?? '—',
            $ticket->usedBy
                ? trim(($ticket->usedBy->first_name ?? '') . ' ' . ($ticket->usedBy->name ?? ''))
                : '—',
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastCol = 'I';
                $lastRow = $sheet->getHighestRow();

                // === 1. HEADER : logo à gauche + titre centré ===
                // Ligne 1-3 : fond ivoire uni sur A1:I3, logo dans A1-B3, titre dans C1:I3
                //             (pas de merge full-width pour éviter les warnings Excel)
                $sheet->getStyle("A1:{$lastCol}3")->applyFromArray([
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FAF6EE']],
                ]);

                // Zone logo (A1:B3)
                $sheet->mergeCells('A1:B3');

                // Zone titre (C1:I3)
                $sheet->mergeCells("C1:{$lastCol}3");
                $sheet->setCellValue('C1', 'NEW WINE CHURCH');
                $sheet->getStyle('C1')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 22, 'color' => ['rgb' => '8B1A2F']],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical'   => Alignment::VERTICAL_CENTER,
                    ],
                ]);

                // Logo (si dispo)
                $logoPath = $this->resolveLogoPath();
                if ($logoPath) {
                    try {
                        $drawing = new Drawing();
                        $drawing->setName('Logo NWC');
                        $drawing->setDescription('Logo New Wine Church');
                        $drawing->setPath($logoPath);
                        $drawing->setHeight(70);
                        $drawing->setCoordinates('A1');
                        $drawing->setOffsetX(15);
                        $drawing->setOffsetY(8);
                        $drawing->setWorksheet($sheet);
                    } catch (\Throwable $e) {
                        // Silencieux : si le logo échoue, le titre texte reste.
                    }
                }

                // === 2. TITRE — ligne 4, centré, fond bordeaux ===
                $sheet->mergeCells("A4:{$lastCol}4");
                $sheet->setCellValue('A4', 'LISTE DE PRÉSENCE — ' . strtoupper($this->event->title));
                $sheet->getStyle('A4')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => 'FFFFFF']],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical'   => Alignment::VERTICAL_CENTER,
                    ],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '8B1A2F']],
                ]);

                // === 3. Sous-titre — ligne 5, méta ===
                $sheet->mergeCells("A5:{$lastCol}5");
                $eventDate = $this->event->starts_at
                    ? $this->event->starts_at->locale('fr')->isoFormat('LL [à] HH:mm')
                    : '—';
                $total = max(0, $lastRow - 6);
                $sheet->setCellValue('A5', sprintf(
                    'Événement : %s   ·   Généré le %s   ·   %d personne(s) présente(s)',
                    $eventDate,
                    now()->locale('fr')->isoFormat('LL [à] HH:mm'),
                    $total,
                ));
                $sheet->getStyle('A5')->applyFromArray([
                    'font' => ['size' => 11, 'italic' => true, 'color' => ['rgb' => '6B5F4E']],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical'   => Alignment::VERTICAL_CENTER,
                    ],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F5EFE2']],
                ]);

                // Hauteurs de lignes
                $sheet->getRowDimension(1)->setRowHeight(30);
                $sheet->getRowDimension(2)->setRowHeight(30);
                $sheet->getRowDimension(3)->setRowHeight(30);
                $sheet->getRowDimension(4)->setRowHeight(30);
                $sheet->getRowDimension(5)->setRowHeight(24);

                // === 4. EN-TÊTES COLONNES ligne 6 ===
                $sheet->getStyle("A6:{$lastCol}6")->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '6B1422']],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical'   => Alignment::VERTICAL_CENTER,
                    ],
                    'borders' => [
                        'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '4A0E1A']],
                    ],
                ]);
                $sheet->getRowDimension(6)->setRowHeight(28);

                // === 5. CORPS — lignes 7+ ===
                if ($lastRow >= 7) {
                    // Style de base pour toutes les lignes de données
                    for ($row = 7; $row <= $lastRow; $row++) {
                        $bg = ($row % 2 === 0) ? 'FFFFFF' : 'FAF6EE';
                        $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg]],
                            'borders' => [
                                'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E0D0']],
                            ],
                            'alignment' => [
                                'vertical' => Alignment::VERTICAL_CENTER,
                                'wrapText' => false,
                            ],
                            'font' => ['size' => 10, 'color' => ['rgb' => '1F1A14']],
                        ]);
                    }

                    // Colonnes A (#) et F,G,H — centrées
                    $sheet->getStyle("A7:A{$lastRow}")->applyFromArray([
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                        'font' => ['bold' => true, 'color' => ['rgb' => '6B5F4E'], 'size' => 10],
                    ]);
                    $sheet->getStyle("F7:F{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $sheet->getStyle("G7:G{$lastRow}")->applyFromArray([
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                        'font' => ['bold' => true, 'size' => 10, 'name' => 'Consolas'],
                    ]);
                    $sheet->getStyle("H7:H{$lastRow}")->applyFromArray([
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                        'font' => ['bold' => true, 'color' => ['rgb' => '8B1A2F'], 'size' => 10, 'name' => 'Consolas'],
                    ]);

                    // Colonnes B (Prénom) et C (Nom) — alignées à gauche
                    $sheet->getStyle("B7:C{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
                    $sheet->getStyle("C7:C{$lastRow}")->getFont()->setBold(true);
                }

                // Freeze : header + 1re colonne visible
                $sheet->freezePane('B7');

                // === 6. FOOTER ===
                $footerRow = max($lastRow, 6) + 2;
                $sheet->mergeCells("A{$footerRow}:{$lastCol}{$footerRow}");
                $sheet->setCellValue("A{$footerRow}",
                    '© New Wine Church  ·  Document confidentiel  ·  Liste de présence billetterie'
                );
                $sheet->getStyle("A{$footerRow}")->applyFromArray([
                    'font' => ['italic' => true, 'size' => 9, 'color' => ['rgb' => 'A89A82']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);
                $sheet->getRowDimension($footerRow)->setRowHeight(22);
            },
        ];
    }

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
        return null;
    }
}
