<?php

namespace App\Exports;

use App\Models\Event;
use App\Models\MembershipRequest;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStartRow;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;

/**
 * Export Excel des enrôlements d'un événement — DESIGN PRO NWC 2026.
 *
 * Colonnes essentielles pour l'équipe accueil qui appelle :
 * # | Prénom | Nom | Téléphone | WhatsApp | Lieu | Souhait | Département | Statut | Notes
 *
 * Même styling que AttendanceExport (header ivoire + titre bordeaux + zébrures
 * + freeze pane) — parfaite cohérence visuelle avec les autres exports du projet.
 */
class EventEnrolementsExport implements FromArray, WithHeadings, WithStartRow, WithEvents, WithTitle, WithColumnWidths
{
    public function __construct(protected Event $event) {}

    public function title(): string
    {
        return 'Enrôlements';
    }

    public function startRow(): int
    {
        return 7;
    }

    public function columnWidths(): array
    {
        return [
            'A' => 6,   // #
            'B' => 8,   // Date
            'C' => 18,  // Prénom
            'D' => 20,  // Nom
            'E' => 16,  // Téléphone
            'F' => 16,  // WhatsApp
            'G' => 20,  // Lieu d'habitation
            'H' => 22,  // Département
            'I' => 22,  // Montagne
            'J' => 12,  // Statut
            'K' => 36,  // Notes
        ];
    }

    /**
     * Retourne toutes les lignes de data (sans les headings — WithHeadings les écrit à startRow-1).
     * On construit un array PHP direct au lieu d'utiliser FromCollection+WithMapping qui
     * s'avérait ne pas écrire les data dans certains cas (Maatwebsite v3).
     */
    public function array(): array
    {
        $items = MembershipRequest::query()
            ->forEvent($this->event->id)
            ->enrollments()
            ->orderByDesc('created_at')
            ->get();
        $items->load('interestedDepartment:id,name');

        $rows = [];
        $rowNum = 0;
        foreach ($items as $req) {
            $rowNum++;

            $whatsapp = null;
            if ($req->motivation && preg_match('/WhatsApp\s*:\s*([^·]+)/i', $req->motivation, $m)) {
                $whatsapp = trim($m[1]);
            }
            $statut = match ($req->enrollment_status) {
                'nouveau'  => 'Nouveau',
                'contacte' => 'Contacté',
                'converti' => 'Converti',
                'ecarte'   => 'Écarté',
                default    => 'Nouveau',
            };
            $mountain = \App\Http\Controllers\Admin\EventEnrolementsController::mountainLabel($req->interested_mountain);

            $rows[] = [
                $rowNum,
                $req->created_at?->format('d/m'),
                $req->first_name ?? '—',
                $req->name ?? '—',
                $req->phone ?? '—',
                $whatsapp ?? '—',
                $req->city ?? '—',
                $req->interestedDepartment?->name ?? '—',
                $mountain ?? '—',
                $statut,
                $req->admin_notes ?? '',
            ];
        }
        return $rows;
    }

    public function headings(): array
    {
        return [
            '#', 'Date', 'Prénom', 'Nom', 'Téléphone', 'WhatsApp',
            "Lieu d'habitation", 'Département', 'Montagne', 'Statut', 'Notes',
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastCol = 'K';
                $lastRow = $sheet->getHighestRow();

                // Header ivoire + logo/titre
                $sheet->getStyle("A1:{$lastCol}3")->applyFromArray([
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FAF6EE']],
                ]);
                $sheet->mergeCells('A1:B3');
                $sheet->mergeCells("C1:{$lastCol}3");
                $sheet->setCellValue('C1', 'NEW WINE CHURCH');
                $sheet->getStyle('C1')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 22, 'color' => ['rgb' => '8B1A2F']],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical'   => Alignment::VERTICAL_CENTER,
                    ],
                ]);

                if ($logoPath = $this->resolveLogoPath()) {
                    try {
                        $drawing = new Drawing();
                        $drawing->setName('Logo NWC');
                        $drawing->setPath($logoPath);
                        $drawing->setHeight(70);
                        $drawing->setCoordinates('A1');
                        $drawing->setOffsetX(15);
                        $drawing->setOffsetY(8);
                        $drawing->setWorksheet($sheet);
                    } catch (\Throwable $e) {
                    }
                }

                // Titre bordeaux
                $sheet->mergeCells("A4:{$lastCol}4");
                $sheet->setCellValue('A4', 'ENRÔLEMENTS — ' . strtoupper($this->event->title));
                $sheet->getStyle('A4')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => 'FFFFFF']],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical'   => Alignment::VERTICAL_CENTER,
                    ],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '8B1A2F']],
                ]);

                // Sous-titre méta
                $sheet->mergeCells("A5:{$lastCol}5");
                $total = max(0, $lastRow - 6);
                $sheet->setCellValue('A5', sprintf(
                    'Généré le %s   ·   %d enrôlement(s)',
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

                $sheet->getRowDimension(1)->setRowHeight(30);
                $sheet->getRowDimension(2)->setRowHeight(30);
                $sheet->getRowDimension(3)->setRowHeight(30);
                $sheet->getRowDimension(4)->setRowHeight(30);
                $sheet->getRowDimension(5)->setRowHeight(24);

                // En-têtes colonnes
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

                // Corps
                if ($lastRow >= 7) {
                    for ($row = 7; $row <= $lastRow; $row++) {
                        $bg = ($row % 2 === 0) ? 'FFFFFF' : 'FAF6EE';
                        $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg]],
                            'borders' => [
                                'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E0D0']],
                            ],
                            'alignment' => [
                                'vertical' => Alignment::VERTICAL_CENTER,
                                'wrapText' => true,
                            ],
                            'font' => ['size' => 10, 'color' => ['rgb' => '1F1A14']],
                        ]);
                    }

                    // # (A), Date (B), Souhait (H), Statut (J) centrés
                    foreach (['A', 'B', 'H', 'J'] as $col) {
                        $sheet->getStyle("{$col}7:{$col}{$lastRow}")
                            ->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    }

                    // Nom (D) en gras
                    $sheet->getStyle("D7:D{$lastRow}")->getFont()->setBold(true);

                    // Coloration du statut (colonne J)
                    for ($row = 7; $row <= $lastRow; $row++) {
                        $st = $sheet->getCell("J{$row}")->getValue();
                        $color = match ($st) {
                            'Contacté' => '2563EB',
                            'Converti' => '15803D',
                            'Écarté'   => '9CA3AF',
                            default    => 'C9A961', // Nouveau
                        };
                        $sheet->getStyle("J{$row}")->applyFromArray([
                            'font' => ['bold' => true, 'color' => ['rgb' => $color], 'size' => 10],
                        ]);
                    }
                }

                $sheet->freezePane('C7');

                // Footer
                $footerRow = max($lastRow, 6) + 2;
                $sheet->mergeCells("A{$footerRow}:{$lastCol}{$footerRow}");
                $sheet->setCellValue("A{$footerRow}",
                    '© New Wine Church  ·  Document confidentiel  ·  Liste enrôlements événement'
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
            dirname(base_path()) . '/domains/newinechurch.org/public_html/logos/logo_newwine.png',
        ];
        foreach ($candidates as $path) {
            if ($path && @file_exists($path) && @filesize($path) > 500) return $path;
        }
        $cached = storage_path('app/exports-logo-cache/logo_newwine.png');
        if (@file_exists($cached) && filesize($cached) > 500) return $cached;
        return null;
    }
}
