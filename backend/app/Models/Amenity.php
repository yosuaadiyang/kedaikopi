<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Amenity extends Model
{
    protected $fillable = ['name', 'slug', 'icon'];

    public function stores() { return $this->belongsToMany(Store::class, 'store_amenity'); }
}
