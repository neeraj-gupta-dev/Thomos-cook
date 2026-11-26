package com.hotelbooking.service;

import com.hotelbooking.dto.BookingResponse;
import com.hotelbooking.dto.CreateBookingRequest;
import com.hotelbooking.dto.QuoteResponse;
import com.hotelbooking.entity.Booking;
import com.hotelbooking.entity.BookingStatus;
import com.hotelbooking.entity.Hotel;
import com.hotelbooking.entity.RoomInventory;
import com.hotelbooking.exception.BadRequestException;
import com.hotelbooking.exception.ConflictException;
import com.hotelbooking.exception.ResourceNotFoundException;
import com.hotelbooking.repository.BookingRepository;
import com.hotelbooking.repository.HotelRepository;
import com.hotelbooking.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service handling room quotes, booking creation, lookup, and cancellation.
 *
 * <p><strong>Concurrency Control:</strong>
 * Inventory is tracked per hotel per night in {@code room_inventory} over the half-open date
 * range {@code [checkIn, checkOut)}. To prevent double-booking and lost updates under concurrent
 * requests:
 * <ol>
 *   <li>{@link #createBooking(CreateBookingRequest)} executes inside a database transaction and
 *       acquires {@code PESSIMISTIC_WRITE} ({@code SELECT ... FOR UPDATE}) locks on all existing
 *       {@code room_inventory} rows for the hotel and stay range, ordered consistently by
 *       {@code stay_date ASC} to avoid lock-ordering deadlocks.</li>
 *   <li>Because {@code room_inventory} rows are created lazily when a night is first needed,
 *       any missing dates in {@code [checkIn, checkOut)} are inserted and flushed first, and the
 *       date range is re-queried with {@code SELECT ... FOR UPDATE} so every night in the stay
 *       is locked before availability is verified and {@code booked_rooms} is incremented.</li>
 *   <li>{@link #cancelBooking(String, String)} acquires the same ordered {@code PESSIMISTIC_WRITE}
 *       locks before decrementing {@code booked_rooms} and transitioning the booking status to
 *       {@link BookingStatus#CANCELLED}.</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
public class BookingService {

    private static final int MAX_NIGHTS = 30;
    private static final String REF_PREFIX = "HB-";
    private static final String REF_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int REF_LENGTH = 8;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final BookingRepository bookingRepository;
    private final HotelRepository hotelRepository;
    private final InventoryRepository inventoryRepository;
    private final Clock clock;

    /**
     * Calculates a stay quote (nights, backend-computed total amount, and current availability)
     * without persisting any booking or inventory rows.
     */
    @Transactional(readOnly = true)
    public QuoteResponse getQuote(Long hotelId, LocalDate checkIn, LocalDate checkOut) {
        int nights = validateAndCountNights(checkIn, checkOut);
        Hotel hotel = findHotelOrThrow(hotelId);

        List<InventoryRepository.NightlyAvailability> existingNights =
                inventoryRepository.findAvailableRoomsPerNight(hotelId, checkIn, checkOut);

        boolean available = existingNights.stream()
                .allMatch(night -> night.getAvailableRooms() != null && night.getAvailableRooms() > 0);

        BigDecimal totalAmount = calculateTotal(hotel.getPricePerNight(), nights);

        return new QuoteResponse(
                hotel.getId(),
                hotel.getName(),
                checkIn,
                checkOut,
                nights,
                hotel.getPricePerNight(),
                totalAmount,
                available
        );
    }

    /**
     * Creates a confirmed booking using pessimistic write locks ({@code SELECT ... FOR UPDATE})
     * on per-night inventory rows across {@code [checkIn, checkOut)}.
     *
     * <p>Missing {@code room_inventory} rows for the requested nights are lazily created and
     * flushed before locking the full range and re-checking availability, guaranteeing that
     * {@code booked_rooms} never exceeds {@code hotel.totalRooms}.
     */
    @Transactional
    public BookingResponse createBooking(CreateBookingRequest request) {
        int nights = validateAndCountNights(request.checkIn(), request.checkOut());
        Hotel hotel = hotelRepository.findByIdForUpdate(request.hotelId())
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));

        List<LocalDate> stayDates = request.checkIn()
                .datesUntil(request.checkOut())
                .toList();

        // Lock existing inventory rows for [checkIn, checkOut) in stay_date order.
        List<RoomInventory> lockedRows = inventoryRepository.findByHotelAndDateRangeForUpdate(
                hotel.getId(), request.checkIn(), request.checkOut());

        // Lazily create any missing inventory rows for nights not yet in room_inventory.
        if (lockedRows.size() < stayDates.size()) {
            Map<LocalDate, RoomInventory> existingByDate = lockedRows.stream()
                    .collect(Collectors.toMap(RoomInventory::getStayDate, Function.identity()));

            List<RoomInventory> missingRows = new ArrayList<>();
            for (LocalDate date : stayDates) {
                if (!existingByDate.containsKey(date)) {
                    missingRows.add(RoomInventory.builder()
                            .hotel(hotel)
                            .stayDate(date)
                            .bookedRooms(0)
                            .build());
                }
            }
            inventoryRepository.saveAllAndFlush(missingRows);

            // Re-acquire PESSIMISTIC_WRITE locks over the complete [checkIn, checkOut) range.
            lockedRows = inventoryRepository.findByHotelAndDateRangeForUpdate(
                    hotel.getId(), request.checkIn(), request.checkOut());
        }

        // Re-check availability under lock for every night.
        for (RoomInventory row : lockedRows) {
            int available = hotel.getTotalRooms() - row.getBookedRooms();
            if (available <= 0) {
                throw new ConflictException("No rooms available for " + row.getStayDate());
            }
        }

        // Increment booked_rooms for each night.
        for (RoomInventory row : lockedRows) {
            row.setBookedRooms(row.getBookedRooms() + 1);
        }
        inventoryRepository.saveAll(lockedRows);

        BigDecimal totalAmount = calculateTotal(hotel.getPricePerNight(), nights);

        Booking booking = Booking.builder()
                .reference(generateUniqueReference())
                .hotel(hotel)
                .guestName(request.guestName().trim())
                .guestEmail(request.guestEmail().trim())
                .checkIn(request.checkIn())
                .checkOut(request.checkOut())
                .nights(nights)
                .totalAmount(totalAmount)
                .status(BookingStatus.CONFIRMED)
                .build();

        Booking saved = bookingRepository.save(booking);
        return toResponse(saved);
    }

    /**
     * Looks up a booking by reference and guest email (case-insensitive).
     * Returns 404 without revealing whether the reference exists for another email.
     */
    @Transactional(readOnly = true)
    public BookingResponse getBooking(String reference, String email) {
        Booking booking = findBookingByReferenceAndEmailOrThrow(reference, email);
        return toResponse(booking);
    }

    /**
     * Cancels a confirmed booking after verifying reference and guest email match
     * (case-insensitive), releasing one booked room per night under {@code PESSIMISTIC_WRITE} lock.
     */
    @Transactional
    public BookingResponse cancelBooking(String reference, String email) {
        Booking booking = findBookingByReferenceAndEmailOrThrow(reference, email);

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new ConflictException("Booking is already cancelled");
        }

        List<RoomInventory> lockedRows = inventoryRepository.findByHotelAndDateRangeForUpdate(
                booking.getHotel().getId(), booking.getCheckIn(), booking.getCheckOut());

        for (RoomInventory row : lockedRows) {
            row.setBookedRooms(Math.max(0, row.getBookedRooms() - 1));
        }
        inventoryRepository.saveAll(lockedRows);

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(Instant.now(clock));

        Booking saved = bookingRepository.save(booking);
        return toResponse(saved);
    }

    private int validateAndCountNights(LocalDate checkIn, LocalDate checkOut) {
        if (checkIn == null || checkOut == null) {
            throw new BadRequestException("Check-in and check-out dates are required");
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

    private Hotel findHotelOrThrow(Long hotelId) {
        return hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
    }

    private Booking findBookingByReferenceAndEmailOrThrow(String reference, String email) {
        if (reference == null || reference.isBlank() || email == null || email.isBlank()) {
            throw new ResourceNotFoundException("Booking not found");
        }
        return bookingRepository.findByReferenceIgnoreCaseAndGuestEmailIgnoreCase(
                        reference.trim(), email.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
    }

    private BigDecimal calculateTotal(BigDecimal pricePerNight, int nights) {
        return pricePerNight.multiply(BigDecimal.valueOf(nights));
    }

    private String generateUniqueReference() {
        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder sb = new StringBuilder(REF_PREFIX);
            for (int i = 0; i < REF_LENGTH; i++) {
                sb.append(REF_CHARS.charAt(RANDOM.nextInt(REF_CHARS.length())));
            }
            String candidate = sb.toString();
            if (bookingRepository.findByReferenceIgnoreCase(candidate).isEmpty()) {
                return candidate;
            }
        }
        throw new IllegalStateException("Unable to generate unique booking reference");
    }

    private BookingResponse toResponse(Booking booking) {
        Hotel hotel = booking.getHotel();
        return new BookingResponse(
                booking.getReference(),
                hotel.getId(),
                hotel.getName(),
                hotel.getLocation(),
                booking.getGuestName(),
                booking.getGuestEmail(),
                booking.getCheckIn(),
                booking.getCheckOut(),
                booking.getNights(),
                hotel.getPricePerNight(),
                booking.getTotalAmount(),
                booking.getStatus(),
                booking.getCreatedAt(),
                booking.getCancelledAt()
        );
    }
}
