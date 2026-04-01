<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StoreResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'address' => $this->address,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'phone' => $this->phone,
            'email' => $this->email,
            'website' => $this->website,
            'instagram' => $this->instagram,
            'price_range' => $this->price_range,
            'opening_hours' => $this->opening_hours,
            'cover_image' => $this->cover_image,
            'avg_rating' => round($this->avg_rating, 1),
            'total_reviews' => $this->total_reviews,
            'status' => $this->status,
            'is_featured' => $this->is_featured,
            'province' => $this->whenLoaded('province', fn() => [
                'id' => $this->province->id,
                'name' => $this->province->name,
            ]),
            'city' => $this->whenLoaded('city', fn() => [
                'id' => $this->city->id,
                'name' => $this->city->name,
            ]),
            'owner' => $this->whenLoaded('owner', fn() => [
                'id' => $this->owner->id,
                'name' => $this->owner->name,
            ]),
            'amenities' => $this->whenLoaded('amenities', fn() =>
                $this->amenities->map(fn($a) => ['id' => $a->id, 'name' => $a->name, 'icon' => $a->icon])
            ),
            'specialties' => $this->whenLoaded('specialties', fn() =>
                $this->specialties->map(fn($s) => ['id' => $s->id, 'name' => $s->name])
            ),
            'menus' => $this->whenLoaded('menus'),
            'reviews' => $this->whenLoaded('reviews'),
            'images' => $this->whenLoaded('images'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
