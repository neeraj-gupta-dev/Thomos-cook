package com.hotelbooking.dto;

import com.hotelbooking.entity.BookingStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record BookingResponse(
        String reference,
        Long hotelId,
        String hotelName,
        String hotelLocation,
        String guestName,
        String guestEmail,
        LocalDate checkIn,
        LocalDate checkOut,
        int nights,
        BigDecimal pricePerNight,
        BigDecimal totalAmount,
        BookingStatus status,
        Instant createdAt,
        Instant cancelledAt
) {
}
