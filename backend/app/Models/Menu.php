<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Menu extends Model
{
    protected $fillable = ['store_id', 'name', 'description', 'price', 'category', 'image', 'is_available'];

    protected function casts(): array
    {
        return ['price' => 'integer', 'is_available' => 'boolean'];
    }

    public function store() { return $this->belongsTo(Store::class); }
}
