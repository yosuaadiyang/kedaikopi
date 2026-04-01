<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class District extends Model
{
    protected $fillable = ['city_id', 'name', 'slug'];

    public function city() { return $this->belongsTo(City::class); }
    public function stores() { return $this->hasMany(Store::class); }
}
