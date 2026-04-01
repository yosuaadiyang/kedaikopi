<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Review extends Model
{
    use SoftDeletes;

    protected $fillable = ['store_id', 'user_id', 'rating', 'comment', 'images', 'is_approved'];

    protected function casts(): array
    {
        return ['images' => 'array', 'is_approved' => 'boolean'];
    }

    public function store() { return $this->belongsTo(Store::class); }
    public function user() { return $this->belongsTo(User::class); }

    protected static function booted(): void
    {
        static::saved(function (Review $review) {
            if ($store = $review->store) {
                $store->updateRating();
            }
        });

        static::deleted(function (Review $review) {
            if ($store = $review->store) {
                $store->updateRating();
            }
        });
    }
}
