<?php

namespace App\Exports;

use App\Models\User;
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
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;

/**
 * Export Excel des membres NWC — design professionnel.
 *
 * Mise en page :
 *  - Logo NWC en haut à gauche (ligne 1-3)
 *  - Titre du document en gras + métadonnées (date export, total, filtres actifs)
 *  - En-têtes colonnes : fond bordeaux (#8B1A2F = adm-accent NWC), texte blanc
 *  - Lignes alternées blanc / ivoire (#FAF6EE) pour lisibilité
 *  - Bordures fines + auto-size colonnes
 *  - Pied de page : nb total + signature "New Wine Church"
 *
 * Hérite des filtres passés depuis MembersController.
 */
class MembersExport implements FromQuery, WithHeadings, WithMapping, ShouldAutoSize, WithEvents, WithTitle, WithStartRow
{
    public function __construct(protected array $filters = []) {}

    public function title(): string
    {
        return 'Membres NWC';
    }

    /**
     * Les en-têtes commencent ligne 6 (lignes 1-5 réservées au header design).
     */
    public function startRow(): int
    {
        return 6;
    }

    public function query()
    {
        $query = User::query()->with('roles', 'departments');

        if (! empty($this->filters['ids']) && is_array($this->filters['ids'])) {
            return $query->whereIn('id', $this->filters['ids'])->orderBy('name');
        }

        if ($search = $this->filters['search'] ?? null) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        if ($status = $this->filters['status'] ?? null) {
            $query->where('status', $status);
        }
        if ($role = $this->filters['role'] ?? null) {
            $query->whereHas('roles', fn ($q) => $q->where('name', $role));
        }
        if (! empty($this->filters['trashed'])) {
            $query->onlyTrashed();
        }

        return $query->orderBy('name');
    }

    public function headings(): array
    {
        return [
            'ID', 'Prénom', 'Nom', 'Email', 'Téléphone',
            'Genre', 'Date de naissance', 'Ville', 'Adresse',
            'Statut', 'Baptisé', 'Date d\'arrivée', 'Email vérifié',
            'Rôles', 'Départements', 'Inscrit le',
        ];
    }

    public function map($user): array
    {
        return [
            $user->id,
            $user->first_name,
            $user->name,
            $user->email,
            $user->phone,
            $user->gender,
            $user->birth_date?->format('d/m/Y'),
            $user->city,
            $user->address,
            $user->status,
            $user->is_baptized ? 'Oui' : 'Non',
            $user->joined_at?->format('d/m/Y'),
            $user->email_verified_at ? 'Oui' : 'Non',
            $user->roles->pluck('name')->implode(', '),
            $user->departments->pluck('name')->implode(', '),
            $user->created_at?->format('d/m/Y H:i'),
        ];
    }

    /**
     * Stylisation post-rendu via PhpSpreadsheet.
     * Header (ligne 1-5) + en-têtes colonnes (ligne 6) + zébrures lignes.
     */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastCol = 'P'; // 16 colonnes
                $lastRow = $sheet->getHighestRow();

