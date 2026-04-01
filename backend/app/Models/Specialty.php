<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Specialty extends Model
{
    protected $fillable = ['name', 'slug', 'description'];

    public function stores() { return $this->belongsToMany(Store::class, 'store_specialty'); }
}
