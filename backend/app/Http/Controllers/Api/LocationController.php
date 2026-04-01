<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\Province;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class LocationController extends Controller
{
    public function provinces(): JsonResponse
    {
        $data = Cache::remember('provinces', 3600, function () {
            return Province::orderBy('name')->get(['id', 'name', 'slug']);
        });
        return response()->json($data);
    }

    public function cities(Province $province): JsonResponse
    {
        $data = Cache::remember("cities.{$province->id}", 3600, function () use ($province) {
            return $province->cities()->orderBy('name')->get(['id', 'name', 'slug', 'province_id']);
        });
        return response()->json($data);
    }

    public function districts(City $city): JsonResponse
    {
        $data = Cache::remember("districts.{$city->id}", 3600, function () use ($city) {
            return $city->districts()->orderBy('name')->get(['id', 'name', 'slug', 'city_id']);
        });
        return response()->json($data);
    }

    public function amenities(): JsonResponse
    {
        $data = Cache::remember('amenities', 3600, function () {
            return \App\Models\Amenity::orderBy('name')->get(['id', 'name', 'slug', 'icon']);
        });
        return response()->json($data);
    }

    public function specialties(): JsonResponse
    {
        $data = Cache::remember('specialties', 3600, function () {
            return \App\Models\Specialty::orderBy('name')->get(['id', 'name', 'slug']);
        });
        return response()->json($data);
    }
}
