<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreClaim extends Model
{
    protected $fillable = ['store_id', 'user_id', 'proof', 'document_path', 'status', 'admin_note'];

    public function store() { return $this->belongsTo(Store::class); }
    public function user() { return $this->belongsTo(User::class); }
}
