<?php

namespace App\Services;

use App\Models\Event;
use App\Models\EventSeries;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Service Phase 5 — Génère N events (occurrences) à partir d'une série.
 *
 * Règles supportées :
 *  - weekly  : tous les N jours de la semaine (ex: tous les samedis pendant 4 semaines)
 *  - monthly : tous les N du mois (ex: le 15 de chaque mois pendant 6 mois)
 *  - none    : pas de génération auto, l'admin ajoute les occurrences à la main
 *
 * Garde-fous :
 *  - count entre 1 et 52 (max 1 an)
 *  - une seule génération à la fois (sinon doublons) — caller doit avoir détruit
 *    les occurrences précédentes ou vérifier qu'il n'y en a pas.
 */
class EventSeriesGenerator
{
    /**
     * Génère $count occurrences à partir de $startDate selon la règle de la série.
     *
     * @param int $count Nombre d'occurrences à créer (1-52)
     * @param Carbon $startDate Date de la PREMIÈRE occurrence (heure ignorée → on prend default_start_time de la série)
     * @return array<int, Event> Les events créés (ordre chronologique)
     */
    public function generate(EventSeries $series, Carbon $startDate, int $count, ?int $creatorId = null): array
    {
        if ($count < 1 || $count > 52) {
            throw new \InvalidArgumentException('Nombre d\'occurrences hors limites (1-52).');
        }
        if ($series->recurrence_type === 'none') {
            throw new \InvalidArgumentException("Cette série n'a pas de règle de récurrence — utilise addManualOccurrence().");
        }

        // Cap la première date au bon jour de la semaine/du mois si la règle l'exige.
        $startDate = $this->snapToRecurrenceDay($series, $startDate->copy());

        $events = [];
        return DB::transaction(function () use ($series, $startDate, $count, $creatorId, &$events) {
            $current = $startDate->copy();
            for ($i = 1; $i <= $count; $i++) {
                $events[] = $this->createOccurrence($series, $current->copy(), $i, $creatorId);
                // Avance pour la prochaine itération.
                $current = $series->recurrence_type === 'weekly'
                    ? $current->addWeek()
                    : $current->addMonth();
            }
            return $events;
        });
    }

    /**
     * Ajoute manuellement UNE occurrence à une série (pour le bouton "Ajouter une date").
     * Utilisable même si recurrence_type=none.
     */
    public function addManualOccurrence(EventSeries $series, Carbon $startsAt, ?int $creatorId = null): Event
    {
        $nextIndex = ($series->events()->max('series_sort_order') ?? 0) + 1;
        return $this->createOccurrence($series, $startsAt, $nextIndex, $creatorId);
    }

    /**
     * Crée 1 event en copiant les défauts de la série.
     * Le titre = "{série} — #{n}" sauf si admin renomme après.
     */
    private function createOccurrence(EventSeries $series, Carbon $date, int $index, ?int $creatorId): Event
    {
        // Combine la date + l'heure par défaut de la série.
        if ($series->default_start_time) {
            [$h, $m] = explode(':', $series->default_start_time);
            $date->setTime((int) $h, (int) $m, 0);
        } else {
            $date->setTime(18, 0, 0);
        }

        $endsAt = $date->copy()->addMinutes($series->default_duration_minutes ?? 120);

        $title = "{$series->title} — #{$index}";
        $slug  = Str::slug($title) . '-' . Str::random(5);

        return Event::create([
            'series_id'         => $series->id,
            'series_sort_order' => $index,
            'created_by'        => $creatorId ?? $series->created_by,
            'title'             => $title,
            'slug'              => $slug,
            'description'       => $series->description,
            'type'              => 'autre',
            'location'          => $series->default_location,
            'address'           => $series->default_address,
            'starts_at'         => $date,
            'ends_at'           => $endsAt,
            'cover_image'       => $series->cover_image,
            'is_published'      => $series->is_published,
            'is_featured'       => false,
            'registration_required' => false,
            'ticketing_enabled' => false,   // L'admin active manuellement par occurrence
            'tickets_per_email_max' => 3,
            'allow_waitlist'    => true,
            'require_selfie'    => false,
        ]);
    }

    /**
     * Force la date au bon jour selon la règle. Si l'admin saisit lundi mais la règle
     * dit "tous les samedis", on avance à samedi suivant (inclus).
     */
    private function snapToRecurrenceDay(EventSeries $series, Carbon $date): Carbon
    {
        if ($series->recurrence_type === 'weekly' && $series->recurrence_day) {
            // ISO : 1=lundi, 7=dimanche. Carbon dayOfWeekIso = même mapping.
            while ($date->dayOfWeekIso !== (int) $series->recurrence_day) {
                $date->addDay();
            }
        }
        if ($series->recurrence_type === 'monthly' && $series->recurrence_day) {
            // Cap au jour-mois demandé. Si on est après dans le mois courant, passe au mois suivant.
            $targetDay = min((int) $series->recurrence_day, $date->daysInMonth);
            if ($date->day > $targetDay) {
                $date->addMonthNoOverflow()->day(min($targetDay, $date->daysInMonth));
            } else {
                $date->day($targetDay);
            }
        }
        return $date;
    }
}
