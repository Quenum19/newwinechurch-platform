<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;

/**
 * Export Excel du rapport de présence — design pro NWC.
 *
 * Écriture manuelle via setCellValue dans AfterSheet (idem
 * EventEnrolementsExport) : la combinaison FromArray + WithStartRow +
 * WithHeadings a montré ses limites en Maatwebsite 3.1.x.
 */
class AttendanceReportExport implements WithEvents, WithTitle, WithColumnWidths
{
    public function __construct(protected array $data) {}

    public function title(): string
    {
        return 'Rapport présence';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 6, 'B' => 22, 'C' => 22, 'D' => 18,
            'E' => 32, 'F' => 18, 'G' => 14,
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastCol = 'G';

                $ev      = $this->data['event'];
                $kpi     = $this->data['kpi'];
                $rows    = $this->data['rows'];
                $section = $this->data['section_label'];

                $headings = ['N°', 'Nom', 'Prénom', 'Téléphone', 'Email', 'Type', 'Code'];
                $headingRow = 8;
                $dataStart  = 9;
                $lastRow    = $dataStart + max(0, $rows->count() - 1);

                // === Headings ===
                foreach ($headings as $i => $h) {
                    $col = Coordinate::stringFromColumnIndex($i + 1);
                    $sheet->setCellValue("{$col}{$headingRow}", $h);
                }

                // === Data ===
                $rowNum = 0;
                foreach ($rows as $t) {
                    $rowNum++;
                    $r = $dataStart + $rowNum - 1;
                    $sheet->setCellValue("A{$r}", $rowNum);
                    $sheet->setCellValueExplicit("B{$r}", (string)($t->last_name ?? '—'), DataType::TYPE_STRING);
                    $sheet->setCellValueExplicit("C{$r}", (string)($t->first_name ?? '—'), DataType::TYPE_STRING);
                    $sheet->setCellValueExplicit("D{$r}", (string)($t->phone ?? '—'), DataType::TYPE_STRING);
                    $sheet->setCellValueExplicit("E{$r}", (string)($t->email ?? '—'), DataType::TYPE_STRING);
                    $sheet->setCellValueExplicit("F{$r}", (string)($t->ticketType?->name ?? '—'), DataType::TYPE_STRING);
                    $sheet->setCellValueExplicit("G{$r}", strtoupper((string)($t->short_code ?? '—')), DataType::TYPE_STRING);
                }

                // === Header ivoire + logo ===
                $sheet->getStyle("A1:{$lastCol}3")->applyFromArray([
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FAF6EE']],
                ]);
                $sheet->mergeCells('A1:B3');
                $sheet->mergeCells("C1:{$lastCol}3");
                $sheet->setCellValue('C1', 'NEW WINE CHURCH');
                $sheet->getStyle('C1')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 22, 'color' => ['rgb' => '8B1A2F']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                ]);
                if ($logoPath = $this->resolveLogoPath()) {
                    try {
                        $drawing = new Drawing();
                        $drawing->setName('Logo NWC')
                            ->setPath($logoPath)
                            ->setHeight(70)
                            ->setCoordinates('A1')
                            ->setOffsetX(15)
                            ->setOffsetY(8)
                            ->setWorksheet($sheet);
                    } catch (\Throwable $e) {}
                }

                // Titre bordeaux
                $sheet->mergeCells("A4:{$lastCol}4");
                $sheet->setCellValue('A4', 'RAPPORT DE PRÉSENCE — ' . mb_strtoupper($ev->title));
                $sheet->getStyle('A4')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => 'FFFFFF']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '8B1A2F']],
                ]);

                // Sous-titre + méta
                $sheet->mergeCells("A5:{$lastCol}5");
                $sheet->setCellValue('A5', sprintf(
                    '%s · Généré le %s',
                    $section,
                    now()->locale('fr')->isoFormat('LL [à] HH:mm')
                ));
                $sheet->getStyle('A5')->applyFromArray([
                    'font' => ['size' => 11, 'italic' => true, 'color' => ['rgb' => '6B5F4E']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F5EFE2']],
                ]);

                // Bandeau KPI (row 6-7) : 4 cellules alignées avec titre + valeur
                $sheet->setCellValue('A6', 'ATTENDUS');
                $sheet->setCellValue('A7', $kpi['total_expected']);
                $sheet->setCellValue('C6', 'PRÉSENTS');
                $sheet->setCellValue('C7', $kpi['total_arrived']);
                $sheet->setCellValue('E6', 'NO-SHOWS');
                $sheet->setCellValue('E7', $kpi['no_shows_count']);
                $sheet->setCellValue('G6', 'TAUX');
                $sheet->setCellValue('G7', ($kpi['taux_presence'] ?? 0) . '%');

                foreach (['A', 'C', 'E', 'G'] as $col) {
                    $sheet->getStyle("{$col}6")->applyFromArray([
                        'font' => ['bold' => true, 'size' => 9, 'color' => ['rgb' => '8B1A2F']],
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    ]);
                    $sheet->getStyle("{$col}7")->applyFromArray([
                        'font' => ['bold' => true, 'size' => 16, 'color' => ['rgb' => '1F1A14']],
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    ]);
                }

                $sheet->getRowDimension(1)->setRowHeight(30);
                $sheet->getRowDimension(2)->setRowHeight(30);
                $sheet->getRowDimension(3)->setRowHeight(30);
                $sheet->getRowDimension(4)->setRowHeight(30);
                $sheet->getRowDimension(5)->setRowHeight(22);
                $sheet->getRowDimension(6)->setRowHeight(18);
                $sheet->getRowDimension(7)->setRowHeight(26);

                // En-têtes colonnes (row 8)
                $sheet->getStyle("A{$headingRow}:{$lastCol}{$headingRow}")->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '6B1422']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '4A0E1A']]],
                ]);
                $sheet->getRowDimension($headingRow)->setRowHeight(26);

                // Corps
                if ($rows->count() > 0) {
                    for ($r = $dataStart; $r <= $lastRow; $r++) {
                        $bg = ($r % 2 === 0) ? 'FFFFFF' : 'FAF6EE';
                        $sheet->getStyle("A{$r}:{$lastCol}{$r}")->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg]],
                            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E0D0']]],
                            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
                            'font' => ['size' => 10, 'color' => ['rgb' => '1F1A14']],
                        ]);
                    }
                    foreach (['A', 'D', 'F', 'G'] as $col) {
                        $sheet->getStyle("{$col}{$dataStart}:{$col}{$lastRow}")
                            ->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    }
                    $sheet->getStyle("B{$dataStart}:B{$lastRow}")->getFont()->setBold(true);
                }
                $sheet->freezePane("A{$dataStart}");

                // Footer
                $footerRow = max($lastRow, $headingRow) + 2;
                $sheet->mergeCells("A{$footerRow}:{$lastCol}{$footerRow}");
                $sheet->setCellValue("A{$footerRow}",
                    '© New Wine Church · Document confidentiel · Rapport de présence événement');
                $sheet->getStyle("A{$footerRow}")->applyFromArray([
                    'font' => ['italic' => true, 'size' => 9, 'color' => ['rgb' => 'A89A82']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);
            },
        ];
    }

    protected function resolveLogoPath(): ?string
    {
        $candidates = [];
        try { $candidates[] = public_path('logos/logo_newwine.png'); } catch (\Throwable $e) {}
        try { $candidates[] = base_path('public/logos/logo_newwine.png'); } catch (\Throwable $e) {}
        $candidates[] = '/home/u781799599/domains/newinechurch.org/public_html/logos/logo_newwine.png';
        try { $candidates[] = storage_path('app/exports-logo-cache/logo_newwine.png'); } catch (\Throwable $e) {}
        foreach ($candidates as $p) {
            if ($p && @file_exists($p) && @filesize($p) > 500) return $p;
        }
        return null;
    }
}
