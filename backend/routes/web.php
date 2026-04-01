<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'app' => 'KedaiKopi API',
        'version' => '2.0',
        'docs' => '/api',
    ]);
});
