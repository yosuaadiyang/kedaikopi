<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Province extends Model
{
    protected $fillable = ['name', 'slug'];

    public function cities()
    {
        return $this->hasMany(City::class);
    }

    public function stores()
    {
        return $this->hasMany(Store::class);
    }
}
