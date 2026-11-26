package com.hotelbooking.dto;

import java.math.BigDecimal;
import java.util.List;

public record HotelSummaryResponse(
        Long id,
        String name,
        String location,
        String description,
        List<String> amenities,
        BigDecimal pricePerNight,
        Integer totalRooms,
        Integer availableRooms,
        Integer nights,
        BigDecimal totalPrice
) {
}

