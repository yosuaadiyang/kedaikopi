<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Store extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id', 'name', 'slug', 'description', 'address',
        'province_id', 'city_id', 'district_id',
        'latitude', 'longitude', 'phone', 'email', 'website', 'instagram',
        'price_range', 'cover_image', 'gallery', 'opening_hours',
        'avg_rating', 'total_reviews',
        'status', 'is_featured', 'is_imported',
        'google_place_id', 'google_maps_url',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'avg_rating' => 'decimal:2',
            'gallery' => 'array',
            'opening_hours' => 'array',
            'is_featured' => 'boolean',
            'is_imported' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Store $store) {
            if (empty($store->slug)) {
                $store->slug = Str::slug($store->name) . '-' . Str::random(5);
            }
        });
    }

    // Relationships
    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function province()
    {
        return $this->belongsTo(Province::class);
    }

    public function city()
    {
        return $this->belongsTo(City::class);
    }

    public function district()
    {
        return $this->belongsTo(District::class);
    }

    public function amenities()
    {
        return $this->belongsToMany(Amenity::class, 'store_amenity');
    }

    public function specialties()
    {
        return $this->belongsToMany(Specialty::class, 'store_specialty');
    }

    public function images()
    {
        return $this->hasMany(StoreImage::class)->orderBy('sort_order');
    }

    public function menus()
    {
        return $this->hasMany(Menu::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function favoritedBy()
    {
        return $this->belongsToMany(User::class, 'favorites')->withTimestamps();
    }

    public function claims()
    {
        return $this->hasMany(StoreClaim::class);
    }

    public function checkins()
    {
        return $this->hasMany(Checkin::class);
    }

    // Scopes
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    public function scopeNearby($query, float $lat, float $lng, float $radiusKm = 10)
    {
        $haversine = "(6371 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))))";

        return $query
            ->selectRaw("*, {$haversine} AS distance", [$lat, $lng, $lat])
            ->whereRaw("{$haversine} < ?", [$lat, $lng, $lat, $radiusKm])
            ->orderByRaw("{$haversine} ASC", [$lat, $lng, $lat]);
    }

    public function scopeSearch($query, ?string $search)
    {
        if (!$search) return $query;

        $search = trim($search);
        $escaped = addcslashes($search, '%_');
        $driver = $query->getConnection()->getDriverName();
        $like = $driver === 'pgsql' ? 'ilike' : 'like';

        // For PostgreSQL or short queries, use LIKE/ILIKE
        if ($driver === 'pgsql' || mb_strlen($search) < 4) {
            return $query->where(function ($q) use ($escaped, $like) {
                $q->where('name', $like, "%{$escaped}%")
                  ->orWhere('address', $like, "%{$escaped}%")
                  ->orWhere('description', $like, "%{$escaped}%");
            });
        }

        // MySQL: try fulltext first, fall back to LIKE
        return $query->where(function ($q) use ($search, $escaped) {
            $q->whereFullText(['name', 'description', 'address'], $search)
              ->orWhere('name', 'like', "%{$escaped}%");
        });
    }

    // Methods
    public function updateRating(): void
    {
        $this->avg_rating = $this->reviews()->avg('rating') ?? 0;
        $this->total_reviews = $this->reviews()->count();
        $this->save();
    }
}
