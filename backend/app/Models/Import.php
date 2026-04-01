<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Import extends Model
{
    protected $fillable = ['user_id', 'filename', 'type', 'total_rows', 'imported_rows', 'failed_rows', 'field_mapping', 'errors', 'status'];

    protected function casts(): array
    {
        return ['field_mapping' => 'array', 'errors' => 'array'];
    }

    public function user() { return $this->belongsTo(User::class); }
}
