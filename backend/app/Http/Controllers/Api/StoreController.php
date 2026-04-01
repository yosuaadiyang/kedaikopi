<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Traits\HandlesImageUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StoreController extends Controller
{
    use HandlesImageUpload;

    private const MAX_PER_PAGE = 50;
    private const DEFAULT_PER_PAGE = 12;

    public function index(Request $request): JsonResponse
    {
        $query = Store::approved()
            ->with(['province:id,name', 'city:id,name,province_id', 'amenities:id,name,icon', 'specialties:id,name']);

        // Search
        if ($search = $request->input('search')) {
            $search = strip_tags($search);
            $query->search($search);
        }

        // Filters
        if ($cityId = $request->integer('city_id')) {
            $query->where('city_id', $cityId);
        }
        if ($provinceId = $request->integer('province_id')) {
            $query->where('province_id', $provinceId);
        }
        if ($price = $request->input('price_range')) {
            if (in_array($price, ['$', '$$', '$$$', '$$$$'])) {
                $query->where('price_range', $price);
            }
        }
        if ($amenities = $request->input('amenities')) {
            $amenityIds = is_string($amenities) ? explode(',', $amenities) : $amenities;
            $amenityIds = array_filter(array_map('intval', $amenityIds));
            if (!empty($amenityIds)) {
                $query->whereHas('amenities', fn($q) => $q->whereIn('amenities.id', $amenityIds));
            }
        }
        if ($minRating = $request->input('min_rating')) {
            $query->where('avg_rating', '>=', max(1, min(5, (float) $minRating)));
        }

        // Nearby search
        if ($request->filled('lat') && $request->filled('lng')) {
            $lat = max(-90, min(90, (float) $request->lat));
            $lng = max(-180, min(180, (float) $request->lng));
            $radius = max(1, min(100, (float) $request->input('radius', 10)));
            $query->nearby($lat, $lng, $radius);
        }

        // Featured only
        if ($request->boolean('featured')) {
            $query->featured();
        }

        // Sort (whitelist)
        $sortBy = $request->input('sort', 'created_at');
        $sortDir = $request->input('order', 'desc');
        $allowedSorts = ['created_at', 'avg_rating', 'name', 'total_reviews'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        // Pagination with cap
        $perPage = min(self::MAX_PER_PAGE, max(1, $request->integer('per_page', self::DEFAULT_PER_PAGE)));
        $stores = $query->paginate($perPage);

        return response()->json($stores);
    }

    public function show(string $slug): JsonResponse
    {
        $store = Store::where('slug', strip_tags($slug))
            ->where(function ($q) {
                $q->where('status', 'approved');
            })
            ->with([
                'owner:id,name,avatar',
                'province:id,name', 'city:id,name,province_id',
                'amenities:id,name,icon', 'specialties:id,name',
                'images', 'menus' => fn($q) => $q->where('is_available', true)->orderBy('category'),
                'reviews' => fn($q) => $q->with('user:id,name,avatar')
                    ->where('is_approved', true)
                    ->latest()
                    ->limit(20),
            ])
            ->firstOrFail();

        // Check if authenticated user has favorited
        $isFavorited = false;
        if ($user = auth('sanctum')->user()) {
            $isFavorited = $user->favorites()->where('store_id', $store->id)->exists();
        }

        return response()->json([
            'store' => $store,
            'is_favorited' => $isFavorited,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'address' => 'required|string|max:500',
            'province_id' => 'required|exists:provinces,id',
            'city_id' => 'required|exists:cities,id',
            'district_id' => 'nullable|exists:districts,id',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|url|max:500',
            'instagram' => 'nullable|string|max:100',
            'price_range' => 'required|in:$,$$,$$$,$$$$',
            'opening_hours' => 'nullable|array',
            'amenity_ids' => 'nullable|array|max:30',
            'amenity_ids.*' => 'integer|exists:amenities,id',
            'specialty_ids' => 'nullable|array|max:20',
            'specialty_ids.*' => 'integer|exists:specialties,id',
            'cover_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        // Sanitize text inputs
        $validated['name'] = strip_tags($validated['name']);
        $validated['description'] = isset($validated['description']) ? strip_tags($validated['description']) : null;
        $validated['address'] = strip_tags($validated['address']);
        $validated['instagram'] = isset($validated['instagram']) ? preg_replace('/[^a-zA-Z0-9._]/', '', $validated['instagram']) : null;

        if ($request->hasFile('cover_image')) {
            $validated['cover_image'] = $this->uploadImage($request->file('cover_image'), 'stores/covers');
        }

        $validated['user_id'] = $request->user()->id;
        $validated['status'] = 'pending';

        $store = Store::create($validated);

        if (!empty($validated['amenity_ids'])) {
            $store->amenities()->sync($validated['amenity_ids']);
        }
        if (!empty($validated['specialty_ids'])) {
            $store->specialties()->sync($validated['specialty_ids']);
        }

        // Upgrade user role
        $user = $request->user();
        if ($user->role === 'user') {
            $user->update(['role' => 'store_owner']);
        }

        return response()->json([
            'message' => 'Kedai berhasil didaftarkan. Menunggu persetujuan admin.',
            'store' => $store->load(['amenities', 'specialties', 'province:id,name', 'city:id,name,province_id']),
        ], 201);
    }

    public function update(Request $request, Store $store): JsonResponse
    {
        if ($request->user()->id !== $store->user_id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:5000',
            'address' => 'sometimes|string|max:500',
            'province_id' => 'sometimes|exists:provinces,id',
            'city_id' => 'sometimes|exists:cities,id',
            'district_id' => 'nullable|exists:districts,id',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|url|max:500',
            'instagram' => 'nullable|string|max:100',
            'price_range' => 'sometimes|in:$,$$,$$$,$$$$',
            'opening_hours' => 'nullable|array',
            'amenity_ids' => 'nullable|array|max:30',
            'amenity_ids.*' => 'integer|exists:amenities,id',
            'specialty_ids' => 'nullable|array|max:20',
            'specialty_ids.*' => 'integer|exists:specialties,id',
            'cover_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        // Sanitize
        if (isset($validated['name'])) $validated['name'] = strip_tags($validated['name']);
        if (isset($validated['description'])) $validated['description'] = strip_tags($validated['description']);
        if (isset($validated['address'])) $validated['address'] = strip_tags($validated['address']);
        if (isset($validated['instagram'])) $validated['instagram'] = preg_replace('/[^a-zA-Z0-9._]/', '', $validated['instagram']);

        if ($request->hasFile('cover_image')) {
            $this->deleteImage($store->cover_image);
            $validated['cover_image'] = $this->uploadImage($request->file('cover_image'), 'stores/covers');
        }

        $store->update($validated);

        if (array_key_exists('amenity_ids', $validated)) {
            $store->amenities()->sync($validated['amenity_ids'] ?? []);
        }
        if (array_key_exists('specialty_ids', $validated)) {
            $store->specialties()->sync($validated['specialty_ids'] ?? []);
        }

        return response()->json([
            'message' => 'Kedai berhasil diperbarui.',
            'store' => $store->fresh()->load(['amenities', 'specialties', 'province:id,name', 'city:id,name,province_id']),
        ]);
    }

    public function destroy(Request $request, Store $store): JsonResponse
    {
        if ($request->user()->id !== $store->user_id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Delete cover image
        $this->deleteImage($store->cover_image);

        $store->delete();

        return response()->json(['message' => 'Kedai berhasil dihapus.']);
    }

    public function toggleFavorite(Request $request, Store $store): JsonResponse
    {
        $user = $request->user();
        $isFavorited = $user->favorites()->where('store_id', $store->id)->exists();

        if ($isFavorited) {
            $user->favorites()->detach($store->id);
        } else {
            $user->favorites()->attach($store->id);
        }

        return response()->json([
            'message' => $isFavorited ? 'Dihapus dari favorit.' : 'Ditambahkan ke favorit.',
            'is_favorited' => !$isFavorited,
        ]);
    }

    public function favorites(Request $request): JsonResponse
    {
        $perPage = min(self::MAX_PER_PAGE, max(1, $request->integer('per_page', self::DEFAULT_PER_PAGE)));

        $stores = $request->user()
            ->favorites()
            ->approved()
            ->with(['province:id,name', 'city:id,name,province_id', 'amenities:id,name,icon'])
            ->paginate($perPage);

        return response()->json($stores);
    }

    public function myStores(Request $request): JsonResponse
    {
        $perPage = min(self::MAX_PER_PAGE, max(1, $request->integer('per_page', self::DEFAULT_PER_PAGE)));

        $stores = Store::where('user_id', $request->user()->id)
            ->with(['province:id,name', 'city:id,name,province_id'])
            ->latest()
            ->paginate($perPage);

        return response()->json($stores);
    }
}
