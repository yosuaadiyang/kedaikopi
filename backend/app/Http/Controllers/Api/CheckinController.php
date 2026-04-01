<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Checkin;
use App\Models\Store;
use App\Traits\HandlesImageUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CheckinController extends Controller
{
    use HandlesImageUpload;

    // Maximum distance (meters) from store to allow check-in
    private const MAX_CHECKIN_DISTANCE = 500;

    /**
     * Check in to a store. Requires user GPS within 500m of store.
     */
    public function checkin(Request $request, Store $store): JsonResponse
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $user = $request->user();

        // Check if user already has an active check-in anywhere
        $activeCheckin = Checkin::where('user_id', $user->id)
            ->active()
            ->first();

        if ($activeCheckin) {
            // Auto-expire if older than 12 hours
            if ($activeCheckin->isExpired()) {
                $activeCheckin->update([
                    'status' => 'expired',
                    'checked_out_at' => now(),
                ]);
            } else {
                $storeName = $activeCheckin->store->name ?? 'kedai lain';
                return response()->json([
                    'message' => "Anda masih check-in di {$storeName}. Checkout terlebih dahulu.",
                    'active_checkin' => $this->formatCheckin($activeCheckin),
                ], 422);
            }
        }

        // Validate distance to store
        if (!$store->latitude || !$store->longitude) {
            return response()->json([
                'message' => 'Kedai ini belum memiliki koordinat GPS.',
            ], 422);
        }

        $distance = Checkin::haversineDistance(
            (float) $request->latitude,
            (float) $request->longitude,
            (float) $store->latitude,
            (float) $store->longitude
        );

        if ($distance > self::MAX_CHECKIN_DISTANCE) {
            return response()->json([
                'message' => 'Anda terlalu jauh dari kedai ini. Jarak Anda: ' . round($distance) . 'm (maks ' . self::MAX_CHECKIN_DISTANCE . 'm).',
                'distance' => round($distance, 1),
                'max_distance' => self::MAX_CHECKIN_DISTANCE,
            ], 422);
        }

        $checkin = Checkin::create([
            'user_id' => $user->id,
            'store_id' => $store->id,
            'checkin_lat' => $request->latitude,
            'checkin_lng' => $request->longitude,
            'distance_meters' => round($distance, 1),
            'checked_in_at' => now(),
            'status' => 'checked_in',
        ]);

        return response()->json([
            'message' => "Check-in berhasil di {$store->name}!",
            'checkin' => $this->formatCheckin($checkin->load('store:id,name,slug,cover_image,address')),
        ], 201);
    }

    /**
     * Check out from a store. Optionally upload receipt.
     */
    public function checkout(Request $request, Checkin $checkin): JsonResponse
    {
        $user = $request->user();

        if ($checkin->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if (!$checkin->isActive()) {
            return response()->json(['message' => 'Check-in ini sudah tidak aktif.'], 422);
        }

        $request->validate([
            'receipt_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'receipt_amount' => 'nullable|numeric|min:0|max:99999999',
            'notes' => 'nullable|string|max:500',
        ]);

        $data = [
            'checked_out_at' => now(),
            'status' => 'checked_out',
            'notes' => $request->notes ? strip_tags($request->notes) : null,
        ];

        if ($request->filled('receipt_amount')) {
            $data['receipt_amount'] = (int) $request->receipt_amount;
        }

        if ($request->hasFile('receipt_image')) {
            $data['receipt_image'] = $this->uploadImage($request->file('receipt_image'), 'receipts');
        }

        $checkin->update($data);

        return response()->json([
            'message' => 'Checkout berhasil! Terima kasih telah berkunjung.',
            'checkin' => $this->formatCheckin($checkin->fresh()->load('store:id,name,slug,cover_image,address')),
        ]);
    }

    /**
     * Get user's active check-in (if any).
     */
    public function active(Request $request): JsonResponse
    {
        $checkin = Checkin::where('user_id', $request->user()->id)
            ->active()
            ->with('store:id,name,slug,cover_image,address,latitude,longitude')
            ->first();

        // Auto-expire
        if ($checkin && $checkin->isExpired()) {
            $checkin->update(['status' => 'expired', 'checked_out_at' => now()]);
            $checkin = null;
        }

        return response()->json([
            'checkin' => $checkin ? $this->formatCheckin($checkin) : null,
        ]);
    }

    /**
     * Get user's check-in history.
     */
    public function history(Request $request): JsonResponse
    {
        $perPage = min(50, max(1, $request->integer('per_page', 15)));

        $checkins = Checkin::where('user_id', $request->user()->id)
            ->with('store:id,name,slug,cover_image,address,city_id')
            ->latest('checked_in_at')
            ->paginate($perPage);

        $checkins->through(fn($c) => $this->formatCheckin($c));

        // Stats
        $userId = $request->user()->id;
        $stats = [
            'total_checkins' => Checkin::where('user_id', $userId)->count(),
            'total_checkouts' => Checkin::where('user_id', $userId)->completed()->count(),
            'unique_stores' => Checkin::where('user_id', $userId)->distinct('store_id')->count('store_id'),
            'total_spent' => (int) Checkin::where('user_id', $userId)->sum('receipt_amount'),
        ];

        return response()->json([
            'checkins' => $checkins,
            'stats' => $stats,
        ]);
    }

    /**
     * Get check-in stats for a specific store (public).
     */
    public function storeStats(Store $store): JsonResponse
    {
        $stats = [
            'total_checkins' => Checkin::where('store_id', $store->id)->count(),
            'today_checkins' => Checkin::where('store_id', $store->id)
                ->whereDate('checked_in_at', today())
                ->count(),
            'active_now' => Checkin::where('store_id', $store->id)->active()->count(),
        ];

        return response()->json(['stats' => $stats]);
    }

    private function formatCheckin(Checkin $checkin): array
    {
        $duration = null;
        if ($checkin->checked_in_at && $checkin->checked_out_at) {
            $mins = $checkin->checked_in_at->diffInMinutes($checkin->checked_out_at);
            $duration = $mins >= 60
                ? floor($mins / 60) . ' jam ' . ($mins % 60) . ' menit'
                : $mins . ' menit';
        }

        return [
            'id' => $checkin->id,
            'store' => $checkin->store ? [
                'id' => $checkin->store->id,
                'name' => $checkin->store->name,
                'slug' => $checkin->store->slug,
                'cover_image' => $checkin->store->cover_image,
                'address' => $checkin->store->address,
            ] : null,
            'checked_in_at' => $checkin->checked_in_at?->toISOString(),
            'checked_out_at' => $checkin->checked_out_at?->toISOString(),
            'distance_meters' => $checkin->distance_meters,
            'receipt_image' => $checkin->receipt_image,
            'receipt_amount' => $checkin->receipt_amount,
            'notes' => $checkin->notes,
            'status' => $checkin->status,
            'duration' => $duration,
        ];
    }
}
