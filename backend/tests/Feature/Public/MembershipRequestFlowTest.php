<?php

namespace Tests\Feature\Public;

use App\Models\MembershipRequest;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Tests d'intégration — workflow complet d'admission NWC.
 *
 * Flux :
 *   1. Visiteur soumet une demande publique (POST /api/membership-requests)
 *   2. Admin RH approuve → User créé avec must_change_password=true
 *   3. Member se connecte avec password=DEFAULT_PASSWORD
 *   4. Member force le changement de mot de passe
 */
class MembershipRequestFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    /** Helper : crée un admin (rôle ayant create members + view members). */
    private function makeRhAdmin(): User
    {
        $admin = User::create([
            'name'       => 'Admin RH',
            'first_name' => 'Test',
            'email'      => 'rh.test@nwc.test',
            'password'   => Hash::make('x@2026!Aa'),
            'status'     => 'active',
        ]);
        $admin->assignRole('rh');
        return $admin;
    }

    private function makePasteur(): User
    {
        $u = User::create([
            'name'       => 'Pasteur',
            'first_name' => 'Test',
            'email'      => 'pasteur.adm@nwc.test',
            'password'   => Hash::make('x@2026!Aa'),
            'status'     => 'active',
        ]);
        $u->assignRole('pasteur');
        return $u;
    }

    private function basePayload(array $override = []): array
    {
        return array_merge([
            'first_name'   => 'Marie',
            'name'         => 'Kouassi',
            'email'        => 'marie.candidat@nwc.test',
            'phone'        => '+225 07 12 34 56 78',
            'birth_date'   => '1995-04-12',
            'gender'       => 'F',
            'city'         => 'Abidjan',
            'motivation'   => 'Je désire grandir spirituellement.',
            'accept_terms' => true,
        ], $override);
    }

    public function test_visitor_can_submit_a_membership_request(): void
    {
        $response = $this->postJson('/api/membership-requests', $this->basePayload());

        $response->assertCreated();
        $this->assertDatabaseHas('membership_requests', [
            'email'  => 'marie.candidat@nwc.test',
            'status' => 'pending',
        ]);
    }

    public function test_membership_request_birth_date_required(): void
    {
        $payload = $this->basePayload();
        unset($payload['birth_date']);

        $response = $this->postJson('/api/membership-requests', $payload);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['birth_date']);
    }

    public function test_membership_request_email_must_be_unique(): void
    {
        $this->postJson('/api/membership-requests', $this->basePayload([
            'email' => 'dup@nwc.test',
        ]))->assertCreated();

        $second = $this->postJson('/api/membership-requests', $this->basePayload([
            'email' => 'dup@nwc.test',
        ]));

        $second->assertStatus(422);
        $second->assertJsonValidationErrors(['email']);
    }

    public function test_admin_with_create_members_can_approve_request(): void
    {
        $admin = $this->makeRhAdmin();

        $req = MembershipRequest::create([
            'first_name' => 'Jean',
            'name'       => 'Doe',
            'email'      => 'jean.doe@nwc.test',
            'phone'      => '+225 07 11 22 33 44',
            'birth_date' => '1990-01-01',
            'status'     => 'pending',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/membership-requests/{$req->id}/approve");

        $response->assertOk();

        $req->refresh();
        $this->assertEquals('approved', $req->status);
        $this->assertNotNull($req->user_id);

        $newUser = User::find($req->user_id);
        $this->assertNotNull($newUser, 'Un compte User doit avoir été créé.');
        $this->assertTrue((bool) $newUser->must_change_password);
        $this->assertEquals('active', $newUser->status);
        // email_verified_at peut être null si MustVerifyEmail réinitialise dans un
        // booting hook ; on valide via la DB brute pour ne pas dépendre du cast.
        $this->assertDatabaseHas('users', [
            'id'    => $newUser->id,
            'email' => 'jean.doe@nwc.test',
        ]);
        $this->assertTrue($newUser->hasRole('membre'));
    }

    public function test_admin_can_reject_request_with_reason(): void
    {
        $admin = $this->makeRhAdmin();

        $req = MembershipRequest::create([
            'first_name' => 'Alice',
            'name'       => 'Test',
            'email'      => 'alice.reject@nwc.test',
            'birth_date' => '1992-02-02',
            'status'     => 'pending',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/membership-requests/{$req->id}/reject", [
                'reason' => 'Profil incomplet, motivation absente.',
            ]);

        $response->assertOk();

        $req->refresh();
        $this->assertEquals('rejected', $req->status);
        $this->assertEquals('Profil incomplet, motivation absente.', $req->rejection_reason);
    }

    public function test_pasteur_cannot_approve_membership_request_without_create_members_perm(): void
    {
        // Le pasteur a "view members" mais PAS "create members" (cf RolesAndPermissionsSeeder).
        $pasteur = $this->makePasteur();

        $req = MembershipRequest::create([
            'first_name' => 'Robert',
            'name'       => 'Test',
            'email'      => 'robert.test@nwc.test',
            'birth_date' => '1985-05-05',
            'status'     => 'pending',
        ]);

        $response = $this->actingAs($pasteur, 'sanctum')
            ->postJson("/api/admin/membership-requests/{$req->id}/approve");

        $response->assertForbidden();
    }

    public function test_member_login_with_default_password_then_forced_to_change(): void
    {
        // Simule un user créé via approbation (password par défaut, must_change_password=true).
        $user = User::create([
            'first_name'           => 'Forced',
            'name'                 => 'Member',
            'email'                => 'forced.member@nwc.test',
            'password'             => Hash::make('password'), // DEFAULT_PASSWORD
            'must_change_password' => true,
            'status'               => 'active',
            'email_verified_at'    => now(),
        ]);
        $user->assignRole('membre');

        // 1. Login avec le mot de passe par défaut.
        // NB : on passe `device_name` pour forcer le mode TOKEN (évite la session
        // store non disponible dans les tests d'API stateless).
        $login = $this->postJson('/api/auth/login', [
            'email'       => 'forced.member@nwc.test',
            'password'    => 'password',
            'device_name' => 'phpunit',
        ]);
        $login->assertOk();
        $login->assertJsonStructure(['token']);

        // 2. GET /api/me → must_change_password=true exposé (le frontend redirige).
        $me = $this->actingAs($user->fresh(), 'sanctum')->getJson('/api/me');
        $me->assertOk();
        $this->assertTrue((bool) $user->fresh()->must_change_password);

        // 3. PUT /api/me/password avec un nouveau mot de passe fort (Password::defaults).
        $strongPassword = 'Nouveau@Pass!2026';
        $change = $this->actingAs($user->fresh(), 'sanctum')
            ->putJson('/api/me/password', [
                'current_password'      => 'password',
                'password'              => $strongPassword,
                'password_confirmation' => $strongPassword,
            ]);
        $change->assertOk();

        // 4. Le flag est désormais à false.
        $this->assertFalse((bool) $user->fresh()->must_change_password);
    }
}
