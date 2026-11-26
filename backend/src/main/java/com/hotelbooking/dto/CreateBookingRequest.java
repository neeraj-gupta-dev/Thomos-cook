package com.hotelbooking.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateBookingRequest(
        @NotNull(message = "hotelId is required")
        Long hotelId,

        @NotBlank(message = "guestName is required")
        @Size(max = 150, message = "guestName must be at most 150 characters")
        String guestName,

        @NotBlank(message = "guestEmail is required")
        @Email(message = "guestEmail must be a valid email address")
        @Size(max = 255, message = "guestEmail must be at most 255 characters")
        String guestEmail,

        @NotNull(message = "checkIn is required")
        LocalDate checkIn,

        @NotNull(message = "checkOut is required")
        LocalDate checkOut
) {
}
