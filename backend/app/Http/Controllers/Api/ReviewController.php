<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    private const MAX_PER_PAGE = 50;

    public function index(Store $store): JsonResponse
    {
        $reviews = $store->reviews()
            ->where('is_approved', true)
            ->with('user:id,name,avatar')
            ->latest()
            ->paginate(min(self::MAX_PER_PAGE, request()->integer('per_page', 10)));

        return response()->json($reviews);
    }

    public function store(Request $request, Store $store): JsonResponse
    {
        $validated = $request->validate([
            'rating' => 'required|integer|between:1,5',
            'comment' => 'nullable|string|max:2000',
        ]);

        // Sanitize
        if (isset($validated['comment'])) {
            $validated['comment'] = strip_tags($validated['comment']);
        }

        // Check duplicate
        $existing = Review::where('store_id', $store->id)
            ->where('user_id', $request->user()->id)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Anda sudah memberikan review untuk kedai ini.'], 422);
        }

        // Prevent self-review
        if ($store->user_id === $request->user()->id) {
            return response()->json(['message' => 'Tidak bisa mereview kedai sendiri.'], 422);
        }

        $review = Review::create([
            'store_id' => $store->id,
            'user_id' => $request->user()->id,
            'rating' => $validated['rating'],
            'comment' => $validated['comment'] ?? null,
        ]);

        return response()->json([
            'message' => 'Review berhasil ditambahkan.',
            'review' => $review->load('user:id,name,avatar'),
        ], 201);
    }

    public function update(Request $request, Review $review): JsonResponse
    {
        if ($request->user()->id !== $review->user_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'rating' => 'sometimes|integer|between:1,5',
            'comment' => 'nullable|string|max:2000',
        ]);

        if (isset($validated['comment'])) {
            $validated['comment'] = strip_tags($validated['comment']);
        }

        $review->update($validated);

        return response()->json([
            'message' => 'Review berhasil diperbarui.',
            'review' => $review->fresh()->load('user:id,name,avatar'),
        ]);
    }

    public function destroy(Request $request, Review $review): JsonResponse
    {
        if ($request->user()->id !== $review->user_id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $review->delete();

        return response()->json(['message' => 'Review berhasil dihapus.']);
    }
}
