# System Design — StayEase Hotel Booking Portal

## 1. Architecture

The repository is a monorepo with two decoupled applications:

- **`/backend`** — Java 17 + Spring Boot 3 (Maven) REST API following a clean layered architecture:
  - `controller` (`HotelController`, `BookingController`): HTTP request/response handling and Bean Validation (`@Valid`).
  - `service` (`HotelService`, `BookingService`): business rules, date validation via injectable `java.time.Clock`, pricing, availability calculation, and `@Transactional` locking.
  - `repository` (`HotelRepository`, `InventoryRepository`, `BookingRepository`): Spring Data JPA interfaces with custom JPQL queries and pessimistic write locks.
  - `dto`: immutable Java records (`HotelSummaryResponse`, `HotelDetailResponse`, `AlternativeDateWindow`, `QuoteRequest`, `QuoteResponse`, `CreateBookingRequest`, `CancelBookingRequest`, `BookingResponse`).
  - `entity` (`Hotel`, `RoomInventory`, `Booking`, `BookingStatus`): JPA entities mapped to Flyway-managed tables.
  - `exception` (`GlobalExceptionHandler`, `ApiError`, `BadRequestException`, `ResourceNotFoundException`, `ConflictException`): `@RestControllerAdvice` returning consistent JSON error payloads without stack traces.
- **`/frontend`** — Angular 19 standalone SPA:
  - `ApiService` (`HttpClient`) communicating with `environment.apiBaseUrl` (`http://localhost:8080/api`).
  - Functional `httpErrorInterceptor` surfacing backend `ApiError` messages via `ToastService` / `ToastComponent`.
  - Four standalone routed pages: Home (`/`), Hotel Details (`/hotels/:id`), Booking Confirmation (`/booking/confirmation/:reference`), and Manage Booking (`/manage-booking`).

## 2. Database Design

Managed by Flyway (`V1__init_schema.sql`, `V2__seed_hotels.sql`) on MySQL 8 (`InnoDB`, `utf8mb4`):

- **`hotels`**
  - `id` (`BIGINT PK AUTO_INCREMENT`), `name`, `location`, `description`, `amenities`, `price_per_night` (`DECIMAL(10,2)`), `total_rooms` (`INT`).
  - Constraints & indexes: `price_per_night > 0`, `total_rooms > 0`, `INDEX idx_hotels_location (location)`.
- **`room_inventory`**
  - `id` (`BIGINT PK AUTO_INCREMENT`), `hotel_id` (`BIGINT FK -> hotels.id ON DELETE CASCADE`), `stay_date` (`DATE`), `booked_rooms` (`INT DEFAULT 0`).
  - Constraints: `UNIQUE uk_room_inventory_hotel_date (hotel_id, stay_date)`, `CHECK (booked_rooms >= 0)`.
  - One row per `(hotel_id, stay_date)` created lazily when a night is first booked.
- **`bookings`**
  - `id` (`BIGINT PK AUTO_INCREMENT`), `reference` (`VARCHAR(32) UNIQUE`), `hotel_id` (`BIGINT FK -> hotels.id`), `guest_name`, `guest_email`, `check_in` (`DATE`), `check_out` (`DATE`), `nights` (`INT`), `total_amount` (`DECIMAL(10,2)`), `status` (`ENUM('CONFIRMED','CANCELLED')`), `created_at` (`TIMESTAMP`), `cancelled_at` (`TIMESTAMP NULL`).
  - Constraints & indexes: `check_out > check_in`, `nights > 0`, `total_amount >= 0`, `INDEX idx_bookings_reference_email (reference, guest_email)`.

**Relationships:** `hotels 1 ──< * room_inventory` and `hotels 1 ──< * bookings`.

## 3. API Design