                // === 1. HEADER : logo + titre ===
                $sheet->mergeCells("A1:{$lastCol}3");
                $sheet->setCellValue('A1', 'NEW WINE CHURCH');
                $sheet->getStyle('A1')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 18, 'color' => ['rgb' => '8B1A2F']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FAF6EE']],
                ]);

                // Logo résolu via plusieurs chemins (dev/prod Hostinger différent).
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

                // === 2. SOUS-TITRE : type d'export + filtres + date ===
                $sheet->mergeCells("A4:{$lastCol}4");
                $sheet->setCellValue('A4', 'ANNUAIRE DES MEMBRES');
                $sheet->getStyle('A4')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 13, 'color' => ['rgb' => '1F1A14']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F0E7D1']],
                ]);

                $sheet->mergeCells("A5:{$lastCol}5");
                $sheet->setCellValue('A5', sprintf(
                    'Export du %s · %d membre(s) · %s',
                    now()->locale('fr')->isoFormat('LL [à] HH:mm'),
                    max(0, $lastRow - 6),
                    $this->describeFilters(),
                ));
                $sheet->getStyle('A5')->applyFromArray([
                    'font' => ['size' => 10, 'italic' => true, 'color' => ['rgb' => '6B5F4E']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F0E7D1']],
                ]);

                // Hauteur des lignes header pour aérer
                $sheet->getRowDimension(1)->setRowHeight(28);
                $sheet->getRowDimension(2)->setRowHeight(28);
                $sheet->getRowDimension(3)->setRowHeight(28);
                $sheet->getRowDimension(4)->setRowHeight(22);
                $sheet->getRowDimension(5)->setRowHeight(20);

                // === 3. EN-TÊTES COLONNES (ligne 6) — fond bordeaux + blanc ===
                $sheet->getStyle("A6:{$lastCol}6")->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '8B1A2F']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '6B1422']]],
                ]);
                $sheet->getRowDimension(6)->setRowHeight(24);

                // === 4. CORPS — zébrures + bordures + alignement ===
                if ($lastRow > 6) {
                    // Lignes alternées : pair = blanc, impair = ivoire chaud
                    for ($row = 7; $row <= $lastRow; $row++) {
                        $bg = ($row % 2 === 0) ? 'FFFFFF' : 'FAF6EE';
                        $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg]],
                            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E0D0']]],
                            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => false],
                            'font' => ['size' => 10, 'color' => ['rgb' => '1F1A14']],
                        ]);
                    }
                    // ID en gras
                    $sheet->getStyle("A7:A{$lastRow}")->getFont()->setBold(true);
                    // Statut, Baptisé, Email vérifié centrés
                    foreach (['J', 'K', 'M'] as $col) {
                        $sheet->getStyle("{$col}7:{$col}{$lastRow}")->getAlignment()
                              ->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    }
                }

                // === 5. Freeze : header + colonnes ID/Prénom/Nom toujours visibles ===
                $sheet->freezePane('D7');

                // === 6. Footer ===
                $footerRow = $lastRow + 2;
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

    /**
     * Résout le chemin du logo NWC.
     *
     * Tente plusieurs chemins (dev local Wamp + prod Hostinger structure
     * /nwc_backend séparé de /public_html). Si rien en local, télécharge
     * une fois via HTTP depuis le frontend public et met en cache temp.
     */
    protected function resolveLogoPath(): ?string
    {
        // 1. Chemins locaux probables
        $candidates = [
            public_path('logos/logo_newwine.png'),
            base_path('public/logos/logo_newwine.png'),
            // En prod Hostinger : nwc_backend frère de public_html
            dirname(base_path()) . '/public_html/logos/logo_newwine.png',
        ];
        foreach ($candidates as $path) {
            if ($path && @file_exists($path)) return $path;
        }

        // 2. Cache local du logo téléchargé (évite refetch à chaque export)
        $cached = storage_path('app/exports-logo-cache/logo_newwine.png');
        if (@file_exists($cached) && filesize($cached) > 500) return $cached;

        // 3. Fallback : télécharge depuis le frontend public
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
        } catch (\Throwable $e) {
            // silencieux : on retourne null, l'export se fait sans logo
        }
        return null;
    }

    /**
     * Décrit les filtres actifs en sous-titre. Vide → "tous les membres".
     */
    private function describeFilters(): string
    {
        $parts = [];
        if (! empty($this->filters['ids'])) {
            return 'sélection ciblée (' . count($this->filters['ids']) . ' membres)';
        }
        if (! empty($this->filters['search']))  $parts[] = 'recherche : "' . $this->filters['search'] . '"';
        if (! empty($this->filters['status']))  $parts[] = 'statut : ' . $this->filters['status'];
        if (! empty($this->filters['role']))    $parts[] = 'rôle : ' . $this->filters['role'];
        if (! empty($this->filters['trashed'])) $parts[] = 'corbeille uniquement';

        return $parts ? 'filtres : ' . implode(' · ', $parts) : 'tous les membres';
    }
}
