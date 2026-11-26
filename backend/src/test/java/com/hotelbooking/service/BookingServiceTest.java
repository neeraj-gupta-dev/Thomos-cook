package com.hotelbooking.service;

import com.hotelbooking.dto.BookingResponse;
import com.hotelbooking.dto.CreateBookingRequest;
import com.hotelbooking.dto.QuoteResponse;
import com.hotelbooking.entity.BookingStatus;
import com.hotelbooking.entity.Hotel;
import com.hotelbooking.exception.BadRequestException;
import com.hotelbooking.exception.ConflictException;
import com.hotelbooking.exception.ResourceNotFoundException;
import com.hotelbooking.repository.BookingRepository;
import com.hotelbooking.repository.HotelRepository;
import com.hotelbooking.repository.InventoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class BookingServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 26);

    @TestConfiguration
    static class FixedClockConfig {
        @Bean
        @Primary
        Clock testClock() {
            return Clock.fixed(Instant.parse("2026-11-26T09:00:00Z"), ZoneOffset.UTC);
        }
    }

    @Autowired
    private BookingService bookingService;

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private BookingRepository bookingRepository;

    private Hotel singleRoomHotel;
    private Hotel multiRoomHotel;

    @BeforeEach
    void setUp() {
        bookingRepository.deleteAll();
        inventoryRepository.deleteAll();
        hotelRepository.deleteAll();

        singleRoomHotel = hotelRepository.save(Hotel.builder()
                .name("Boutique One")
                .location("Goa")
                .description("Cozy single-room villa")
                .amenities("Free Wi-Fi, Breakfast")
                .pricePerNight(new BigDecimal("2500.00"))
                .totalRooms(1)
                .build());

        multiRoomHotel = hotelRepository.save(Hotel.builder()
                .name("Grand Horizon")
                .location("Mumbai")
                .description("Seafront business hotel")
                .amenities("Free Wi-Fi, Pool, Gym")
                .pricePerNight(new BigDecimal("2500.00"))
                .totalRooms(2)
                .build());
    }

    @Test
    void calculatesTotalAmountCorrectly() {
        LocalDate checkIn = TODAY.plusDays(1);
        LocalDate checkOut = TODAY.plusDays(4); // 3 nights

        QuoteResponse quote = bookingService.getQuote(multiRoomHotel.getId(), checkIn, checkOut);

        assertThat(quote.nights()).isEqualTo(3);
        assertThat(quote.totalAmount()).isEqualByComparingTo(new BigDecimal("7500.00"));
        assertThat(quote.available()).isTrue();

        BookingResponse booking = bookingService.createBooking(new CreateBookingRequest(
                multiRoomHotel.getId(), "Asha Rao", "asha@example.com", checkIn, checkOut));

        assertThat(booking.nights()).isEqualTo(3);
        assertThat(booking.totalAmount()).isEqualByComparingTo(new BigDecimal("7500.00"));
    }

    @Test
    void rejectsCheckOutBeforeOrEqualToCheckIn() {
        LocalDate checkIn = TODAY.plusDays(5);

        assertThatThrownBy(() -> bookingService.createBooking(new CreateBookingRequest(
                singleRoomHotel.getId(), "Asha Rao", "asha@example.com", checkIn, checkIn)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("after check-in");

        assertThatThrownBy(() -> bookingService.createBooking(new CreateBookingRequest(
                singleRoomHotel.getId(), "Asha Rao", "asha@example.com", checkIn, checkIn.minusDays(1))))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("after check-in");
    }

    @Test
    void rejectsPastCheckIn() {
        LocalDate yesterday = TODAY.minusDays(1);
        LocalDate tomorrow = TODAY.plusDays(1);

        assertThatThrownBy(() -> bookingService.createBooking(new CreateBookingRequest(
                singleRoomHotel.getId(), "Asha Rao", "asha@example.com", yesterday, tomorrow)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("past");
    }

    @Test
    void succeedsWhenRoomsAreAvailable() {
        LocalDate checkIn = TODAY.plusDays(2);
        LocalDate checkOut = TODAY.plusDays(4);

        BookingResponse response = bookingService.createBooking(new CreateBookingRequest(
                singleRoomHotel.getId(), "Rohan Mehta", "rohan@example.com", checkIn, checkOut));

        assertThat(response.reference()).startsWith("HB-").hasSize(11);
        assertThat(response.status()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(response.hotelId()).isEqualTo(singleRoomHotel.getId());
        assertThat(response.totalAmount()).isEqualByComparingTo(new BigDecimal("5000.00"));
    }

    @Test
    void failsWhenSoldOutOnAnyOneNight() {
        LocalDate night2CheckIn = TODAY.plusDays(11);
        LocalDate night2CheckOut = TODAY.plusDays(12);

        // Occupy the single room on night 11 only.
        bookingService.createBooking(new CreateBookingRequest(
                singleRoomHotel.getId(), "First Guest", "first@example.com", night2CheckIn, night2CheckOut));

        // Attempt a stay from 10th to 13th (nights 10, 11, 12) -> fails because night 11 is sold out.
        assertThatThrownBy(() -> bookingService.createBooking(new CreateBookingRequest(
                singleRoomHotel.getId(), "Second Guest", "second@example.com",
                TODAY.plusDays(10), TODAY.plusDays(13))))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("No rooms available");
    }

    @Test
    void rejectsOverlappingStayButAllowsBackToBackStay() {
        LocalDate dec10 = TODAY.plusDays(10);
        LocalDate dec11 = TODAY.plusDays(11);
        LocalDate dec12 = TODAY.plusDays(12);
        LocalDate dec13 = TODAY.plusDays(13);
        LocalDate dec14 = TODAY.plusDays(14);

        // Book 10-12 (occupies nights 10 and 11).
        bookingService.createBooking(new CreateBookingRequest(
                singleRoomHotel.getId(), "Guest One", "g1@example.com", dec10, dec12));

        // Overlapping stay 11-13 fails on night 11.
        assertThatThrownBy(() -> bookingService.createBooking(new CreateBookingRequest(
                singleRoomHotel.getId(), "Guest Two", "g2@example.com", dec11, dec13)))
                .isInstanceOf(ConflictException.class);

        // Back-to-back stay 12-14 succeeds because check-out on 12 is exclusive.
        BookingResponse backToBack = bookingService.createBooking(new CreateBookingRequest(
                singleRoomHotel.getId(), "Guest Three", "g3@example.com", dec12, dec14));

        assertThat(backToBack.status()).isEqualTo(BookingStatus.CONFIRMED);
    }

    @Test
    void cancellationReleasesAvailabilityForRebooking() {
        LocalDate checkIn = TODAY.plusDays(3);
        LocalDate checkOut = TODAY.plusDays(5);

        BookingResponse created = bookingService.createBooking(new CreateBookingRequest(
                singleRoomHotel.getId(), "Priya Nair", "Priya@Example.com", checkIn, checkOut));

        BookingResponse cancelled = bookingService.cancelBooking(created.reference(), "priya@example.com");
        assertThat(cancelled.status()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(cancelled.cancelledAt()).isNotNull();

        // Room can now be booked again for the exact same dates.
        BookingResponse rebooked = bookingService.createBooking(new CreateBookingRequest(
                singleRoomHotel.getId(), "Vikram Sen", "vikram@example.com", checkIn, checkOut));
        assertThat(rebooked.status()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(rebooked.reference()).isNotEqualTo(created.reference());
    }

    @Test
    void cancelWithWrongEmailFails() {
        LocalDate checkIn = TODAY.plusDays(3);
        LocalDate checkOut = TODAY.plusDays(5);

        BookingResponse created = bookingService.createBooking(new CreateBookingRequest(
                singleRoomHotel.getId(), "Priya Nair", "priya@example.com", checkIn, checkOut));

        assertThatThrownBy(() -> bookingService.cancelBooking(created.reference(), "wrong@example.com"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Booking not found");
    }

    @Test
    void concurrentBookingsForLastRoomAllowOnlyOneWinner() throws Exception {
        LocalDate checkIn = TODAY.plusDays(6);
        LocalDate checkOut = TODAY.plusDays(8);

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        Callable<Boolean> task1 = () -> attemptBooking(ready, start, "Guest A", "a@example.com", checkIn, checkOut);
        Callable<Boolean> task2 = () -> attemptBooking(ready, start, "Guest B", "b@example.com", checkIn, checkOut);

        try {
            Future<Boolean> f1 = executor.submit(task1);
            Future<Boolean> f2 = executor.submit(task2);

            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            List<Boolean> results = new ArrayList<>();
            results.add(f1.get(10, TimeUnit.SECONDS));
            results.add(f2.get(10, TimeUnit.SECONDS));

            long successes = results.stream().filter(Boolean::booleanValue).count();
            long failures = results.stream().filter(r -> !r).count();

            assertThat(successes).isEqualTo(1);
            assertThat(failures).isEqualTo(1);
            assertThat(bookingRepository.count()).isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
    }

    private boolean attemptBooking(
            CountDownLatch ready,
            CountDownLatch start,
            String guestName,
            String guestEmail,
            LocalDate checkIn,
            LocalDate checkOut
    ) throws InterruptedException {
        ready.countDown();
        start.await(5, TimeUnit.SECONDS);
        try {
            bookingService.createBooking(new CreateBookingRequest(
                    singleRoomHotel.getId(), guestName, guestEmail, checkIn, checkOut));
            return true;
        } catch (ConflictException ex) {
            return false;
        }
    }
}

