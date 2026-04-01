<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    'allowed_origins' => array_filter(array_merge(
        [
            env('FRONTEND_URL', 'http://localhost:5173'),
            env('APP_URL'),
        ],
        // Support comma-separated extra origins (e.g. for staging)
        array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', '')))
    )),
    'allowed_origins_patterns' => array_filter([
        // Vercel preview deployments
        env('CORS_PATTERN', 'https://kedaikopi.*\.vercel\.app'),
    ]),
    'allowed_headers' => ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-XSRF-TOKEN'],
    'exposed_headers' => ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
    'max_age' => 86400,
    'supports_credentials' => true,
];
