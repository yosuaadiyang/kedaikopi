<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Menu;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MenuController extends Controller
{
    public function index(Store $store): JsonResponse
    {
        $menus = $store->menus()
            ->where('is_available', true)
            ->orderBy('category')
            ->orderBy('name')
            ->get();

        return response()->json($menus);
    }

    public function store(Request $request, Store $store): JsonResponse
    {
        if ($request->user()->id !== $store->user_id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'price' => 'required|integer|min:0|max:99999999',
            'category' => 'required|string|max:50',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'is_available' => 'boolean',
        ]);

        // Sanitize
        $validated['name'] = strip_tags($validated['name']);
        $validated['category'] = strip_tags($validated['category']);
        if (isset($validated['description'])) {
            $validated['description'] = strip_tags($validated['description']);
        }

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('menus', 'public');
            $validated['image'] = '/storage/' . $path;
        }

        $menu = $store->menus()->create($validated);

        return response()->json([
            'message' => 'Menu berhasil ditambahkan.',
            'menu' => $menu,
        ], 201);
    }

    public function update(Request $request, Menu $menu): JsonResponse
    {
        $store = $menu->store;
        if ($request->user()->id !== $store->user_id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'price' => 'sometimes|integer|min:0|max:99999999',
            'category' => 'sometimes|string|max:50',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'is_available' => 'boolean',
        ]);

        if (isset($validated['name'])) $validated['name'] = strip_tags($validated['name']);
        if (isset($validated['category'])) $validated['category'] = strip_tags($validated['category']);
        if (isset($validated['description'])) $validated['description'] = strip_tags($validated['description']);

        if ($request->hasFile('image')) {
            // Delete old image
            if ($menu->image) {
                $oldPath = str_replace('/storage/', '', $menu->image);
                Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('image')->store('menus', 'public');
            $validated['image'] = '/storage/' . $path;
        }

        $menu->update($validated);

        return response()->json([
            'message' => 'Menu berhasil diperbarui.',
            'menu' => $menu->fresh(),
        ]);
    }

    public function destroy(Request $request, Menu $menu): JsonResponse
    {
        $store = $menu->store;
        if ($request->user()->id !== $store->user_id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Delete image
        if ($menu->image) {
            $oldPath = str_replace('/storage/', '', $menu->image);
            Storage::disk('public')->delete($oldPath);
        }

        $menu->delete();
        return response()->json(['message' => 'Menu berhasil dihapus.']);
    }
}
