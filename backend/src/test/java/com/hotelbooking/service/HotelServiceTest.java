package com.hotelbooking.service;

import com.hotelbooking.dto.AlternativeDateWindow;
import com.hotelbooking.dto.SearchSuggestionsResponse;
import com.hotelbooking.entity.Hotel;
import com.hotelbooking.repository.HotelRepository;
import com.hotelbooking.repository.InventoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HotelServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 26);

    @Mock
    private HotelRepository hotelRepository;

    @Mock
    private InventoryRepository inventoryRepository;

    private HotelService hotelService;
    private Hotel sampleHotel;

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(Instant.parse("2026-11-26T09:00:00Z"), ZoneOffset.UTC);
        hotelService = new HotelService(hotelRepository, inventoryRepository, fixedClock);

        sampleHotel = Hotel.builder()
                .id(1L)
                .name("Test Resort")
                .location("Goa")
                .description("Beachside stay")
                .amenities("Wi-Fi")
                .pricePerNight(new BigDecimal("3000.00"))
                .totalRooms(2)
                .build();
    }

    @Test
    void returnsUpToThreeNearestAvailableWindowsInDistanceOrder() {
        LocalDate checkIn = TODAY.plusDays(5);
        LocalDate checkOut = TODAY.plusDays(7); // 2 nights

        when(hotelRepository.findById(1L)).thenReturn(Optional.of(sampleHotel));
        when(inventoryRepository.findAvailableRoomsPerNight(eq(1L), any(), any()))
                .thenReturn(List.of(
                        availability(checkIn, 0),
                        availability(checkIn.plusDays(1), 0)
                ));

        List<AlternativeDateWindow> alternatives = hotelService.getAlternativeDates(1L, checkIn, checkOut);

        assertThat(alternatives).hasSize(3);
        // -1 day (days 4-6) overlaps sold-out night 5, so skipped; +1 day (days 6-8) overlaps night 6, so skipped.
        // -2 days (days 3-5) has nights 3 & 4 free -> 1st suggestion.
        // +2 days (days 7-9) has nights 7 & 8 free -> 2nd suggestion.
        // -3 days (days 2-4) has nights 2 & 3 free -> 3rd suggestion.
        assertThat(alternatives.get(0).checkIn()).isEqualTo(checkIn.minusDays(2));
        assertThat(alternatives.get(0).checkOut()).isEqualTo(checkOut.minusDays(2));
        assertThat(alternatives.get(0).totalPrice()).isEqualByComparingTo(new BigDecimal("6000.00"));
        assertThat(alternatives.get(1).checkIn()).isEqualTo(checkIn.plusDays(2));
        assertThat(alternatives.get(2).checkIn()).isEqualTo(checkIn.minusDays(3));
    }

    @Test
    void neverSuggestsPastCheckInDates() {
        LocalDate checkIn = TODAY;
        LocalDate checkOut = TODAY.plusDays(2);

        when(hotelRepository.findById(1L)).thenReturn(Optional.of(sampleHotel));
        when(inventoryRepository.findAvailableRoomsPerNight(eq(1L), any(), any()))
                .thenReturn(List.of(
                        availability(TODAY, 0),
                        availability(TODAY.plusDays(1), 0)
                ));

        List<AlternativeDateWindow> alternatives = hotelService.getAlternativeDates(1L, checkIn, checkOut);

        assertThat(alternatives).hasSize(3);
        assertThat(alternatives).allSatisfy(w -> assertThat(w.checkIn()).isAfterOrEqualTo(TODAY));
        assertThat(alternatives.get(0).checkIn()).isEqualTo(TODAY.plusDays(2));
    }

    @Test
    void returnsEmptyListWhenAllDatesWithinFourteenDaysAreSoldOut() {
        LocalDate checkIn = TODAY.plusDays(10);
        LocalDate checkOut = TODAY.plusDays(12);

        when(hotelRepository.findById(1L)).thenReturn(Optional.of(sampleHotel));

        List<InventoryRepository.NightlyAvailability> allSoldOut = checkIn.minusDays(14)
                .datesUntil(checkOut.plusDays(14))
                .map(date -> availability(date, 0))
                .toList();
        when(inventoryRepository.findAvailableRoomsPerNight(eq(1L), any(), any()))
                .thenReturn(allSoldOut);

        List<AlternativeDateWindow> alternatives = hotelService.getAlternativeDates(1L, checkIn, checkOut);

        assertThat(alternatives).isEmpty();
    }

    @Test
    void searchSuggestionsReturnOtherCitiesWhenChosenCityHasNoMatches() {
        LocalDate checkIn = TODAY.plusDays(4);
        LocalDate checkOut = TODAY.plusDays(6);

        Hotel mumbaiHotel = Hotel.builder()
                .id(2L)
                .name("Mumbai Stay")
                .location("Mumbai")
                .description("Sea view")
                .amenities("Wi-Fi")
                .pricePerNight(new BigDecimal("5000.00"))
                .totalRooms(4)
                .build();

        when(hotelRepository.searchByLocation("Shimla")).thenReturn(List.of());
        when(hotelRepository.findAll()).thenReturn(List.of(sampleHotel, mumbaiHotel));
        when(inventoryRepository.findAvailableRoomsPerNight(any(), eq(checkIn), eq(checkOut)))
                .thenReturn(List.of());

        SearchSuggestionsResponse suggestions = hotelService.getSearchSuggestions("Shimla", checkIn, checkOut);

        assertThat(suggestions.sameCityAlternatives()).isEmpty();
        assertThat(suggestions.otherCityHotels()).hasSize(2);
        assertThat(suggestions.otherCityHotels().get(0).location()).isEqualTo("Goa");
        assertThat(suggestions.otherCityHotels().get(1).location()).isEqualTo("Mumbai");
    }

    private InventoryRepository.NightlyAvailability availability(LocalDate date, int availableRooms) {
        return new InventoryRepository.NightlyAvailability() {
            @Override
            public LocalDate getStayDate() {
                return date;
            }

            @Override
            public Integer getBookedRooms() {
                return sampleHotel.getTotalRooms() - availableRooms;
            }

            @Override
            public Integer getAvailableRooms() {
                return availableRooms;
            }
        };
    }
}