| Method | Path | Request / Params | Response | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/hotels` | `location`, `checkIn`, `checkOut` (optional) | `200 List<HotelSummaryResponse>` | Search hotels; includes `availableRooms`, `nights`, `totalPrice` when dates are given |
| `GET` | `/api/hotels/{id}` | `checkIn`, `checkOut` (optional) | `200 HotelDetailResponse` | Hotel details + per-night availability breakdown |
| `GET` | `/api/hotels/{id}/alternatives` | `checkIn`, `checkOut` (required) | `200 List<AlternativeDateWindow>` | Up to 3 nearest available date windows within ±14 days |
| `POST` | `/api/bookings/quote` | `{ hotelId, checkIn, checkOut }` | `200 QuoteResponse` | Computes `nights`, `totalAmount`, and `available` without booking |
| `POST` | `/api/bookings` | `{ hotelId, guestName, guestEmail, checkIn, checkOut }` | `201 BookingResponse` | Creates a `CONFIRMED` booking with `HB-XXXXXXXX` reference |
| `GET` | `/api/bookings/{reference}` | `email` (required) | `200 BookingResponse` | Looks up booking by reference + email (case-insensitive) |
| `POST` | `/api/bookings/{reference}/cancel` | `{ email }` | `200 BookingResponse` | Cancels booking and decrements `booked_rooms` |

**Error Shape (`ApiError`):** `{ timestamp, status, error, message, fieldErrors[] }` mapped to `400` (validation/bad dates), `404` (not found / email mismatch), `409` (sold out / already cancelled), and `500` (generic error).

## 4. Booking Logic

- **Date Validation:** Uses an injected `java.time.Clock` (`ClockConfig`) so `LocalDate.now(clock)` is deterministic in tests. Rejects past `checkIn`, `checkOut <= checkIn`, and stays exceeding 30 nights.
- **Exclusive Check-out:** A stay occupies the half-open interval `[checkIn, checkOut)`. For example, `10th–12th` occupies nights `10` and `11`, allowing a back-to-back booking starting on the `12th`.
- **Pricing:** Calculated exclusively on the backend as `hotel.pricePerNight.multiply(BigDecimal.valueOf(nights))`.
- **Per-night Inventory:** For each night in `[checkIn, checkOut)`, `available = hotel.totalRooms - bookedRooms`. Missing `room_inventory` rows imply `bookedRooms = 0`. Booking fails with `409 Conflict` if any night has `available <= 0`.
- **Lookup & Cancellation:** Both `getBooking` and `cancelBooking` require a case-insensitive `(reference, guestEmail)` match and return a generic `404 Booking not found` on mismatch to avoid leaking whether a reference exists. Cancelling an already `CANCELLED` booking returns `409 Conflict`.

## 5. Design Decisions and Trade-offs

- **Per-night `room_inventory` vs. Date-range overlap query on `bookings`:**
  - *Choice:* Materialize one `room_inventory` row per `(hotel_id, stay_date)` lazily.
  - *Trade-off:* Slightly more writes on booking/cancellation, but availability checks become simple range scans and row-level locks (`SELECT ... FOR UPDATE`) operate on concrete night rows rather than gap/predicate locks over `bookings`.
- **Pessimistic locking vs. Optimistic locking (`@Version`):**
  - *Choice:* `PESSIMISTIC_WRITE` (`SELECT ... FOR UPDATE`).
  - *Trade-off:* Serializes concurrent requests for the same hotel/dates (reducing throughput under extreme contention), but eliminates retry loops and guarantees deterministic first-writer-wins behavior for last-room contention.

## 6. Simultaneous Bookings

1. `BookingService.createBooking` is `@Transactional` and first locks the `Hotel` row via `HotelRepository.findByIdForUpdate(hotelId)` (`PESSIMISTIC_WRITE`) so two concurrent transactions cannot race while lazily inserting missing `room_inventory` rows.
2. Any missing `room_inventory` rows for `[checkIn, checkOut)` are inserted and flushed (`saveAllAndFlush`), and `InventoryRepository.findByHotelAndDateRangeForUpdate` re-queries the full range with `SELECT ... FOR UPDATE` ordered by `stay_date ASC`.
3. Consistent ascending `stay_date` lock ordering prevents deadlocks between overlapping requests.
4. `room_inventory` also enforces `UNIQUE(hotel_id, stay_date)` and `CHECK (booked_rooms >= 0)` at the database level as a final safety net.

## 7. Surprise Feature — Flexible Date Suggestions

When a hotel is sold out for the requested dates, `GET /api/hotels/{id}/alternatives?checkIn=&checkOut=` suggests up to 3 nearest available windows of the same length within `±14` days:

- Fetches per-night availability once for `[max(today, checkIn - 14), checkOut + 14)`.
- Expands outward by `delta = 1..14` (`checkIn - delta`, then `checkIn + delta`), skipping past check-in dates and any window with a sold-out night.
- In Angular, sold-out hotel cards and the hotel detail quote panel render these suggestions as clickable chips that update the form dates and re-run the search/quote.

## 8. Limitations and Improvements

- **Single-room-per-booking assumption:** Currently each booking reserves 1 room; adding a `rooms` / `guests` count would require checking `available >= requestedRooms`.
- **Hotel-level lock during lazy initialization:** Locking the `Hotel` row in `createBooking` serializes bookings across non-overlapping dates of the same hotel; pre-seeding rolling inventory (e.g., 365 days) or using `INSERT IGNORE` would allow locking only the specific `room_inventory` night rows.
- **No rate limiting or CAPTCHA:** Public booking/lookup endpoints would benefit from rate limiting in production.
- **Test coverage:** Add `@WebMvcTest` controller tests for `GlobalExceptionHandler` JSON payloads and end-to-end tests against a real MySQL 8 container (Testcontainers).

