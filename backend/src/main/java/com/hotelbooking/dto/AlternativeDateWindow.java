package com.hotelbooking.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AlternativeDateWindow(
        LocalDate checkIn,
        LocalDate checkOut,
        int nights,
        int availableRooms,
        BigDecimal totalPrice
) {
}

