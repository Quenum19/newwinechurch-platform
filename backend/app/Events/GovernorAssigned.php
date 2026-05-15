<?php

namespace App\Events;

use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GovernorAssigned
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public User $governor,
        public Department $department,
        public ?User $assignedBy = null,
    ) {}
}
