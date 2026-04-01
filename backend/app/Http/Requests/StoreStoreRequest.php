<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'address' => 'required|string|max:500',
            'province_id' => 'required|exists:provinces,id',
            'city_id' => 'required|exists:cities,id',
            'district_id' => 'nullable|exists:districts,id',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|url|max:255',
            'instagram' => 'nullable|string|max:100',
            'price_range' => 'nullable|in:$,$$,$$$,$$$$',
            'opening_hours' => 'nullable|string|max:500',
            'amenity_ids' => 'nullable|array',
            'amenity_ids.*' => 'exists:amenities,id',
            'specialty_ids' => 'nullable|array',
            'specialty_ids.*' => 'exists:specialties,id',
            'cover_image' => 'nullable|image|max:5120',
            'images' => 'nullable|array|max:10',
            'images.*' => 'image|max:5120',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama kedai wajib diisi',
            'address.required' => 'Alamat wajib diisi',
            'province_id.required' => 'Provinsi wajib dipilih',
            'city_id.required' => 'Kota wajib dipilih',
            'cover_image.max' => 'Ukuran gambar maksimal 5MB',
        ];
    }
}
