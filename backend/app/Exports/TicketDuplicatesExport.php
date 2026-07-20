<?php

namespace App\Exports;

use App\Models\Event;
use App\Services\TicketDuplicateDetector;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithStartRow;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;

/**
 * Export Excel des doublons potentiels pour un événement.
 *
 * Structure :
 *  - Header NWC (logo + titre + événement + date export)
 *  - En-têtes colonnes
 *  - Une ligne par ticket, groupée par groupe de doublon
 *  - Ligne séparatrice entre 2 groupes
 *
 * Colonnes : Groupe # | Confiance | Critère | Nom | Prénom | Email | Téléphone | Code | Statut | Type ticket | Date achat
 */
class TicketDuplicatesExport implements FromArray, WithEvents, WithTitle, WithStartRow, ShouldAutoSize
{
    public function __construct(
        protected Event $event,
        protected TicketDuplicateDetector $detector,
    ) {}

    public function title(): string
    {
        return 'Doublons — ' . mb_substr($this->event->title, 0, 20);
    }

    public function startRow(): int
    {
        return 6;
    }

    public function array(): array
    {
        $groups = $this->detector->forEvent($this->event->id);

        // En-têtes ligne 6
        $rows = [[
            '#', 'Groupe', 'Confiance', 'Critère', 'Prénom', 'Nom', 'Email', 'Téléphone',
            'Code', 'Statut', 'Type', 'Date achat',
        ]];

        $groupNum = 1;
        $ticketIndex = 1;
        foreach ($groups as $group) {
            foreach ($group['tickets'] as $t) {
                $rows[] = [
                    $ticketIndex++,
                    'Groupe ' . $groupNum,
                    strtoupper($group['confidence']),
                    $group['match_label'],
                    $t['first_name'],
                    $t['last_name'],
                    $t['email'],
                    $t['phone'],
                    strtoupper($t['short_code'] ?? ''),
                    strtoupper($t['status'] ?? ''),
                    $t['ticket_type'] ?? 'Standard',
                    $t['created_at']
                        ? \Carbon\Carbon::parse($t['created_at'])->locale('fr')->isoFormat('LL')
                        : '—',
                ];
            }
            // Ligne séparatrice vide entre groupes
            $rows[] = ['', '', '', '', '', '', '', '', '', '', '', ''];
            $groupNum++;
        }

        // Enlève la dernière ligne vide si groupes présents
        if (count($groups) > 0 && end($rows)[0] === '') {
            array_pop($rows);
        }

        return $rows;
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastCol = 'L';
                $lastRow = $sheet->getHighestRow();

                // === HEADER : logo + fond ivoire ===
                $sheet->mergeCells("A1:{$lastCol}3");
                $sheet->setCellValue('A1', 'NEW WINE CHURCH');
                $sheet->getStyle('A1')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 18, 'color' => ['rgb' => '8B1A2F']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FAF6EE']],
                ]);

                $logoPath = $this->resolveLogoPath();
                if ($logoPath) {
                    $drawing = new Drawing();
                    $drawing->setName('Logo NWC');
                    $drawing->setPath($logoPath);
                    $drawing->setHeight(60);
                    $drawing->setCoordinates('A1');
                    $drawing->setOffsetX(10);
                    $drawing->setOffsetY(5);
                    $drawing->setWorksheet($sheet);
                }

                // Titre + sous-titre
                $sheet->mergeCells("A4:{$lastCol}4");
                $sheet->setCellValue('A4', 'DOUBLONS POTENTIELS — ' . strtoupper($this->event->title));
                $sheet->getStyle('A4')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 13, 'color' => ['rgb' => '1F1A14']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F0E7D1']],
                ]);

                $sheet->mergeCells("A5:{$lastCol}5");
                $sheet->setCellValue('A5', sprintf(
                    'Export du %s — vérifier chaque groupe et annuler les vrais doublons',
                    now()->locale('fr')->isoFormat('LL [à] HH:mm'),
                ));
                $sheet->getStyle('A5')->applyFromArray([
                    'font' => ['size' => 10, 'italic' => true, 'color' => ['rgb' => '6B5F4E']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F0E7D1']],
                ]);

                $sheet->getRowDimension(1)->setRowHeight(28);
                $sheet->getRowDimension(2)->setRowHeight(28);
                $sheet->getRowDimension(3)->setRowHeight(28);
                $sheet->getRowDimension(4)->setRowHeight(22);
                $sheet->getRowDimension(5)->setRowHeight(20);

                // En-têtes colonnes ligne 6 — bordeaux + blanc
                $sheet->getStyle("A6:{$lastCol}6")->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '8B1A2F']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '6B1422']]],
                ]);
                $sheet->getRowDimension(6)->setRowHeight(24);

                // Corps
                if ($lastRow > 6) {
                    for ($row = 7; $row <= $lastRow; $row++) {
                        $isSeparator = trim((string) $sheet->getCell("A{$row}")->getValue()) === '';
                        if ($isSeparator) {
                            // Ligne séparatrice grise fine
                            $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray([
                                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E5E0D0']],
                            ]);
                            $sheet->getRowDimension($row)->setRowHeight(4);
                            continue;
                        }

                        // Couleur de fond selon niveau confiance (colonne C)
                        $confidence = strtolower((string) $sheet->getCell("C{$row}")->getValue());
                        $bg = 'FFFFFF';
                        if ($confidence === 'certain')  $bg = 'FCE7EB';   // rouge très pâle
                        if ($confidence === 'probable') $bg = 'FFF3E0';   // orange très pâle

                        $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg]],
                            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E0D0']]],
                            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                            'font' => ['size' => 10, 'color' => ['rgb' => '1F1A14']],
                        ]);

                        // Colonne confiance en gras coloré
                        $confColor = $confidence === 'certain' ? '8B1A2F' : ($confidence === 'probable' ? 'E65100' : '999999');
                        $sheet->getStyle("C{$row}")->applyFromArray([
                            'font' => ['bold' => true, 'color' => ['rgb' => $confColor], 'size' => 10],
                            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                        ]);
                        // # centré
                        $sheet->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                        // Groupe centré + gras
                        $sheet->getStyle("B{$row}")->getFont()->setBold(true);
                        $sheet->getStyle("B{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                        // Code monospace-ish
                        $sheet->getStyle("I{$row}")->getFont()->setBold(true);
                        $sheet->getStyle("I{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    }
                }

                // Freeze header
                $sheet->freezePane('A7');

                // Footer
                $footerRow = $lastRow + 2;
                $sheet->mergeCells("A{$footerRow}:{$lastCol}{$footerRow}");
                $sheet->setCellValue("A{$footerRow}",
                    '© New Wine Church · Doublons billetterie — usage interne uniquement',
                );
                $sheet->getStyle("A{$footerRow}")->applyFromArray([
                    'font' => ['italic' => true, 'size' => 9, 'color' => ['rgb' => '999999']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);
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
