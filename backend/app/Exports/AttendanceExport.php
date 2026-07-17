<?php

namespace App\Exports;

use App\Models\Event;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
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
 * Export Excel de la liste de présence d'un événement.
 *
 * Colonnes : # | Prénom | Nom | Téléphone | Email | Type ticket | Code | Heure d'arrivée | Scanné par
 *
 * Design identique à MembersExport (charte NWC ivoire chaud + bordeaux).
 */
class AttendanceExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithEvents, WithTitle, WithStartRow
{
    private int $rowNumber = 0;

    public function __construct(protected Event $event) {}

    public function title(): string
    {
        return 'Présence — ' . mb_substr($this->event->title, 0, 20);
    }

    public function startRow(): int
    {
        return 6;
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
            $ticket->first_name,
            $ticket->last_name,
            $ticket->phone,
            $ticket->email,
            $ticket->ticketType?->name ?? 'Standard',
            strtoupper($ticket->short_code ?? ''),
            $ticket->used_at?->format('H:i:s'),
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
                $lastCol = 'I'; // 9 colonnes
                $lastRow = $sheet->getHighestRow();

                // === 1. HEADER — Logo + fond ivoire ===
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

                // === 2. TITRE — Liste de présence + event ===
                $sheet->mergeCells("A4:{$lastCol}4");
                $sheet->setCellValue('A4', 'LISTE DE PRÉSENCE — ' . strtoupper($this->event->title));
                $sheet->getStyle('A4')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 13, 'color' => ['rgb' => '1F1A14']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F0E7D1']],
                ]);

                // === 3. Sous-titre — date event + généré le + stats ===
                $sheet->mergeCells("A5:{$lastCol}5");
                $eventDate = $this->event->starts_at
                    ? $this->event->starts_at->locale('fr')->isoFormat('LL [à] HH:mm')
                    : '—';
                $total = max(0, $lastRow - 6);
                $sheet->setCellValue('A5', sprintf(
                    'Événement : %s · Généré le %s · %d personne(s) présente(s)',
                    $eventDate,
                    now()->locale('fr')->isoFormat('LL [à] HH:mm'),
                    $total,
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

                // === 4. EN-TÊTES COLONNES ligne 6 — bordeaux + blanc ===
                $sheet->getStyle("A6:{$lastCol}6")->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '8B1A2F']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '6B1422']]],
                ]);
                $sheet->getRowDimension(6)->setRowHeight(24);

                // === 5. Zébrures + bordures ===
                if ($lastRow > 6) {
                    for ($row = 7; $row <= $lastRow; $row++) {
                        $bg = ($row % 2 === 0) ? 'FFFFFF' : 'FAF6EE';
                        $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg]],
                            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E0D0']]],
                            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                            'font' => ['size' => 10, 'color' => ['rgb' => '1F1A14']],
                        ]);
                    }
                    $sheet->getStyle("A7:A{$lastRow}")->getFont()->setBold(true);
                    $sheet->getStyle("A7:A{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    // Heure centrée + monospace-like
                    $sheet->getStyle("H7:H{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $sheet->getStyle("H7:H{$lastRow}")->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('8B1A2F'));
                    // Code court en majuscules
                    $sheet->getStyle("G7:G{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $sheet->getStyle("G7:G{$lastRow}")->getFont()->setBold(true);
                }

                // Freeze : header + colonne # visible
                $sheet->freezePane('B7');

                // Footer
                $footerRow = $lastRow + 2;
                $sheet->mergeCells("A{$footerRow}:{$lastCol}{$footerRow}");
                $sheet->setCellValue("A{$footerRow}",
                    '© New Wine Church · Document confidentiel — Liste de présence billetterie'
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
