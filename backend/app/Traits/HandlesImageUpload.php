<?php

namespace App\Traits;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

trait HandlesImageUpload
{
    protected function uploadImage(UploadedFile $file, string $directory = 'stores'): string
    {
        $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs($directory, $filename, 'public');
        return '/storage/' . $path;
    }

    protected function deleteImage(?string $path): void
    {
        if ($path && str_starts_with($path, '/storage/')) {
            $storagePath = str_replace('/storage/', '', $path);
            Storage::disk('public')->delete($storagePath);
        }
    }
}
