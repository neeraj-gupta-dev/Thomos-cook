package com.hotelbooking.controller;

import com.hotelbooking.dto.AlternativeDateWindow;
import com.hotelbooking.dto.HotelDetailResponse;
import com.hotelbooking.dto.HotelSummaryResponse;
import com.hotelbooking.dto.SearchSuggestionsResponse;
import com.hotelbooking.service.HotelService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/hotels")
@RequiredArgsConstructor
public class HotelController {

    private final HotelService hotelService;

    @GetMapping
    public ResponseEntity<List<HotelSummaryResponse>> searchHotels(
            @RequestParam(required = false) String location,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut
    ) {
        return ResponseEntity.ok(hotelService.searchHotels(location, checkIn, checkOut));
    }

    @GetMapping("/{id}")
    public ResponseEntity<HotelDetailResponse> getHotelDetails(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut
    ) {
        return ResponseEntity.ok(hotelService.getHotelDetails(id, checkIn, checkOut));
    }

    @GetMapping("/{id}/alternatives")
    public ResponseEntity<List<AlternativeDateWindow>> getAlternativeDates(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut
    ) {
        return ResponseEntity.ok(hotelService.getAlternativeDates(id, checkIn, checkOut));
    }

    @GetMapping("/suggestions")
    public ResponseEntity<SearchSuggestionsResponse> getSearchSuggestions(
            @RequestParam(required = false) String location,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut
    ) {
        return ResponseEntity.ok(hotelService.getSearchSuggestions(location, checkIn, checkOut));
    }
}

