<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Checkin extends Model
{
    protected $fillable = [
        'user_id', 'store_id',
        'checkin_lat', 'checkin_lng', 'distance_meters',
        'checked_in_at', 'checked_out_at',
        'receipt_image', 'receipt_amount', 'notes',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'checkin_lat' => 'decimal:7',
            'checkin_lng' => 'decimal:7',
            'distance_meters' => 'decimal:1',
            'receipt_amount' => 'decimal:0',
            'checked_in_at' => 'datetime',
            'checked_out_at' => 'datetime',
        ];
    }

    // ─── Relationships ───
    public function user() { return $this->belongsTo(User::class); }
    public function store() { return $this->belongsTo(Store::class); }

    // ─── Scopes ───
    public function scopeActive($query)
    {
        return $query->where('status', 'checked_in');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'checked_out');
    }

    // ─── Helpers ───
    public function isActive(): bool
    {
        return $this->status === 'checked_in';
    }

    public function isExpired(): bool
    {
        // Auto-expire after 12 hours
        return $this->isActive() && $this->checked_in_at->diffInHours(now()) >= 12;
    }

    /**
     * Calculate distance between two GPS coordinates (meters).
     */
    public static function haversineDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R = 6371000; // Earth radius in meters
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $R * $c;
    }
}
