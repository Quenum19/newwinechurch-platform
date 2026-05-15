<?php

namespace Database\Seeders;

use App\Models\Cell;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeder — Crée un mandat historique cell_leaders pour chaque leader de cellule.
 *
 * Le leader est déjà assigné dans CellSeeder (cells.leader_id + is_cell_leader=true).
 * Ce seeder ajoute simplement la ligne d'historique avec appointed_at / ended_at=null.
 */
class CellLeaderSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $count = 0;

        $cells = Cell::whereNotNull('leader_id')->get();

        foreach ($cells as $cell) {
            DB::table('cell_leaders')->insert([
                'cell_id'      => $cell->id,
                'user_id'      => $cell->leader_id,
                'is_primary'   => true,
                'appointed_at' => $now->copy()->subMonths(rand(2, 12))->toDateString(),
                'ended_at'     => null,
                'appointed_by' => null,
                'notes'        => 'Nomination initiale (seed).',
                'created_at'   => $now,
                'updated_at'   => $now,
            ]);
            $count++;
        }

        $this->command->info("  ✓ {$count} mandats leader cellule historisés");
    }
}
