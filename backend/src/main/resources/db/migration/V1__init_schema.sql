CREATE TABLE hotels (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amenities VARCHAR(500) NOT NULL,
    price_per_night DECIMAL(10, 2) NOT NULL,
    total_rooms INT NOT NULL,
    CONSTRAINT chk_hotels_price_positive CHECK (price_per_night > 0),
    CONSTRAINT chk_hotels_total_rooms_positive CHECK (total_rooms > 0),
    INDEX idx_hotels_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE room_inventory (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    hotel_id BIGINT NOT NULL,
    stay_date DATE NOT NULL,
    booked_rooms INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_room_inventory_hotel FOREIGN KEY (hotel_id) REFERENCES hotels (id) ON DELETE CASCADE,
    CONSTRAINT uk_room_inventory_hotel_date UNIQUE (hotel_id, stay_date),
    CONSTRAINT chk_room_inventory_booked_non_negative CHECK (booked_rooms >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bookings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reference VARCHAR(32) NOT NULL,
    hotel_id BIGINT NOT NULL,
    guest_name VARCHAR(150) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    nights INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT uk_bookings_reference UNIQUE (reference),
    CONSTRAINT fk_bookings_hotel FOREIGN KEY (hotel_id) REFERENCES hotels (id),
    CONSTRAINT chk_bookings_dates CHECK (check_out > check_in),
    CONSTRAINT chk_bookings_nights_positive CHECK (nights > 0),
    CONSTRAINT chk_bookings_amount_non_negative CHECK (total_amount >= 0),
    INDEX idx_bookings_reference_email (reference, guest_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

