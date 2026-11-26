package com.hotelbooking.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record QuoteRequest(
        @NotNull(message = "hotelId is required")
        Long hotelId,

        @NotNull(message = "checkIn is required")
        LocalDate checkIn,

        @NotNull(message = "checkOut is required")
        LocalDate checkOut
) {
}

