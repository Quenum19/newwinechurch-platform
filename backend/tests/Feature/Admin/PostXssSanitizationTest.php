<?php

namespace Tests\Feature\Admin;

use App\Models\Post;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Tests d'intégration — sanitisation HTML des articles (Tiptap → posts.content).
 *
 * Le backend NWC utilise App\Services\HtmlSanitizer (whitelist stricte) appliqué
 * dans StorePostRequest::passedValidation(). Ces tests garantissent que :
 *   - les tags dangereux (<script>, <iframe>) sont retirés
 *   - les attributs JS inline (onclick=...) sont stripés
 *   - le formatage sûr (<p>, <strong>, <em>) est conservé
 *
 * Si un test rouge survient, vérifier App\Services\HtmlSanitizer + les
 * appels passedValidation() dans Store/UpdatePostRequest.
 */
class PostXssSanitizationTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->admin = User::create([
            'name'       => 'Admin',
            'first_name' => 'Posts',
            'email'      => 'posts.admin@nwc.test',
            'password'   => Hash::make('x@2026!Aa'),
            'status'     => 'active',
        ]);
        $this->admin->assignRole('superadmin');
    }

    /** Helper : crée un article via l'API admin et renvoie le Post stocké. */
    private function createPostViaApi(string $content, string $title = 'Article test'): Post
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/posts', [
                'title'   => $title,
                'excerpt' => 'Résumé.',
                'content' => $content,
                'status'  => 'draft',
            ]);

        $response->assertCreated();

        $postId = $response->json('data.id');
        $this->assertNotNull($postId, 'L\'API doit renvoyer data.id.');

        return Post::findOrFail($postId);
    }

    public function test_post_html_strips_dangerous_script_tags(): void
    {
        $dirty = '<p>Hello<script>alert(1)</script> world</p>';
        $post  = $this->createPostViaApi($dirty, 'Article test 1');

        $content = (string) ($post->content ?? '');
        // L'essentiel : la balise <script> est supprimée → le JS ne s'exécute pas.
        // NB : strip_tags conserve le texte intérieur des balises stripées, ce qui
        // est sûr (un alert(1) en plain text ne peut pas s'exécuter).
        $this->assertStringNotContainsStringIgnoringCase('<script', $content,
            'Le contenu stocké NE doit PAS contenir de balise <script>.');
        $this->assertStringNotContainsStringIgnoringCase('</script>', $content,
            'La balise fermante </script> doit aussi être supprimée.');
        // Le texte sûr reste.
        $this->assertStringContainsString('Hello', $content);
        $this->assertStringContainsString('world', $content);
    }

    public function test_post_html_strips_javascript_attributes(): void
    {
        $dirty = '<p onclick="alert(\'xss\')">Texte cliquable</p>';
        $post  = $this->createPostViaApi($dirty, 'Article propre');

        $content = (string) ($post->content ?? '');
        $this->assertStringNotContainsStringIgnoringCase('onclick', $content,
            'L\'attribut onclick= doit être supprimé.');
        $this->assertStringNotContainsStringIgnoringCase('alert(', $content,
            'Le payload alert() doit avoir disparu (attribut retiré).');
        $this->assertStringContainsString('Texte cliquable', $content);
    }

    public function test_post_html_strips_iframe(): void
    {
        $dirty = '<p>Lecture</p><iframe src="https://evil.com"></iframe><p>fin</p>';
        $post  = $this->createPostViaApi($dirty, 'Article propre 2');

        $content = (string) ($post->content ?? '');
        $this->assertStringNotContainsStringIgnoringCase('<iframe', $content,
            'La balise <iframe> doit être supprimée.');
        $this->assertStringNotContainsStringIgnoringCase('evil.com', $content,
            'Le src malveillant doit avoir disparu avec le tag.');
        // Les paragraphes sûrs restent.
        $this->assertStringContainsString('Lecture', $content);
        $this->assertStringContainsString('fin', $content);
    }

    public function test_post_html_preserves_safe_formatting(): void
    {
        $safe = '<p><strong>Bold</strong> and <em>italic</em></p>';
        $post = $this->createPostViaApi($safe, 'Article propre');

        // Le sanitiseur peut normaliser la casse mais doit préserver la sémantique.
        $this->assertStringContainsStringIgnoringCase('<strong>', $post->content);
        $this->assertStringContainsStringIgnoringCase('Bold', $post->content);
        $this->assertStringContainsStringIgnoringCase('<em>', $post->content);
        $this->assertStringContainsStringIgnoringCase('italic', $post->content);
        $this->assertStringContainsStringIgnoringCase('<p>', $post->content);
    }
}
