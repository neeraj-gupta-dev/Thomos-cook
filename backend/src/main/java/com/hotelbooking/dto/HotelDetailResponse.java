package com.hotelbooking.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record HotelDetailResponse(
        Long id,
        String name,
        String location,
        String description,
        List<String> amenities,
        String imageUrl,
        BigDecimal pricePerNight,
        Integer totalRooms,
        Integer availableRooms,
        Integer nights,
        BigDecimal totalPrice,
        List<NightlyAvailability> nightlyAvailability
) {
    public record NightlyAvailability(LocalDate date, int availableRooms) {
    }
}

