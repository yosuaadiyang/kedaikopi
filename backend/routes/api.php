<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CheckinController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\StoreController;
use Illuminate\Support\Facades\Route;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| Rate Limiters
|--------------------------------------------------------------------------
*/
RateLimiter::for('auth', function (Request $request) {
    return Limit::perMinute(10)->by($request->ip());
});

RateLimiter::for('api', function (Request $request) {
    return $request->user()
        ? Limit::perMinute(120)->by($request->user()->id)
        : Limit::perMinute(60)->by($request->ip());
});

RateLimiter::for('uploads', function (Request $request) {
    return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
});

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/
Route::middleware('throttle:auth')->prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::get('/verify-email/{id}/{hash}', [AuthController::class, 'verifyEmail'])
        ->middleware('signed')
        ->name('verification.verify');
});

Route::middleware('throttle:api')->group(function () {
    // Public store browsing
    Route::get('/stores', [StoreController::class, 'index']);
    Route::get('/stores/{slug}', [StoreController::class, 'show']);
    Route::get('/stores/{store}/reviews', [ReviewController::class, 'index']);
    Route::get('/stores/{store}/menus', [MenuController::class, 'index']);
    Route::get('/stores/{store}/checkin-stats', [CheckinController::class, 'storeStats']);

    // Locations & metadata (cached)
    Route::get('/provinces', [LocationController::class, 'provinces']);
    Route::get('/provinces/{province}/cities', [LocationController::class, 'cities']);
    Route::get('/cities/{city}/districts', [LocationController::class, 'districts']);
    Route::get('/amenities', [LocationController::class, 'amenities']);
    Route::get('/specialties', [LocationController::class, 'specialties']);
});

// Health check (no rate limit)
Route::get('/health', fn() => response()->json([
    'status' => 'ok',
    'app' => 'KedaiKopi API',
    'version' => '2.0',
    'timestamp' => now()->toISOString(),
]));

/*
|--------------------------------------------------------------------------
| Authenticated Routes
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {

    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::put('/password', [AuthController::class, 'changePassword']);
        Route::post('/resend-verification', [AuthController::class, 'resendVerification'])
            ->middleware('throttle:auth');
    });

    // Store management (uploads rate limited)
    Route::middleware('throttle:uploads')->group(function () {
        Route::post('/stores', [StoreController::class, 'store']);
        Route::post('/stores/{store}', [StoreController::class, 'update']); // POST for multipart
    });
    Route::delete('/stores/{store}', [StoreController::class, 'destroy']);

    // Favorites
    Route::post('/stores/{store}/favorite', [StoreController::class, 'toggleFavorite']);
    Route::get('/my/favorites', [StoreController::class, 'favorites']);
    Route::get('/my/stores', [StoreController::class, 'myStores']);

    // Check-in / Check-out
    Route::post('/stores/{store}/checkin', [CheckinController::class, 'checkin']);
    Route::post('/checkins/{checkin}/checkout', [CheckinController::class, 'checkout']);
    Route::get('/my/checkin/active', [CheckinController::class, 'active']);
    Route::get('/my/checkins', [CheckinController::class, 'history']);

    // Reviews
    Route::post('/stores/{store}/reviews', [ReviewController::class, 'store']);
    Route::put('/reviews/{review}', [ReviewController::class, 'update']);
    Route::delete('/reviews/{review}', [ReviewController::class, 'destroy']);

    // Menus (store owner)
    Route::post('/stores/{store}/menus', [MenuController::class, 'store']);
    Route::put('/menus/{menu}', [MenuController::class, 'update']);
    Route::delete('/menus/{menu}', [MenuController::class, 'destroy']);

    /*
    |----------------------------------------------------------------------
    | Admin Routes
    |----------------------------------------------------------------------
    */
    Route::middleware(\App\Http\Middleware\EnsureIsAdmin::class)
        ->prefix('admin')
        ->group(function () {
            Route::get('/dashboard', [AdminController::class, 'dashboard']);

            // Store management
            Route::get('/stores', [AdminController::class, 'stores']);
            Route::put('/stores/{store}/status', [AdminController::class, 'updateStoreStatus']);
            Route::post('/stores/{store}/featured', [AdminController::class, 'toggleFeatured']);
            Route::post('/stores/import', [AdminController::class, 'importStores'])
                ->middleware('throttle:uploads');
            Route::delete('/stores/imported', [AdminController::class, 'clearImported']);
            Route::get('/stores/export', [AdminController::class, 'exportStores']);

            // User management
            Route::get('/users', [AdminController::class, 'users']);
            Route::put('/users/{user}', [AdminController::class, 'updateUser']);

            // Claims
            Route::get('/claims', [AdminController::class, 'claims']);
            Route::put('/claims/{claim}', [AdminController::class, 'updateClaim']);
        });
});
