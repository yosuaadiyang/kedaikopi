<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checkins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();

            // Check-in data
            $table->decimal('checkin_lat', 10, 7)->nullable();
            $table->decimal('checkin_lng', 10, 7)->nullable();
            $table->decimal('distance_meters', 8, 1)->nullable();
            $table->timestamp('checked_in_at');

            // Check-out data
            $table->timestamp('checked_out_at')->nullable();
            $table->string('receipt_image')->nullable();
            $table->decimal('receipt_amount', 12, 0)->nullable();
            $table->text('notes')->nullable();

            // Status
            $table->string('status', 20)->default('checked_in'); // checked_in, checked_out, expired

            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['store_id', 'checked_in_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checkins');
    }
};
