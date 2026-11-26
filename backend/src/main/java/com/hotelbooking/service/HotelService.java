package com.hotelbooking.service;

import com.hotelbooking.dto.AlternativeDateWindow;
import com.hotelbooking.dto.HotelDetailResponse;
import com.hotelbooking.dto.HotelSummaryResponse;
import com.hotelbooking.entity.Hotel;
import com.hotelbooking.exception.BadRequestException;
import com.hotelbooking.exception.ResourceNotFoundException;
import com.hotelbooking.repository.HotelRepository;
import com.hotelbooking.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HotelService {

    private static final int MAX_NIGHTS = 30;
    private static final int FLEXIBLE_SEARCH_DAYS = 14;
    private static final int MAX_ALTERNATIVES = 3;

    private final HotelRepository hotelRepository;
    private final InventoryRepository inventoryRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<HotelSummaryResponse> searchHotels(String location, LocalDate checkIn, LocalDate checkOut) {
        Integer nights = validateOptionalDates(checkIn, checkOut);
        String normalizedLocation = location == null ? null : location.trim();

        return hotelRepository.searchByLocation(normalizedLocation).stream()
                .map(hotel -> toSummary(hotel, checkIn, checkOut, nights))
                .toList();
    }

    @Transactional(readOnly = true)
    public HotelDetailResponse getHotelDetails(Long hotelId, LocalDate checkIn, LocalDate checkOut) {
        Integer nights = validateOptionalDates(checkIn, checkOut);
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));

        List<HotelDetailResponse.NightlyAvailability> nightlyAvailability = List.of();
        Integer availableRooms = null;
        BigDecimal totalPrice = null;

        if (nights != null) {
            nightlyAvailability = computeNightlyAvailability(hotel, checkIn, checkOut);
            availableRooms = nightlyAvailability.stream()
                    .mapToInt(HotelDetailResponse.NightlyAvailability::availableRooms)
                    .min()
                    .orElse(hotel.getTotalRooms());
            totalPrice = hotel.getPricePerNight().multiply(BigDecimal.valueOf(nights));
        }

        return new HotelDetailResponse(
                hotel.getId(),
                hotel.getName(),
                hotel.getLocation(),
                hotel.getDescription(),
                parseAmenities(hotel.getAmenities()),
                hotel.getPricePerNight(),
                hotel.getTotalRooms(),
                availableRooms,
                nights,
                totalPrice,
                nightlyAvailability
        );
    }

    /**
     * Suggests up to 3 nearest available date windows of the same stay length within
     * {@value #FLEXIBLE_SEARCH_DAYS} days before and after the requested {@code [checkIn, checkOut)}
     * range.
     *
     * <p>The algorithm fetches per-night inventory once for the full candidate span, then expands
     * outward by absolute day offset ({@code -1, +1, -2, +2, ...}), skipping past check-in dates
     * and any window where at least one night has zero available rooms.
     */
    @Transactional(readOnly = true)
    public List<AlternativeDateWindow> getAlternativeDates(Long hotelId, LocalDate checkIn, LocalDate checkOut) {
        if (checkIn == null || checkOut == null) {
            throw new BadRequestException("Both checkIn and checkOut are required");
        }
        int nights = validateOptionalDates(checkIn, checkOut);
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));

        LocalDate today = LocalDate.now(clock);
        LocalDate earliestCheckIn = checkIn.minusDays(FLEXIBLE_SEARCH_DAYS);
        if (earliestCheckIn.isBefore(today)) {
            earliestCheckIn = today;
        }
        LocalDate latestCheckOut = checkOut.plusDays(FLEXIBLE_SEARCH_DAYS);

        Map<LocalDate, Integer> availableByDate = inventoryRepository
                .findAvailableRoomsPerNight(hotel.getId(), earliestCheckIn, latestCheckOut)
                .stream()
                .collect(Collectors.toMap(
                        InventoryRepository.NightlyAvailability::getStayDate,
                        n -> Math.max(0, n.getAvailableRooms())
                ));

        BigDecimal totalPrice = hotel.getPricePerNight().multiply(BigDecimal.valueOf(nights));
        List<AlternativeDateWindow> suggestions = new ArrayList<>();

        for (int delta = 1; delta <= FLEXIBLE_SEARCH_DAYS && suggestions.size() < MAX_ALTERNATIVES; delta++) {
            LocalDate earlierStart = checkIn.minusDays(delta);
            if (!earlierStart.isBefore(today)) {
                addIfAvailable(suggestions, earlierStart, nights, hotel.getTotalRooms(), availableByDate, totalPrice);
            }

            if (suggestions.size() < MAX_ALTERNATIVES) {
                LocalDate laterStart = checkIn.plusDays(delta);
                addIfAvailable(suggestions, laterStart, nights, hotel.getTotalRooms(), availableByDate, totalPrice);
            }
        }

        return suggestions;
    }

    private void addIfAvailable(
            List<AlternativeDateWindow> suggestions,
            LocalDate candidateStart,
            int nights,
            int totalRooms,
            Map<LocalDate, Integer> availableByDate,
            BigDecimal totalPrice
    ) {
        LocalDate candidateEnd = candidateStart.plusDays(nights);
        int minAvailable = candidateStart.datesUntil(candidateEnd)
                .mapToInt(date -> availableByDate.getOrDefault(date, totalRooms))
                .min()
                .orElse(0);

        if (minAvailable > 0) {
            suggestions.add(new AlternativeDateWindow(
                    candidateStart,
                    candidateEnd,
                    nights,
                    minAvailable,
                    totalPrice
            ));
        }
    }

    private HotelSummaryResponse toSummary(Hotel hotel, LocalDate checkIn, LocalDate checkOut, Integer nights) {
        Integer availableRooms = null;
        BigDecimal totalPrice = null;

        if (nights != null) {
            availableRooms = computeNightlyAvailability(hotel, checkIn, checkOut).stream()
                    .mapToInt(HotelDetailResponse.NightlyAvailability::availableRooms)
                    .min()
                    .orElse(hotel.getTotalRooms());
            totalPrice = hotel.getPricePerNight().multiply(BigDecimal.valueOf(nights));
        }

        return new HotelSummaryResponse(
                hotel.getId(),
                hotel.getName(),
                hotel.getLocation(),
                hotel.getDescription(),
                parseAmenities(hotel.getAmenities()),
                hotel.getPricePerNight(),
                hotel.getTotalRooms(),
                availableRooms,
                nights,
                totalPrice
        );
    }

    private List<HotelDetailResponse.NightlyAvailability> computeNightlyAvailability(
            Hotel hotel,
            LocalDate checkIn,
            LocalDate checkOut
    ) {
        Map<LocalDate, Integer> availableByDate = inventoryRepository
                .findAvailableRoomsPerNight(hotel.getId(), checkIn, checkOut)
                .stream()
                .collect(Collectors.toMap(
                        InventoryRepository.NightlyAvailability::getStayDate,
                        n -> Math.max(0, n.getAvailableRooms())
                ));

        return checkIn.datesUntil(checkOut)
                .map(date -> new HotelDetailResponse.NightlyAvailability(
                        date,
                        availableByDate.getOrDefault(date, hotel.getTotalRooms())
                ))
                .toList();
    }

    private Integer validateOptionalDates(LocalDate checkIn, LocalDate checkOut) {
        if (checkIn == null && checkOut == null) {
            return null;
        }
        if (checkIn == null || checkOut == null) {
            throw new BadRequestException("Both checkIn and checkOut must be provided together");
        }
        LocalDate today = LocalDate.now(clock);
        if (checkIn.isBefore(today)) {
            throw new BadRequestException("Check-in date cannot be in the past");
        }
        if (!checkOut.isAfter(checkIn)) {
            throw new BadRequestException("Check-out date must be after check-in date");
        }
        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        if (nights > MAX_NIGHTS) {
            throw new BadRequestException("Stay cannot exceed " + MAX_NIGHTS + " nights");
        }
        return (int) nights;
    }

    private List<String> parseAmenities(String amenities) {
        if (amenities == null || amenities.isBlank()) {
            return List.of();
        }
        return Arrays.stream(amenities.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }
}

