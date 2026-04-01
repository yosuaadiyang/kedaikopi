<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Import;
use App\Models\Review;
use App\Models\Store;
use App\Models\StoreClaim;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    private const MAX_PER_PAGE = 50;

    public function dashboard(): JsonResponse
    {
        $stats = [
            'total_stores' => Store::count(),
            'approved_stores' => Store::approved()->count(),
            'pending_stores' => Store::where('status', 'pending')->count(),
            'total_users' => User::count(),
            'total_reviews' => Review::count(),
            'total_claims' => StoreClaim::where('status', 'pending')->count(),
            'imported_stores' => Store::where('is_imported', true)->count(),
            'avg_rating' => round((float) Store::approved()->avg('avg_rating'), 2),
        ];

        $recentStores = Store::with('city:id,name')
            ->latest()->limit(5)
            ->get(['id', 'name', 'slug', 'status', 'city_id', 'created_at']);

        $recentReviews = Review::with(['user:id,name', 'store:id,name'])
            ->latest()->limit(5)
            ->get(['id', 'store_id', 'user_id', 'rating', 'created_at']);

        return response()->json([
            'stats' => $stats,
            'recent_stores' => $recentStores,
            'recent_reviews' => $recentReviews,
        ]);
    }

    public function stores(Request $request): JsonResponse
    {
        $query = Store::with(['owner:id,name,email', 'province:id,name', 'city:id,name,province_id']);

        if ($status = $request->input('status')) {
            if (in_array($status, ['pending', 'approved', 'rejected', 'suspended'])) {
                $query->where('status', $status);
            }
        }

        if ($search = $request->input('search')) {
            $search = strip_tags($search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . addcslashes($search, '%_') . '%')
                  ->orWhere('address', 'like', '%' . addcslashes($search, '%_') . '%');
            });
        }

        $perPage = min(self::MAX_PER_PAGE, max(1, $request->integer('per_page', 15)));

        return response()->json($query->latest()->paginate($perPage));
    }

    public function updateStoreStatus(Request $request, Store $store): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:approved,rejected,suspended',
            'reason' => 'nullable|string|max:500',
        ]);

        $store->update([
            'status' => $request->status,
        ]);

        Log::info("Store #{$store->id} status changed to {$request->status} by admin #{$request->user()->id}");

        return response()->json([
            'message' => "Kedai berhasil di-{$request->status}.",
            'store' => $store,
        ]);
    }

    public function toggleFeatured(Store $store): JsonResponse
    {
        $store->update(['is_featured' => !$store->is_featured]);

        return response()->json([
            'message' => $store->is_featured ? 'Ditambahkan ke featured.' : 'Dihapus dari featured.',
            'is_featured' => $store->is_featured,
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $query = User::query();

        if ($role = $request->input('role')) {
            if (in_array($role, ['user', 'store_owner', 'admin', 'super_admin'])) {
                $query->where('role', $role);
            }
        }

        if ($search = $request->input('search')) {
            $search = strip_tags($search);
            $escaped = addcslashes($search, '%_');
            $query->where(function ($q) use ($escaped) {
                $q->where('name', 'like', "%{$escaped}%")
                  ->orWhere('email', 'like', "%{$escaped}%");
            });
        }

        $perPage = min(self::MAX_PER_PAGE, max(1, $request->integer('per_page', 15)));

        return response()->json($query->latest()->paginate($perPage));
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role' => 'sometimes|in:user,store_owner,admin',
            'is_active' => 'sometimes|boolean',
        ]);

        // Prevent modifying super_admin or self
        if ($user->isSuperAdmin()) {
            return response()->json(['message' => 'Tidak bisa mengubah super admin.'], 422);
        }
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Tidak bisa mengubah akun sendiri.'], 422);
        }

        $user->update($validated);

        // If deactivated, revoke all tokens
        if (isset($validated['is_active']) && !$validated['is_active']) {
            $user->tokens()->delete();
        }

        Log::info("User #{$user->id} updated by admin #{$request->user()->id}", $validated);

        return response()->json([
            'message' => 'User berhasil diperbarui.',
            'user' => $user->only(['id', 'name', 'email', 'role', 'is_active']),
        ]);
    }

    public function importStores(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,json,txt,xlsx|max:10240',
        ]);

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());
        $content = file_get_contents($file->getRealPath());

        if (empty(trim($content))) {
            return response()->json(['message' => 'File kosong.'], 422);
        }

        $rows = $this->parseFile($content, $extension);

        if (empty($rows)) {
            return response()->json(['message' => 'Tidak ada data yang bisa diimport.'], 422);
        }

        if (count($rows) > 2000) {
            return response()->json(['message' => 'Maksimal 2000 baris per import.'], 422);
        }

        $mapping = $this->autoMapFields(array_keys($rows[0] ?? []));

        // Preview mode — return mapped data for confirmation
        if ($request->boolean('preview')) {
            $preview = array_slice($rows, 0, 5);
            $previewMapped = array_map(fn($row) => $this->mapRowToStore($row, $mapping, true), $preview);
            $duplicateCount = $this->countDuplicates($rows, $mapping);

            return response()->json([
                'total_rows' => count($rows),
                'mapped_fields' => $mapping,
                'unmapped_fields' => array_diff(array_keys($rows[0] ?? []), array_keys($mapping)),
                'preview' => $previewMapped,
                'duplicates' => $duplicateCount,
                'source_headers' => array_keys($rows[0] ?? []),
            ]);
        }

        // Accept custom field mapping from frontend
        if ($request->has('field_mapping')) {
            $customMapping = $request->input('field_mapping');
            if (is_array($customMapping)) {
                $mapping = array_filter($customMapping);
            }
        }

        $import = Import::create([
            'user_id' => $request->user()->id,
            'filename' => $file->getClientOriginalName(),
            'type' => $extension,
            'total_rows' => count($rows),
            'field_mapping' => $mapping,
            'status' => 'processing',
        ]);

        $imported = 0;
        $skipped = 0;
        $failed = 0;
        $errors = [];

        $skipDuplicates = $request->boolean('skip_duplicates', true);
        $autoApprove = $request->boolean('auto_approve', true);

        DB::beginTransaction();
        try {
            foreach ($rows as $i => $row) {
                try {
                    $storeData = $this->mapRowToStore($row, $mapping);

                    if (empty($storeData['name'])) {
                        $failed++;
                        if (count($errors) < 50) $errors[] = "Baris " . ($i + 1) . ": Nama kedai kosong";
                        continue;
                    }

                    // Duplicate detection
                    if ($skipDuplicates) {
                        $isDuplicate = false;
                        if (!empty($storeData['google_place_id'])) {
                            $isDuplicate = Store::where('google_place_id', $storeData['google_place_id'])->exists();
                        }
                        if (!$isDuplicate) {
                            $isDuplicate = Store::where('name', $storeData['name'])
                                ->where('address', $storeData['address'])
                                ->exists();
                        }
                        if ($isDuplicate) {
                            $skipped++;
                            continue;
                        }
                    }

                    $storeData['is_imported'] = true;
                    $storeData['status'] = $autoApprove ? 'approved' : 'pending';

                    // Auto-detect province/city from address
                    if (empty($storeData['province_id']) || empty($storeData['city_id'])) {
                        $location = $this->detectLocation($storeData['address'] ?? '', $row);
                        if ($location['province_id']) $storeData['province_id'] = $location['province_id'];
                        if ($location['city_id']) $storeData['city_id'] = $location['city_id'];
                    }

                    // Import GMaps rating as avg_rating
                    $gmapsRating = $this->extractRating($row, $mapping);
                    if ($gmapsRating) {
                        $storeData['avg_rating'] = $gmapsRating['rating'];
                        $storeData['total_reviews'] = $gmapsRating['count'];
                    }

                    // Parse opening hours
                    $hours = $this->extractOpeningHours($row, $mapping);
                    if ($hours) $storeData['opening_hours'] = $hours;

                    $store = Store::create($storeData);

                    // Auto-map categories to specialties
                    $this->mapCategoriesToSpecialties($store, $row, $mapping);

                    $imported++;
                } catch (\Exception $e) {
                    $failed++;
                    if (count($errors) < 50) {
                        $errors[] = "Baris " . ($i + 1) . ": " . Str::limit($e->getMessage(), 100);
                    }
                }
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Import failed: " . $e->getMessage());
            return response()->json(['message' => 'Import gagal: ' . $e->getMessage()], 500);
        }

        $import->update([
            'imported_rows' => $imported,
            'failed_rows' => $failed,
            'errors' => $errors,
            'status' => 'completed',
        ]);

        return response()->json([
            'message' => "Import selesai: {$imported} berhasil, {$skipped} duplikat dilewati, {$failed} gagal.",
            'imported' => $imported,
            'skipped' => $skipped,
            'failed' => $failed,
            'errors' => $errors,
        ]);
    }

    public function claims(Request $request): JsonResponse
    {
        $perPage = min(self::MAX_PER_PAGE, max(1, $request->integer('per_page', 15)));

        $claims = StoreClaim::with(['store:id,name', 'user:id,name,email'])
            ->when($request->input('status'), function ($q, $s) {
                if (in_array($s, ['pending', 'approved', 'rejected'])) {
                    $q->where('status', $s);
                }
            })
            ->latest()
            ->paginate($perPage);

        return response()->json($claims);
    }

    public function updateClaim(Request $request, StoreClaim $claim): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:approved,rejected',
            'admin_note' => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($request, $claim) {
            $claim->update([
                'status' => $request->status,
                'admin_note' => strip_tags($request->admin_note ?? ''),
            ]);

            if ($request->status === 'approved') {
                $claim->store->update(['user_id' => $claim->user_id]);
                $claim->user->update(['role' => 'store_owner']);
            }
        });

        return response()->json([
            'message' => "Klaim berhasil di-{$request->status}.",
            'claim' => $claim,
        ]);
    }

    public function clearImported(): JsonResponse
    {
        $count = Store::where('is_imported', true)->count();

        DB::transaction(function () {
            // Delete related data first via cascading, then stores
            Store::where('is_imported', true)->delete();
        });

        return response()->json([
            'message' => "{$count} kedai hasil import berhasil dihapus.",
            'deleted' => $count,
        ]);
    }

    public function exportStores(Request $request): JsonResponse
    {
        $stores = Store::approved()
            ->with(['province:id,name', 'city:id,name,province_id', 'amenities:id,name'])
            ->get()
            ->map(fn($s) => [
                'name' => $s->name,
                'address' => $s->address,
                'city' => $s->city?->name,
                'province' => $s->province?->name,
                'latitude' => $s->latitude,
                'longitude' => $s->longitude,
                'price_range' => $s->price_range,
                'rating' => $s->avg_rating,
                'phone' => $s->phone,
                'website' => $s->website,
                'instagram' => $s->instagram,
                'amenities' => $s->amenities->pluck('name')->join(', '),
            ]);

        return response()->json($stores);
    }

    // ─── Import Helpers ────────────────────────────────

    private function parseFile(string $content, string $extension): array
    {
        if ($extension === 'json') {
            $decoded = json_decode($content, true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
                return [];
            }
            // Handle nested structures (Outscraper, Apify)
            if (isset($decoded['data'])) $decoded = $decoded['data'];
            if (isset($decoded['results'])) $decoded = $decoded['results'];
            // Flatten: ensure array of objects
            $rows = isset($decoded[0]) ? $decoded : [$decoded];
            // Flatten nested keys like location.lat → latitude
            return array_map(fn($row) => $this->flattenRow($row), $rows);
        }

        // CSV/TXT
        $lines = array_filter(array_map('trim', explode("\n", $content)));
        if (count($lines) < 2) return [];

        $headers = str_getcsv(array_shift($lines));
        $headers = array_map('trim', $headers);
        $rows = [];

        foreach ($lines as $line) {
            $values = str_getcsv($line);
            if (count($values) === count($headers)) {
                $rows[] = array_combine($headers, array_map('trim', $values));
            }
        }

        return $rows;
    }

    private function flattenRow(array $row, string $prefix = ''): array
    {
        $flat = [];
        foreach ($row as $key => $value) {
            $fullKey = $prefix ? "{$prefix}.{$key}" : $key;
            if (is_array($value) && !is_int(array_key_first($value))) {
                $flat = array_merge($flat, $this->flattenRow($value, $fullKey));
            } elseif (is_array($value)) {
                $flat[$fullKey] = json_encode($value);
            } else {
                $flat[$fullKey] = $value;
            }
        }
        return $flat;
    }

    private function autoMapFields(array $headers): array
    {
        $map = [];

        // Comprehensive field aliases covering major GMaps extractors:
        // Outscraper, Apify, PhantomBuster, Data Miner, Google Maps Scraper
        $fieldMap = [
            'name' => [
                'name', 'title', 'nama', 'store_name', 'nama_kedai',
                'business_name', 'businessname', 'company', 'company_name',
                'displayname', 'display_name',
            ],
            'address' => [
                'address', 'alamat', 'location', 'lokasi', 'full_address',
                'fulladdress', 'formatted_address', 'street_address', 'vicinity',
                'street', 'complete_address', 'addr', 'place_address',
            ],
            'phone' => [
                'phone', 'telepon', 'tel', 'no_telp', 'no_hp', 'phone_number',
                'phonenumber', 'telephone', 'contact', 'mobile', 'international_phone',
                'internationalphone', 'formatted_phone_number',
            ],
            'latitude' => [
                'latitude', 'lat', 'location.lat', 'geo.lat', 'coordinates.lat',
                'latlng.lat', 'geometry.location.lat', 'gps_coordinates.latitude',
            ],
            'longitude' => [
                'longitude', 'lng', 'lon', 'long', 'location.lng', 'geo.lng',
                'coordinates.lng', 'coordinates.lon', 'latlng.lng',
                'geometry.location.lng', 'gps_coordinates.longitude',
            ],
            'description' => [
                'description', 'deskripsi', 'about', 'tentang', 'summary',
                'editorial_summary', 'detail', 'bio',
            ],
            'price_range' => [
                'price', 'price_range', 'harga', 'price_level', 'pricelevel',
                'price_point', '$$',
            ],
            'google_maps_url' => [
                'url', 'maps_url', 'google_maps', 'link', 'google_maps_url',
                'googleurl', 'google_url', 'gmaps_url', 'place_url', 'maps_link',
            ],
            'google_place_id' => [
                'place_id', 'google_place_id', 'placeid', 'placeId',
                'google_id', 'googlePlaceId',
            ],
            'website' => [
                'website', 'web', 'site', 'website_url', 'homepage',
                'domain', 'web_url',
            ],
            'instagram' => ['instagram', 'ig', 'instagram_url'],
            'email' => ['email', 'email_address', 'mail', 'e-mail'],
            'rating' => [
                'rating', 'stars', 'avg_rating', 'average_rating', 'totalscore',
                'totalScore', 'score', 'rate', 'star', 'overall_rating',
            ],
            'reviews_count' => [
                'reviews', 'reviews_count', 'total_reviews', 'reviewscount',
                'reviewsCount', 'review_count', 'user_ratings_total',
                'totalreviews', 'num_reviews', 'numberOfReviews', 'ratingCount',
            ],
            'categories' => [
                'categories', 'category', 'type', 'types', 'business_type',
                'subtypes', 'subcategories',
            ],
            'opening_hours' => [
                'opening_hours', 'hours', 'working_hours', 'workinghours',
                'currentOpeningHours', 'business_hours', 'open_hours', 'schedule',
            ],
            'cover_image' => [
                'photo', 'thumbnail', 'image_url', 'imageurl', 'main_photo',
                'image', 'photo_url', 'cover', 'featured_image', 'photos',
            ],
            'city_name' => [
                'city', 'kota', 'town', 'municipality', 'locality',
            ],
            'province_name' => [
                'state', 'province', 'provinsi', 'region', 'area',
                'administrative_area', 'administrative_area_level_1',
            ],
        ];

        foreach ($headers as $header) {
            $lower = strtolower(trim(str_replace([' ', '-'], '_', $header)));
            foreach ($fieldMap as $field => $aliases) {
                if (in_array($lower, $aliases)) {
                    $map[$header] = $field;
                    break;
                }
            }
        }

        return $map;
    }

    private function mapRowToStore(array $row, array $mapping, bool $previewOnly = false): array
    {
        $data = [];
        foreach ($mapping as $source => $target) {
            if (isset($row[$source]) && !empty(trim((string) $row[$source]))) {
                $value = trim((string) $row[$source]);
                // Skip internal computed fields
                if (in_array($target, ['rating', 'reviews_count', 'categories', 'opening_hours', 'cover_image', 'city_name', 'province_name'])) {
                    $data['_' . $target] = $value; // store as metadata for preview
                    continue;
                }
                $data[$target] = strip_tags($value);
            }
        }

        if (empty($data['name'])) {
            if ($previewOnly) return ['name' => '(kosong)', '_status' => 'error'];
            throw new \Exception('Nama kedai wajib diisi');
        }

        // Parse coordinates
        if (isset($data['latitude'])) {
            $data['latitude'] = is_numeric($data['latitude']) ? round((float) $data['latitude'], 7) : null;
        }
        if (isset($data['longitude'])) {
            $data['longitude'] = is_numeric($data['longitude']) ? round((float) $data['longitude'], 7) : null;
        }

        // Clean instagram handle
        if (isset($data['instagram'])) {
            $data['instagram'] = preg_replace('/[^a-zA-Z0-9._]/', '', str_replace(['https://instagram.com/', 'https://www.instagram.com/', '@'], '', $data['instagram']));
        }

        // Parse price level (GMaps: 1-4 → $-$$$$)
        if (isset($data['price_range'])) {
            $pr = $data['price_range'];
            if (is_numeric($pr)) {
                $data['price_range'] = str_repeat('$', max(1, min(4, (int) $pr)));
            } elseif (!in_array($pr, ['$', '$$', '$$$', '$$$$'])) {
                $data['price_range'] = '$$';
            }
        } else {
            $data['price_range'] = '$$';
        }

        $data['address'] = $data['address'] ?? 'Alamat belum diisi';

        if (!$previewOnly) {
            $data['slug'] = Str::slug($data['name']) . '-' . Str::lower(Str::random(6));
        }

        // For preview, include metadata
        if ($previewOnly) {
            $data['_rating'] = $data['_rating'] ?? null;
            $data['_reviews_count'] = $data['_reviews_count'] ?? null;
            $data['_categories'] = $data['_categories'] ?? null;
        }

        return $data;
    }

    private function countDuplicates(array $rows, array $mapping): int
    {
        $count = 0;
        foreach ($rows as $row) {
            $mapped = [];
            foreach ($mapping as $source => $target) {
                if (isset($row[$source])) $mapped[$target] = trim((string) $row[$source]);
            }

            if (!empty($mapped['google_place_id'])) {
                if (Store::where('google_place_id', $mapped['google_place_id'])->exists()) {
                    $count++;
                    continue;
                }
            }
            if (!empty($mapped['name']) && !empty($mapped['address'])) {
                if (Store::where('name', $mapped['name'])->where('address', $mapped['address'])->exists()) {
                    $count++;
                }
            }
        }
        return $count;
    }

    private function extractRating(array $row, array $mapping): ?array
    {
        $rating = null;
        $count = 0;

        foreach ($mapping as $source => $target) {
            if ($target === 'rating' && isset($row[$source])) {
                $val = (float) $row[$source];
                if ($val > 0 && $val <= 5) $rating = round($val, 2);
            }
            if ($target === 'reviews_count' && isset($row[$source])) {
                $count = (int) preg_replace('/[^0-9]/', '', (string) $row[$source]);
            }
        }

        return $rating ? ['rating' => $rating, 'count' => $count] : null;
    }

    private function extractOpeningHours(array $row, array $mapping): ?array
    {
        foreach ($mapping as $source => $target) {
            if ($target !== 'opening_hours' || empty($row[$source])) continue;

            $raw = $row[$source];

            // Already JSON array
            if (is_array($raw)) return $raw;

            // JSON string
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) return $decoded;

            // Text format: "Monday: 9 AM–10 PM, Tuesday: 9 AM–10 PM"
            $hours = [];
            $parts = preg_split('/[,;]/', $raw);
            foreach ($parts as $part) {
                $part = trim($part);
                if (str_contains($part, ':')) {
                    [$day, $time] = explode(':', $part, 2);
                    $hours[trim($day)] = trim($time);
                }
            }
            return !empty($hours) ? $hours : null;
        }
        return null;
    }

    private function mapCategoriesToSpecialties(Store $store, array $row, array $mapping): void
    {
        foreach ($mapping as $source => $target) {
            if ($target !== 'categories' || empty($row[$source])) continue;

            $cats = $row[$source];
            if (is_string($cats)) {
                $decoded = json_decode($cats, true);
                $cats = is_array($decoded) ? $decoded : preg_split('/[,;|]/', $cats);
            }
            if (!is_array($cats)) continue;

            $cats = array_map('trim', $cats);
            $cats = array_map('strtolower', $cats);

            // Map GMaps categories to our amenities
            $amenityMap = [
                'wifi' => 'WiFi', 'free wifi' => 'WiFi', 'wi-fi' => 'WiFi',
                'outdoor seating' => 'Outdoor', 'outdoor' => 'Outdoor', 'terrace' => 'Outdoor',
                'dine-in' => 'Dine In', 'dine in' => 'Dine In',
                'takeout' => 'Take Away', 'take away' => 'Take Away', 'takeaway' => 'Take Away',
                'delivery' => 'Delivery',
                'parking' => 'Parkir Mobil', 'free parking' => 'Parkir Mobil',
                'live music' => 'Live Music', 'music' => 'Live Music',
                'pet-friendly' => 'Pet Friendly', 'pet friendly' => 'Pet Friendly', 'dogs allowed' => 'Pet Friendly',
                'kid-friendly' => 'Kid Friendly', 'kids' => 'Kid Friendly', 'family-friendly' => 'Kid Friendly',
                'reservations' => 'Reservasi', 'reservation' => 'Reservasi',
            ];

            $amenityNames = [];
            foreach ($cats as $cat) {
                foreach ($amenityMap as $keyword => $amenity) {
                    if (str_contains($cat, $keyword)) {
                        $amenityNames[] = $amenity;
                        break;
                    }
                }
            }

            if (!empty($amenityNames)) {
                $amenityIds = \App\Models\Amenity::whereIn('name', array_unique($amenityNames))->pluck('id')->toArray();
                $store->amenities()->syncWithoutDetaching($amenityIds);
            }

            // Coffee-related categories → specialties
            $coffeeKeywords = ['coffee', 'kopi', 'espresso', 'cafe', 'roastery', 'latte', 'brew'];
            $isCoffeeShop = false;
            foreach ($cats as $cat) {
                foreach ($coffeeKeywords as $kw) {
                    if (str_contains($cat, $kw)) {
                        $isCoffeeShop = true;
                        break 2;
                    }
                }
            }

            if ($isCoffeeShop) {
                // Attach generic coffee specialties
                $defaultSpecialties = \App\Models\Specialty::whereIn('name', ['Espresso Based', 'Kopi Susu Nusantara'])->pluck('id')->toArray();
                $store->specialties()->syncWithoutDetaching($defaultSpecialties);
            }
        }
    }

    private function detectLocation(string $address, array $row): array
    {
        $result = ['province_id' => null, 'city_id' => null];

        // First check if row has explicit city/province columns
        $cityName = null;
        $provinceName = null;

        foreach ($row as $key => $value) {
            $lower = strtolower($key);
            if (in_array($lower, ['city', 'kota', 'town', 'locality'])) {
                $cityName = trim((string) $value);
            }
            if (in_array($lower, ['state', 'province', 'provinsi', 'region', 'administrative_area_level_1'])) {
                $provinceName = trim((string) $value);
            }
        }

        // Try to find city by explicit column
        if ($cityName) {
            $city = \App\Models\City::where('name', 'like', "%{$cityName}%")->first();
            if ($city) {
                $result['city_id'] = $city->id;
                $result['province_id'] = $city->province_id;
                return $result;
            }
        }

        // Try to find province by explicit column
        if ($provinceName) {
            $province = \App\Models\Province::where('name', 'like', "%{$provinceName}%")->first();
            if ($province) {
                $result['province_id'] = $province->id;
            }
        }

        // Fallback: scan address text for known city/province names
        $searchText = strtolower($address);

        // Try cities first (more specific)
        $cities = \App\Models\City::all();
        foreach ($cities as $city) {
            if (str_contains($searchText, strtolower($city->name))) {
                $result['city_id'] = $city->id;
                $result['province_id'] = $city->province_id;
                return $result;
            }
        }

        // Try provinces
        if (!$result['province_id']) {
            $provinces = \App\Models\Province::all();
            foreach ($provinces as $province) {
                if (str_contains($searchText, strtolower($province->name))) {
                    $result['province_id'] = $province->id;
                    break;
                }
            }
        }

        return $result;
    }
}
