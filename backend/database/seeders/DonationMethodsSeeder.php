<?php

namespace Database\Seeders;

use App\Models\DonationMethod;
use Illuminate\Database\Seeder;

/**
 * Seeder — 4 opérateurs Mobile Money courants en Côte d'Ivoire.
 * L'admin peut ajouter / modifier les numéros via /admin/donation-methods.
 */
class DonationMethodsSeeder extends Seeder
{
    public function run(): void
    {
        $methods = [
            [
                'name'           => 'Orange Money',
                'code'           => 'orange_money',
                'account_number' => '+225 07 00 00 00 00',
                'recipient_name' => 'NEW WINE CHURCH',
                'logo_path'      => 'operators/orange-money.svg',
                'color_hex'      => '#FF7900',
                'ussd_code'      => '#144#',
                'instructions'   => "1. Composez #144#\n2. Choisissez « Transfert d'argent »\n3. Entrez le numéro et le montant\n4. Confirmez avec votre code secret\n5. Notez la référence et collez-la dans le formulaire ci-dessous.",
                'sort_order'     => 1,
            ],
            [
                'name'           => 'MTN Mobile Money',
                'code'           => 'mtn_momo',
                'account_number' => '+225 05 00 00 00 00',
                'recipient_name' => 'NEW WINE CHURCH',
                'logo_path'      => 'operators/mtn-momo.svg',
                'color_hex'      => '#FFCB05',
                'ussd_code'      => '*133#',
                'instructions'   => "1. Composez *133#\n2. Choisissez « Transfert »\n3. Entrez le numéro et le montant\n4. Validez avec votre code MoMo\n5. Notez le code de transaction et collez-le ci-dessous.",
                'sort_order'     => 2,
            ],
            [
                'name'           => 'Moov Money',
                'code'           => 'moov_money',
                'account_number' => '+225 01 00 00 00 00',
                'recipient_name' => 'NEW WINE CHURCH',
                'logo_path'      => 'operators/moov-money.svg',
                'color_hex'      => '#0078D4',
                'ussd_code'      => '*155#',
                'instructions'   => "1. Composez *155#\n2. Choisissez « Transfert d'argent »\n3. Entrez le numéro et le montant\n4. Confirmez avec votre code PIN\n5. Notez la référence et collez-la ci-dessous.",
                'sort_order'     => 3,
            ],
            [
                'name'           => 'Wave',
                'code'           => 'wave',
                'account_number' => '+225 07 00 00 00 00',
                'recipient_name' => 'NEW WINE CHURCH',
                'logo_path'      => 'operators/wave.svg',
                'color_hex'      => '#1DC8FF',
                'ussd_code'      => null,
                'instructions'   => "1. Ouvrez l'application Wave\n2. Tapez sur « Envoyer de l'argent »\n3. Entrez le numéro et le montant\n4. Validez la transaction\n5. Notez l'ID de transaction et collez-le ci-dessous.",
                'sort_order'     => 4,
            ],
        ];

        foreach ($methods as $m) {
            DonationMethod::updateOrCreate(['code' => $m['code']], $m);
        }

        $this->command->info('  ✓ '.count($methods).' méthodes de don seedées (Orange/MTN/Moov/Wave)');
    }
}
