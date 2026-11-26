package com.hotelbooking.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record SearchSuggestionsResponse(
        List<CityDateSuggestion> sameCityAlternatives,
        List<HotelSummaryResponse> otherCityHotels
) {
    public record CityDateSuggestion(
            Long hotelId,
            String hotelName,
            String location,
            LocalDate checkIn,
            LocalDate checkOut,
            int nights,
            int availableRooms,
            BigDecimal totalPrice
    ) {
    }
}

