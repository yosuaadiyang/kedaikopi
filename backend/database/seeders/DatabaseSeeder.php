<?php

namespace Database\Seeders;

use App\Models\Amenity;
use App\Models\City;
use App\Models\Menu;
use App\Models\Province;
use App\Models\Review;
use App\Models\Specialty;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Super Admin
        User::firstOrCreate(
            ['email' => 'admin@kedaikopi.id'],
            [
                'name' => 'Admin KedaiKopi',
                'password' => 'Admin123!',
                'role' => 'super_admin',
                'email_verified_at' => now(),
            ]
        );

        // Demo user
        User::firstOrCreate(
            ['email' => 'user@kedaikopi.id'],
            [
                'name' => 'Demo User',
                'password' => 'User1234!',
                'role' => 'user',
                'email_verified_at' => now(),
            ]
        );

        // Provinces & Cities
        $locations = [
            'DKI Jakarta' => ['Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Barat', 'Jakarta Timur', 'Jakarta Utara'],
            'Jawa Barat' => ['Bandung', 'Bogor', 'Depok', 'Bekasi', 'Cimahi', 'Garut'],
            'Jawa Tengah' => ['Semarang', 'Solo', 'Magelang', 'Pekalongan', 'Salatiga'],
            'Jawa Timur' => ['Surabaya', 'Malang', 'Kediri', 'Batu', 'Sidoarjo'],
            'DI Yogyakarta' => ['Yogyakarta', 'Sleman', 'Bantul', 'Gunung Kidul', 'Kulon Progo'],
            'Bali' => ['Denpasar', 'Badung', 'Gianyar', 'Tabanan', 'Ubud'],
            'Sumatera Utara' => ['Medan', 'Deli Serdang', 'Binjai'],
            'Sumatera Barat' => ['Padang', 'Bukittinggi', 'Payakumbuh'],
            'Sumatera Selatan' => ['Palembang', 'Lubuklinggau'],
            'Riau' => ['Pekanbaru', 'Dumai'],
            'Lampung' => ['Bandar Lampung', 'Metro'],
            'Kalimantan Timur' => ['Samarinda', 'Balikpapan'],
            'Kalimantan Selatan' => ['Banjarmasin', 'Banjarbaru'],
            'Sulawesi Selatan' => ['Makassar', 'Parepare'],
            'Sulawesi Utara' => ['Manado', 'Bitung'],
            'Aceh' => ['Banda Aceh', 'Lhokseumawe'],
            'Banten' => ['Tangerang', 'Tangerang Selatan', 'Serang', 'Cilegon'],
            'NTB' => ['Mataram', 'Lombok Barat'],
            'NTT' => ['Kupang', 'Ende'],
            'Papua' => ['Jayapura', 'Merauke'],
        ];

        foreach ($locations as $provName => $cities) {
            $province = Province::firstOrCreate(
                ['slug' => Str::slug($provName)],
                ['name' => $provName]
            );
            foreach ($cities as $cityName) {
                City::firstOrCreate(
                    ['slug' => Str::slug($cityName)],
                    ['province_id' => $province->id, 'name' => $cityName]
                );
            }
        }

        // Amenities
        $amenities = [
            ['name' => 'WiFi', 'icon' => 'wifi'],
            ['name' => 'AC', 'icon' => 'snowflake'],
            ['name' => 'Smoking Area', 'icon' => 'cigarette'],
            ['name' => 'Outdoor', 'icon' => 'tree'],
            ['name' => 'Musholla', 'icon' => 'moon'],
            ['name' => 'Toilet', 'icon' => 'droplet'],
            ['name' => 'Parkir Mobil', 'icon' => 'car'],
            ['name' => 'Parkir Motor', 'icon' => 'bike'],
            ['name' => 'Meeting Room', 'icon' => 'users'],
            ['name' => 'Coworking Space', 'icon' => 'laptop'],
            ['name' => 'Live Music', 'icon' => 'music'],
            ['name' => 'Board Games', 'icon' => 'gamepad'],
            ['name' => 'Pet Friendly', 'icon' => 'paw-print'],
            ['name' => 'Kid Friendly', 'icon' => 'baby'],
            ['name' => 'Projector', 'icon' => 'monitor'],
            ['name' => 'Power Outlet', 'icon' => 'plug'],
            ['name' => 'Dine In', 'icon' => 'utensils'],
            ['name' => 'Take Away', 'icon' => 'package'],
            ['name' => 'Delivery', 'icon' => 'truck'],
            ['name' => 'Reservasi', 'icon' => 'calendar'],
            ['name' => 'Rooftop', 'icon' => 'sun'],
            ['name' => 'Garden', 'icon' => 'flower'],
            ['name' => 'Library', 'icon' => 'book'],
            ['name' => 'QRIS', 'icon' => 'qr-code'],
        ];

        foreach ($amenities as $a) {
            Amenity::firstOrCreate(
                ['slug' => Str::slug($a['name'])],
                [...$a]
            );
        }

        // Coffee Specialties
        $specialties = [
            'Kopi Aceh Gayo', 'Kopi Toraja', 'Kopi Mandailing',
            'Kopi Luwak', 'Kopi Kintamani', 'Kopi Wamena',
            'Kopi Flores Bajawa', 'Kopi Java Preanger', 'Kopi Robusta Lampung',
            'Kopi Liberika Jambi', 'Espresso Based', 'Manual Brew',
            'Cold Brew', 'Kopi Susu Nusantara', 'Matcha & Tea',
            'Non-Coffee', 'Signature Blend', 'Single Origin',
            'Pour Over', 'Siphon',
        ];

        foreach ($specialties as $s) {
            Specialty::firstOrCreate(
                ['slug' => Str::slug($s)],
                ['name' => $s]
            );
        }

        // ─── Demo Stores ────────────────────────────────
        $admin = User::where('email', 'admin@kedaikopi.id')->first();
        $demoUser = User::where('email', 'user@kedaikopi.id')->first();

        // Store owner accounts
        $owner1 = User::firstOrCreate(
            ['email' => 'owner1@kedaikopi.id'],
            ['name' => 'Budi Santoso', 'password' => 'Owner123!', 'role' => 'store_owner', 'email_verified_at' => now()]
        );
        $owner2 = User::firstOrCreate(
            ['email' => 'owner2@kedaikopi.id'],
            ['name' => 'Sari Rahmawati', 'password' => 'Owner123!', 'role' => 'store_owner', 'email_verified_at' => now()]
        );
        $owner3 = User::firstOrCreate(
            ['email' => 'owner3@kedaikopi.id'],
            ['name' => 'Andi Pratama', 'password' => 'Owner123!', 'role' => 'store_owner', 'email_verified_at' => now()]
        );

        // Reviewer accounts
        $reviewers = [];
        $reviewerData = [
            ['Dewi Lestari', 'dewi@example.com'],
            ['Rizky Firmansyah', 'rizky@example.com'],
            ['Maya Putri', 'maya@example.com'],
            ['Fajar Nugroho', 'fajar@example.com'],
            ['Ayu Kartika', 'ayu@example.com'],
            ['Dimas Prasetyo', 'dimas@example.com'],
            ['Nadia Safitri', 'nadia@example.com'],
            ['Galih Wicaksono', 'galih@example.com'],
        ];
        foreach ($reviewerData as [$rName, $rEmail]) {
            $reviewers[] = User::firstOrCreate(
                ['email' => $rEmail],
                ['name' => $rName, 'password' => 'Review123!', 'role' => 'user', 'email_verified_at' => now()]
            );
        }

        $storesData = [
            // Jakarta
            [
                'user_id' => $owner1->id,
                'name' => 'Filosofi Kopi',
                'description' => 'Kedai kopi yang menghadirkan pengalaman kopi Nusantara terbaik. Kami menyajikan biji kopi pilihan dari berbagai daerah di Indonesia, diolah dengan metode manual brew oleh barista berpengalaman. Suasana hangat dan nyaman untuk bersantai maupun bekerja.',
                'address' => 'Jl. Melawai VI No. 12, Blok M, Kebayoran Baru',
                'province' => 'DKI Jakarta', 'city' => 'Jakarta Selatan',
                'latitude' => -6.2437, 'longitude' => 106.7981,
                'phone' => '021-7234567', 'instagram' => 'filosofikopi',
                'website' => 'https://filosofikopi.id',
                'price_range' => '$$', 'is_featured' => true,
                'opening_hours' => ['Mon-Fri' => '07:00-22:00', 'Sat-Sun' => '08:00-23:00'],
                'amenities' => ['WiFi', 'AC', 'Power Outlet', 'Dine In', 'Take Away', 'QRIS', 'Musholla'],
                'specialties' => ['Single Origin', 'Manual Brew', 'Pour Over', 'Kopi Aceh Gayo'],
                'menus' => [
                    ['name' => 'V60 Gayo Aceh', 'price' => 35000, 'category' => 'coffee', 'description' => 'Single origin pour over dari dataran tinggi Gayo'],
                    ['name' => 'Espresso Double Shot', 'price' => 28000, 'category' => 'coffee', 'description' => 'Doppio dengan biji house blend pilihan'],
                    ['name' => 'Kopi Susu Nusantara', 'price' => 32000, 'category' => 'coffee', 'description' => 'Signature blend dengan susu segar dan gula aren'],
                    ['name' => 'Cold Brew 12 Jam', 'price' => 38000, 'category' => 'coffee', 'description' => 'Diseduh pelan selama 12 jam untuk rasa smooth'],
                    ['name' => 'Matcha Latte', 'price' => 35000, 'category' => 'non-coffee', 'description' => 'Matcha Uji premium dengan susu oat'],
                    ['name' => 'Pisang Goreng Keju', 'price' => 25000, 'category' => 'food', 'description' => 'Pisang raja goreng crispy dengan taburan keju'],
                    ['name' => 'Nasi Goreng Kampung', 'price' => 38000, 'category' => 'food', 'description' => 'Nasi goreng bumbu tradisional dengan telur ceplok'],
                ],
                'reviews' => [
                    ['rating' => 5, 'comment' => 'Tempat favorit saya untuk ngopi! V60 Gayo-nya luar biasa, bisa terasa notes buah dan coklat. Barista-nya juga ramah dan knowledgeable banget soal kopi.'],
                    ['rating' => 5, 'comment' => 'Suasananya cozy dan WiFi kencang. Cocok banget buat WFH. Kopi susu nusantaranya addictive!'],
                    ['rating' => 4, 'comment' => 'Kopi enak, tempat nyaman. Agak ramai di weekend tapi worth it. Cold brew 12 jam-nya smooth banget.'],
                    ['rating' => 5, 'comment' => 'Best manual brew in South Jakarta! Pelayanan cepat dan konsisten. Selalu jadi pilihan pertama kalau mau meeting.'],
                    ['rating' => 4, 'comment' => 'Menu makanannya juga enak. Nasi goreng kampungnya pas banget dimakan siang-siang sambil ngopi.'],
                ],
            ],
            [
                'user_id' => $owner2->id,
                'name' => 'Kopi Tuku',
                'description' => 'Pionir kopi susu gula aren kekinian di Jakarta. Berdiri sejak 2015, Kopi Tuku menghadirkan racikan kopi susu yang telah menjadi ikon budaya ngopi anak muda Indonesia. Menggunakan biji kopi lokal berkualitas tinggi.',
                'address' => 'Jl. Cipete Raya No. 26',
                'province' => 'DKI Jakarta', 'city' => 'Jakarta Selatan',
                'latitude' => -6.2611, 'longitude' => 106.7970,
                'phone' => '021-7654321', 'instagram' => 'kopituku',
                'price_range' => '$', 'is_featured' => true,
                'opening_hours' => ['Mon-Sun' => '07:00-21:00'],
                'amenities' => ['Take Away', 'QRIS', 'Parkir Motor', 'Dine In'],
                'specialties' => ['Kopi Susu Nusantara', 'Espresso Based', 'Signature Blend'],
                'menus' => [
                    ['name' => 'Es Kopi Susu', 'price' => 18000, 'category' => 'coffee', 'description' => 'Kopi susu gula aren yang legendaris'],
                    ['name' => 'Americano', 'price' => 20000, 'category' => 'coffee', 'description' => 'Espresso dengan air panas'],
                    ['name' => 'Es Kopi Susu Aren', 'price' => 22000, 'category' => 'coffee', 'description' => 'Dengan gula aren pilihan dari Banten'],
                    ['name' => 'Teh Tarik', 'price' => 15000, 'category' => 'non-coffee', 'description' => 'Teh tarik klasik dengan susu'],
                    ['name' => 'Roti Bakar', 'price' => 15000, 'category' => 'food', 'description' => 'Roti bakar dengan selai coklat kacang'],
                ],
                'reviews' => [
                    ['rating' => 5, 'comment' => 'Es kopi susunya emang gak pernah mengecewakan. Murah, enak, cepat. The OG kopi susu!'],
                    ['rating' => 4, 'comment' => 'Harga terjangkau, rasa premium. Wajib coba kalau ke Jakarta.'],
                    ['rating' => 5, 'comment' => 'Tempat legendaris! Antrian panjang tapi worth the wait. Es kopi susu aren-nya juara.'],
                    ['rating' => 4, 'comment' => 'Simple tapi nagih. Sering beli buat take away sebelum ke kantor.'],
                ],
            ],
            // Bandung
            [
                'user_id' => $owner3->id,
                'name' => 'Sejiwa Coffee',
                'description' => 'Roastery & cafe di Bandung yang fokus pada kopi specialty Indonesia. Kami memanggang sendiri biji kopi pilihan dan menyajikannya dalam suasana industrial minimalis yang instagramable. Workshop dan cupping session tersedia setiap weekend.',
                'address' => 'Jl. Progo No. 15, Citarum',
                'province' => 'Jawa Barat', 'city' => 'Bandung',
                'latitude' => -6.9037, 'longitude' => 107.6195,
                'phone' => '022-4231567', 'instagram' => 'sejiwacoffee',
                'website' => 'https://sejiwacoffee.com',
                'price_range' => '$$$', 'is_featured' => true,
                'opening_hours' => ['Mon-Thu' => '08:00-22:00', 'Fri-Sun' => '08:00-23:00'],
                'amenities' => ['WiFi', 'AC', 'Outdoor', 'Power Outlet', 'Meeting Room', 'Dine In', 'Take Away', 'QRIS', 'Parkir Mobil'],
                'specialties' => ['Single Origin', 'Manual Brew', 'Siphon', 'Kopi Java Preanger', 'Kopi Toraja'],
                'menus' => [
                    ['name' => 'Siphon Java Preanger', 'price' => 55000, 'category' => 'coffee', 'description' => 'Kopi lokal Bandung diseduh dengan siphon'],
                    ['name' => 'Espresso Tonic', 'price' => 42000, 'category' => 'coffee', 'description' => 'Double shot espresso dengan tonic water premium'],
                    ['name' => 'Dirty Chai Latte', 'price' => 40000, 'category' => 'coffee', 'description' => 'Chai spice latte dengan shot espresso'],
                    ['name' => 'Affogato', 'price' => 38000, 'category' => 'coffee', 'description' => 'Gelato vanilla dengan double espresso'],
                    ['name' => 'Banana Bread', 'price' => 28000, 'category' => 'food', 'description' => 'Homemade banana bread with walnut'],
                    ['name' => 'Croissant Almond', 'price' => 32000, 'category' => 'food', 'description' => 'Butter croissant dengan almond cream'],
                ],
                'reviews' => [
                    ['rating' => 5, 'comment' => 'Siphon Java Preanger-nya WAJIB dicoba. Terasa banget karakter kopi Bandung. Tempatnya juga estetik banget.'],
                    ['rating' => 5, 'comment' => 'Roastery terbaik di Bandung! Bisa lihat langsung proses roasting. Cupping session-nya edukatif banget.'],
                    ['rating' => 4, 'comment' => 'Harga agak premium tapi kualitasnya memang beda. Espresso tonic-nya refreshing.'],
                    ['rating' => 5, 'comment' => 'Tempat perfect buat meeting klien. Suasana profesional, kopi berkelas.'],
                ],
            ],
            // Yogyakarta
            [
                'user_id' => $owner1->id,
                'name' => 'Kopi Joss Lik Man',
                'description' => 'Kopi legendaris khas Yogyakarta dengan arang membara dicelupkan langsung ke dalam gelas kopi. Tradisi unik yang sudah ada sejak 1960-an di kawasan Stasiun Tugu. Wajib dikunjungi untuk pengalaman kopi yang otentik.',
                'address' => 'Jl. Wongsodirjan, Gedongtengen',
                'province' => 'DI Yogyakarta', 'city' => 'Yogyakarta',
                'latitude' => -7.7893, 'longitude' => 110.3611,
                'phone' => '0812-2734-5678', 'instagram' => 'kopijosslikman',
                'price_range' => '$', 'is_featured' => true,
                'opening_hours' => ['Mon-Sun' => '17:00-01:00'],
                'amenities' => ['Outdoor', 'Smoking Area', 'Dine In', 'Parkir Motor'],
                'specialties' => ['Kopi Susu Nusantara', 'Kopi Robusta Lampung'],
                'menus' => [
                    ['name' => 'Kopi Joss Original', 'price' => 5000, 'category' => 'coffee', 'description' => 'Kopi hitam dengan arang panas dicelup langsung'],
                    ['name' => 'Kopi Joss Susu', 'price' => 8000, 'category' => 'coffee', 'description' => 'Kopi joss dengan tambahan susu kental manis'],
                    ['name' => 'Wedang Jahe', 'price' => 5000, 'category' => 'non-coffee', 'description' => 'Minuman jahe hangat tradisional'],
                    ['name' => 'Indomie Rebus', 'price' => 8000, 'category' => 'food', 'description' => 'Indomie rebus telur dengan bumbu spesial'],
                ],
                'reviews' => [
                    ['rating' => 5, 'comment' => 'Pengalaman ngopi yang unik banget! Arangnya dicelup langsung ke kopi, suaranya sss... Rasanya surprisingly smooth.'],
                    ['rating' => 4, 'comment' => 'Legendary! Harganya murah banget, suasana angkringan Jogja yang autentik. Wajib coba kalau ke Yogya.'],
                    ['rating' => 5, 'comment' => 'Sudah datang ke sini sejak masih kuliah. Tidak pernah berubah, tetap enak dan tetap murah meriah.'],
                    ['rating' => 4, 'comment' => 'Tempat nongkrong malam yang asik. Sambil makan indomie dan ngopi joss, mantap!'],
                    ['rating' => 5, 'comment' => 'Must visit di Yogya! Bawa teman-teman dari luar kota pasti kagum. Budaya kopi Indonesia banget.'],
                ],
            ],
            // Bali
            [
                'user_id' => $owner2->id,
                'name' => 'Revolver Espresso',
                'description' => 'Hidden gem di gang sempit Seminyak yang terkenal dengan espresso berkualitas tinggi. Konsep speakeasy bar dengan interior industrial yang unik. Menggunakan biji kopi specialty dari berbagai daerah di Indonesia.',
                'address' => 'Jl. Kayu Aya Gang 51, Seminyak',
                'province' => 'Bali', 'city' => 'Badung',
                'latitude' => -8.6862, 'longitude' => 115.1607,
                'phone' => '0361-8347689', 'instagram' => 'revolverespresso',
                'website' => 'https://revolverespresso.com',
                'price_range' => '$$$', 'is_featured' => true,
                'opening_hours' => ['Mon-Sun' => '06:30-18:00'],
                'amenities' => ['AC', 'WiFi', 'Dine In', 'Take Away', 'QRIS'],
                'specialties' => ['Espresso Based', 'Single Origin', 'Kopi Kintamani', 'Cold Brew'],
                'menus' => [
                    ['name' => 'Flat White', 'price' => 45000, 'category' => 'coffee', 'description' => 'Silky smooth microfoam with double ristretto'],
                    ['name' => 'Kintamani Espresso', 'price' => 40000, 'category' => 'coffee', 'description' => 'Single origin dari dataran tinggi Kintamani'],
                    ['name' => 'Iced Long Black', 'price' => 38000, 'category' => 'coffee', 'description' => 'Double shot over ice, clean dan bold'],
                    ['name' => 'Coconut Cold Brew', 'price' => 48000, 'category' => 'coffee', 'description' => 'Cold brew dengan coconut cream segar'],
                    ['name' => 'Acai Bowl', 'price' => 65000, 'category' => 'food', 'description' => 'Acai blend dengan granola dan buah segar'],
                ],
                'reviews' => [
                    ['rating' => 5, 'comment' => 'Best espresso in Bali, hands down! Tempatnya hidden tapi worth the hunt. Flat white-nya sempurna.'],
                    ['rating' => 5, 'comment' => 'Vibes-nya keren banget, industrial speakeasy. Kintamani espresso-nya bikin jatuh cinta.'],
                    ['rating' => 4, 'comment' => 'Harga Bali premium tapi kualitasnya top. Coconut cold brew-nya unik dan refreshing.'],
                ],
            ],
            // Surabaya
            [
                'user_id' => $owner3->id,
                'name' => 'Kopi Kenangan Heritage',
                'description' => 'Cabang heritage Kopi Kenangan di Surabaya yang mengusung konsep premium. Terletak di bangunan heritage era kolonial yang direnovasi dengan cantik. Menyajikan menu kopi pilihan dengan sentuhan tradisional Jawa Timur.',
                'address' => 'Jl. Tunjungan No. 45, Genteng',
                'province' => 'Jawa Timur', 'city' => 'Surabaya',
                'latitude' => -7.2619, 'longitude' => 112.7426,
                'phone' => '031-5345678', 'instagram' => 'kopikenanganheritage',
                'price_range' => '$$', 'is_featured' => true,
                'opening_hours' => ['Mon-Thu' => '07:00-22:00', 'Fri-Sun' => '07:00-23:00'],
                'amenities' => ['WiFi', 'AC', 'Dine In', 'Take Away', 'QRIS', 'Parkir Mobil', 'Meeting Room', 'Power Outlet', 'Musholla', 'Toilet'],
                'specialties' => ['Espresso Based', 'Kopi Susu Nusantara', 'Signature Blend', 'Non-Coffee'],
                'menus' => [
                    ['name' => 'Kenangan Latte', 'price' => 24000, 'category' => 'coffee', 'description' => 'Signature latte dengan gula aren asli'],
                    ['name' => 'Americano Heritage', 'price' => 22000, 'category' => 'coffee', 'description' => 'Americano dengan biji roast khusus heritage blend'],
                    ['name' => 'Kopi Susu Mantap', 'price' => 20000, 'category' => 'coffee', 'description' => 'Es kopi susu dengan perpaduan pas'],
                    ['name' => 'Chocolate Lava', 'price' => 28000, 'category' => 'non-coffee', 'description' => 'Belgian chocolate dengan susu segar'],
                    ['name' => 'Chicken Katsu Rice', 'price' => 35000, 'category' => 'food', 'description' => 'Ayam katsu crispy dengan nasi dan salad'],
                    ['name' => 'French Fries', 'price' => 22000, 'category' => 'food', 'description' => 'Kentang goreng dengan bumbu truffle'],
                ],
                'reviews' => [
                    ['rating' => 5, 'comment' => 'Tempatnya di bangunan heritage yang cantik banget! Kopi juga enak. Perfect untuk foto-foto.'],
                    ['rating' => 4, 'comment' => 'Kenangan Latte-nya tetap jadi andalan. Plus nilai tambah interior heritage yang bikin betah.'],
                    ['rating' => 5, 'comment' => 'Meeting room-nya bagus untuk kerja. WiFi cepat, kopi enak, outlet banyak. Lengkap!'],
                    ['rating' => 4, 'comment' => 'Harga bersahabat untuk kualitas segini. Selalu mampir kalau ke Tunjungan.'],
                ],
            ],
            // Malang
            [
                'user_id' => $owner1->id,
                'name' => 'Kopi Cak Wang',
                'description' => 'Warung kopi tradisional Malang yang sudah berdiri sejak 1985. Menggunakan biji kopi robusta pilihan dari Dampit yang disangrai sendiri. Suasana warung kopi klasik dengan harga rakyat.',
                'address' => 'Jl. Semeru No. 8, Klojen',
                'province' => 'Jawa Timur', 'city' => 'Malang',
                'latitude' => -7.9770, 'longitude' => 112.6340,
                'phone' => '0812-3456-7890', 'instagram' => 'kopicakwang',
                'price_range' => '$', 'is_featured' => false,
                'opening_hours' => ['Mon-Sat' => '06:00-21:00', 'Sun' => '07:00-20:00'],
                'amenities' => ['Smoking Area', 'Outdoor', 'Dine In', 'Parkir Motor', 'WiFi'],
                'specialties' => ['Kopi Robusta Lampung', 'Kopi Susu Nusantara'],
                'menus' => [
                    ['name' => 'Kopi Tubruk', 'price' => 5000, 'category' => 'coffee', 'description' => 'Kopi tubruk robusta Dampit asli'],
                    ['name' => 'Kopi Susu', 'price' => 8000, 'category' => 'coffee', 'description' => 'Kopi tubruk dengan susu kental manis'],
                    ['name' => 'Kopi Jahe', 'price' => 7000, 'category' => 'coffee', 'description' => 'Kopi dengan jahe segar, menghangatkan'],
                    ['name' => 'Gorengan Campur', 'price' => 5000, 'category' => 'food', 'description' => 'Bakwan, tahu isi, tempe goreng'],
                ],
                'reviews' => [
                    ['rating' => 5, 'comment' => 'Kopi tubruk paling enak se-Malang! Robusta Dampit-nya mantap, pahit tapi ada manis-manisnya.'],
                    ['rating' => 4, 'comment' => 'Warung kopi legendaris. Harga murah, rasa juara. Gorengannya juga masih anget terus.'],
                    ['rating' => 5, 'comment' => 'Kopi jahenya pas banget diminum pagi-pagi. Udara Malang yang dingin + kopi jahe = perfect.'],
                ],
            ],
            // Medan
            [
                'user_id' => $owner2->id,
                'name' => 'Aming Coffee',
                'description' => 'Kedai kopi legendaris Medan yang terkenal dengan kopi tarik dan roti bakar. Tempat nongkrong favorit warga Medan sejak 1990. Biji kopi robusta Sidikalang pilihan, disangrai manual setiap pagi.',
                'address' => 'Jl. S. Parman No. 112, Medan Petisah',
                'province' => 'Sumatera Utara', 'city' => 'Medan',
                'latitude' => 3.5930, 'longitude' => 98.6722,
                'phone' => '061-4523456', 'instagram' => 'amingcoffee',
                'price_range' => '$', 'is_featured' => false,
                'opening_hours' => ['Mon-Sun' => '06:00-00:00'],
                'amenities' => ['Dine In', 'Take Away', 'Smoking Area', 'Parkir Motor', 'Parkir Mobil', 'Outdoor'],
                'specialties' => ['Kopi Mandailing', 'Kopi Susu Nusantara'],
                'menus' => [
                    ['name' => 'Kopi Tarik', 'price' => 12000, 'category' => 'coffee', 'description' => 'Kopi ditarik ala Aming, lembut berbuih'],
                    ['name' => 'Kopi O Kosong', 'price' => 8000, 'category' => 'coffee', 'description' => 'Kopi hitam tanpa gula, strong'],
                    ['name' => 'Kopi Susu Telur', 'price' => 15000, 'category' => 'coffee', 'description' => 'Kopi dengan kuning telur kocok, creamy'],
                    ['name' => 'Roti Bakar Kaya', 'price' => 12000, 'category' => 'food', 'description' => 'Roti bakar dengan selai kaya homemade'],
                    ['name' => 'Mie Goreng Aceh', 'price' => 20000, 'category' => 'food', 'description' => 'Mie goreng bumbu Aceh pedas'],
                ],
                'reviews' => [
                    ['rating' => 5, 'comment' => 'Kopi tariknya nomor satu di Medan! Buihnya lembut, kopinya strong. Buka sampai tengah malam pula.'],
                    ['rating' => 4, 'comment' => 'Roti bakar kaya-nya enak banget, homemade. Pair dengan kopi tarik, mantap jiwa.'],
                    ['rating' => 5, 'comment' => 'Sudah langganan dari jaman kuliah. Kopi susu telurnya unik dan creamy. Harga bersahabat.'],
                ],
            ],
            // Makassar
            [
                'user_id' => $owner3->id,
                'name' => 'Warkop Phoenam',
                'description' => 'Warkop legendaris Makassar yang sudah ada sejak 1946. Ikon budaya kopi Sulawesi Selatan. Kopi Toraja diseduh tradisional dengan resep turun-temurun. Tempat berkumpulnya berbagai kalangan untuk diskusi dan sosialisasi.',
                'address' => 'Jl. Sulawesi No. 62, Kota Makassar',
                'province' => 'Sulawesi Selatan', 'city' => 'Makassar',
                'latitude' => -5.1330, 'longitude' => 119.4184,
                'phone' => '0411-3234567', 'instagram' => 'warkopphoenam',
                'price_range' => '$', 'is_featured' => false,
                'opening_hours' => ['Mon-Sun' => '06:00-23:00'],
                'amenities' => ['Dine In', 'Smoking Area', 'Outdoor', 'Parkir Motor', 'WiFi'],
                'specialties' => ['Kopi Toraja', 'Kopi Susu Nusantara'],
                'menus' => [
                    ['name' => 'Kopi Toraja Tubruk', 'price' => 10000, 'category' => 'coffee', 'description' => 'Kopi Toraja otentik, diseduh tubruk'],
                    ['name' => 'Kopi Susu Special', 'price' => 12000, 'category' => 'coffee', 'description' => 'Kopi susu racikan khas Phoenam'],
                    ['name' => 'Sarabba', 'price' => 10000, 'category' => 'non-coffee', 'description' => 'Minuman tradisional Makassar dari jahe, gula merah, dan santan'],
                    ['name' => 'Pisang Epe', 'price' => 10000, 'category' => 'food', 'description' => 'Pisang bakar geprek khas Makassar dengan saus gula merah'],
                ],
                'reviews' => [
                    ['rating' => 5, 'comment' => 'Warkop paling bersejarah di Makassar! Kopi Toraja-nya authentic banget. Suasana penuh cerita.'],
                    ['rating' => 5, 'comment' => 'Kalau ke Makassar wajib ke sini. Bukan cuma kopinya, tapi pengalaman budaya ngopi Sulawesi.'],
                    ['rating' => 4, 'comment' => 'Sarabba-nya hangat dan enak. Pisang epe sambil ngopi sore, perfect combo.'],
                    ['rating' => 5, 'comment' => 'Sudah berdiri sejak 1946 dan masih ramai. Bukti kalau kopi sini memang juara.'],
                ],
            ],
            // Tangerang Selatan (near Jakarta)
            [
                'user_id' => $owner1->id,
                'name' => 'Anomali Coffee',
                'description' => 'Roastery cafe yang mengangkat kopi Indonesia ke standar internasional. Biji kopi dipilih langsung dari petani lokal di seluruh nusantara. Tersedia workshop brewing untuk pemula hingga profesional.',
                'address' => 'Jl. BSD Green Office Park, Tangerang Selatan',
                'province' => 'Banten', 'city' => 'Tangerang Selatan',
                'latitude' => -6.3011, 'longitude' => 106.6527,
                'phone' => '021-5312345', 'instagram' => 'anomalicoffee',
                'website' => 'https://anomalicoffee.com',
                'price_range' => '$$$', 'is_featured' => false,
                'opening_hours' => ['Mon-Fri' => '07:00-21:00', 'Sat-Sun' => '08:00-22:00'],
                'amenities' => ['WiFi', 'AC', 'Coworking Space', 'Meeting Room', 'Power Outlet', 'Dine In', 'Take Away', 'QRIS', 'Parkir Mobil', 'Toilet'],
                'specialties' => ['Single Origin', 'Manual Brew', 'Pour Over', 'Cold Brew', 'Kopi Flores Bajawa', 'Kopi Wamena'],
                'menus' => [
                    ['name' => 'Flores Bajawa V60', 'price' => 48000, 'category' => 'coffee', 'description' => 'Single origin dari Flores, notes coklat dan rempah'],
                    ['name' => 'Papua Wamena Chemex', 'price' => 52000, 'category' => 'coffee', 'description' => 'Kopi langka dari pegunungan Wamena'],
                    ['name' => 'Nitro Cold Brew', 'price' => 48000, 'category' => 'coffee', 'description' => 'Cold brew infused nitrogen, creamy tanpa susu'],
                    ['name' => 'Eggs Benedict', 'price' => 55000, 'category' => 'food', 'description' => 'Poached egg dengan hollandaise sauce'],
                    ['name' => 'Granola Bowl', 'price' => 42000, 'category' => 'food', 'description' => 'Yogurt, granola, dan buah segar'],
                ],
                'reviews' => [
                    ['rating' => 5, 'comment' => 'Papua Wamena Chemex-nya luar biasa! Jarang banget bisa nemu kopi Wamena di Jakarta area.'],
                    ['rating' => 4, 'comment' => 'Coworking space-nya nyaman banget. Nitro cold brew-nya smooth dan creamy.'],
                    ['rating' => 5, 'comment' => 'Workshop brewing mereka sangat informatif. Recommended untuk yang mau belajar kopi.'],
                ],
            ],
        ];

        foreach ($storesData as $storeData) {
            $provinceName = $storeData['province'];
            $cityName = $storeData['city'];
            unset($storeData['province'], $storeData['city']);

            $province = Province::where('name', $provinceName)->first();
            $city = City::where('name', $cityName)->first();

            if (!$province || !$city) continue;

            $amenityNames = $storeData['amenities'] ?? [];
            $specialtyNames = $storeData['specialties'] ?? [];
            $menuItems = $storeData['menus'] ?? [];
            $reviewItems = $storeData['reviews'] ?? [];
            unset($storeData['amenities'], $storeData['specialties'], $storeData['menus'], $storeData['reviews']);

            $store = Store::firstOrCreate(
                ['name' => $storeData['name']],
                array_merge($storeData, [
                    'province_id' => $province->id,
                    'city_id' => $city->id,
                    'status' => 'approved',
                    'opening_hours' => $storeData['opening_hours'] ?? null,
                ])
            );

            // Attach amenities
            $amenityIds = Amenity::whereIn('name', $amenityNames)->pluck('id')->toArray();
            if (!empty($amenityIds)) {
                $store->amenities()->syncWithoutDetaching($amenityIds);
            }

            // Attach specialties
            $specialtyIds = Specialty::whereIn('name', $specialtyNames)->pluck('id')->toArray();
            if (!empty($specialtyIds)) {
                $store->specialties()->syncWithoutDetaching($specialtyIds);
            }

            // Create menus
            foreach ($menuItems as $menuData) {
                Menu::firstOrCreate(
                    ['store_id' => $store->id, 'name' => $menuData['name']],
                    array_merge($menuData, ['store_id' => $store->id, 'is_available' => true])
                );
            }

            // Create reviews (distribute among reviewers)
            foreach ($reviewItems as $i => $reviewData) {
                $reviewer = $reviewers[$i % count($reviewers)];
                Review::firstOrCreate(
                    ['store_id' => $store->id, 'user_id' => $reviewer->id],
                    array_merge($reviewData, [
                        'store_id' => $store->id,
                        'user_id' => $reviewer->id,
                        'is_approved' => true,
                    ])
                );
            }

            // Update store rating
            $store->updateRating();
        }
    }
}
