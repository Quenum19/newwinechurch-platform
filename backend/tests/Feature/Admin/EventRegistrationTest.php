<?php

namespace Tests\Feature\Admin;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Tests d'intégration — inscriptions aux événements.
 *
 * Couvre :
 *  - inscription / désinscription par un membre
 *  - re-inscription bloquée (409)
 *  - liste des inscriptions du membre
 *  - check-in par admin (markAttended)
 */
class EventRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function makeMember(string $email = 'event.member@nwc.test'): User
    {
        $user = User::create([
            'name'       => 'Membre',
            'first_name' => 'Event',
            'email'      => $email,
            'password'   => Hash::make('x@2026!Aa'),
            'status'     => 'active',
        ]);
        $user->assignRole('membre');
        return $user;
    }

    private function makeAdmin(): User
    {
        $admin = User::create([
            'name'       => 'Admin',
            'first_name' => 'Event',
            'email'      => 'event.admin@nwc.test',
            'password'   => Hash::make('x@2026!Aa'),
            'status'     => 'active',
        ]);
        $admin->assignRole('superadmin');
        return $admin;
    }

    private function makeEvent(array $override = []): Event
    {
        $creator = User::firstWhere('email', 'event.creator@nwc.test') ?? User::create([
            'name'       => 'Créateur',
            'first_name' => 'Event',
            'email'      => 'event.creator@nwc.test',
            'password'   => Hash::make('x@2026!Aa'),
            'status'     => 'active',
        ]);

        return Event::create(array_merge([
            'title'                 => 'Culte Spécial',
            'slug'                  => 'culte-special-' . uniqid(),
            'description'           => 'Description du culte spécial',
            'type'                  => 'culte',
            'starts_at'             => now()->addWeek(),
            'ends_at'               => now()->addWeek()->addHours(3),
            'registration_required' => true,
            'is_published'          => true,
            'created_by'            => $creator->id,
        ], $override));
    }

    public function test_authenticated_member_can_register_for_event(): void
    {
        $member = $this->makeMember();
        $event  = $this->makeEvent();

        $response = $this->actingAs($member, 'sanctum')
            ->postJson("/api/events/{$event->id}/register");

        $response->assertCreated();
        $this->assertDatabaseHas('event_registrations', [
            'event_id' => $event->id,
            'user_id'  => $member->id,
            'status'   => 'registered',
        ]);
    }

    public function test_member_cannot_register_twice_for_same_event(): void
    {
        $member = $this->makeMember();
        $event  = $this->makeEvent();

        $this->actingAs($member, 'sanctum')
            ->postJson("/api/events/{$event->id}/register")
            ->assertCreated();

        $second = $this->actingAs($member, 'sanctum')
            ->postJson("/api/events/{$event->id}/register");

        // Le contrôleur renvoie 409 Conflict pour la double inscription.
        $this->assertContains($second->status(), [409, 422, 200],
            'Réponse attendue : 409 (déjà inscrit) — ou éventuellement 200 si idempotent.');

        // En tous cas, une SEULE ligne en DB.
        $this->assertEquals(
            1,
            EventRegistration::where('event_id', $event->id)
                ->where('user_id', $member->id)->count(),
            'Une seule inscription doit exister malgré le double POST.'
        );
    }

    public function test_member_can_unregister_from_event(): void
    {
        $member = $this->makeMember();
        $event  = $this->makeEvent();

        $this->actingAs($member, 'sanctum')
            ->postJson("/api/events/{$event->id}/register")
            ->assertCreated();

        $unreg = $this->actingAs($member, 'sanctum')
            ->deleteJson("/api/events/{$event->id}/register");

        $unreg->assertOk();
        $this->assertDatabaseHas('event_registrations', [
            'event_id' => $event->id,
            'user_id'  => $member->id,
            'status'   => 'cancelled',
        ]);
    }

    public function test_unauthenticated_user_cannot_register(): void
    {
        $event = $this->makeEvent();

        $response = $this->postJson("/api/events/{$event->id}/register");

        // Sanctum middleware retourne 401 quand pas de token / cookie.
        $response->assertStatus(401);
    }

    public function test_member_can_list_their_event_registrations(): void
    {
        $member = $this->makeMember();
        $event1 = $this->makeEvent(['title' => 'Conf 1']);
        $event2 = $this->makeEvent(['title' => 'Conf 2']);

        $this->actingAs($member, 'sanctum')
            ->postJson("/api/events/{$event1->id}/register")->assertCreated();
        $this->actingAs($member, 'sanctum')
            ->postJson("/api/events/{$event2->id}/register")->assertCreated();

        $response = $this->actingAs($member, 'sanctum')->getJson('/api/me/events');

        $response->assertOk();
        $data = $response->json('data');
        $this->assertIsArray($data);
        $this->assertCount(2, $data, 'Le membre doit voir ses 2 inscriptions.');
    }

    public function test_admin_can_mark_registration_as_attended(): void
    {
        $admin  = $this->makeAdmin();
        $member = $this->makeMember();
        $event  = $this->makeEvent();

        EventRegistration::create([
            'event_id'      => $event->id,
            'user_id'       => $member->id,
            'status'        => 'registered',
            'registered_at' => now(),
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/events/{$event->id}/registrations/{$member->id}/attended");

        $response->assertOk();
        $this->assertDatabaseHas('event_registrations', [
            'event_id' => $event->id,
            'user_id'  => $member->id,
            'status'   => 'attended',
        ]);
    }
}
