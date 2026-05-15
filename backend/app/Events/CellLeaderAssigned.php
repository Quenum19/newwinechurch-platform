<?php

namespace App\Events;

use App\Models\Cell;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CellLeaderAssigned
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public User $leader,
        public Cell $cell,
        public ?User $assignedBy = null,
    ) {}
}
