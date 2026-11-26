package com.hotelbooking.controller;

import com.hotelbooking.dto.BookingResponse;
import com.hotelbooking.dto.CancelBookingRequest;
import com.hotelbooking.dto.CreateBookingRequest;
import com.hotelbooking.dto.QuoteRequest;
import com.hotelbooking.dto.QuoteResponse;
import com.hotelbooking.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping("/quote")
    public ResponseEntity<QuoteResponse> getQuote(@Valid @RequestBody QuoteRequest request) {
        return ResponseEntity.ok(
                bookingService.getQuote(request.hotelId(), request.checkIn(), request.checkOut())
        );
    }

    @PostMapping
    public ResponseEntity<BookingResponse> createBooking(@Valid @RequestBody CreateBookingRequest request) {
        BookingResponse created = bookingService.createBooking(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{reference}")
    public ResponseEntity<BookingResponse> getBooking(
            @PathVariable String reference,
            @RequestParam String email
    ) {
        return ResponseEntity.ok(bookingService.getBooking(reference, email));
    }

    @PostMapping("/{reference}/cancel")
    public ResponseEntity<BookingResponse> cancelBooking(
            @PathVariable String reference,
            @Valid @RequestBody CancelBookingRequest request
    ) {
        return ResponseEntity.ok(bookingService.cancelBooking(reference, request.email()));
    }
}
