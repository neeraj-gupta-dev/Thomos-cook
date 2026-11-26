# StayEase — Hotel Booking Portal

A full-stack Hotel Booking Portal built with **Java 17 + Spring Boot 3**, **MySQL 8 + Flyway**, and **Angular 19 (standalone components)**.

## Prerequisites

- **JDK 17** (e.g., Eclipse Temurin 17)
- **Apache Maven** (optional — the repo includes the Maven Wrapper `./mvnw` / `.\mvnw.cmd`)
- **Node.js 20+** and **npm 10+**
- **MySQL 8.0+** (or **Docker** for Option B)

## Database Setup

### Option A: Local MySQL 8

1. Start MySQL 8 and create the database:
   ```sql
   CREATE DATABASE hotel_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Configure database credentials via environment variables (no credentials are hardcoded in the repository; see `backend/src/main/resources/application-example.properties`):

   **PowerShell (Windows):**
   ```powershell
   $env:DB_URL="jdbc:mysql://localhost:3306/hotel_booking?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
   $env:DB_USERNAME="<your_mysql_username>"
   $env:DB_PASSWORD="<your_mysql_password>"
   ```

   **Bash (macOS/Linux):**
   ```bash
   export DB_URL="jdbc:mysql://localhost:3306/hotel_booking?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
   export DB_USERNAME="<your_mysql_username>"
   export DB_PASSWORD="<your_mysql_password>"
   ```

### Option B: Docker MySQL 8 on Port 3307

1. Start a MySQL 8 container mapped to host port `3307`:
   ```bash
   docker run --name hotel-booking-mysql \
     -e MYSQL_ROOT_PASSWORD=<your_root_password> \
     -e MYSQL_DATABASE=hotel_booking \
     -e MYSQL_USER=<your_mysql_username> \
     -e MYSQL_PASSWORD=<your_mysql_password> \
     -p 3307:3306 -d mysql:8.0
   ```

2. Point `DB_URL` to port `3307`:
   ```bash
   export DB_URL="jdbc:mysql://localhost:3307/hotel_booking?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
   export DB_USERNAME="<your_mysql_username>"
   export DB_PASSWORD="<your_mysql_password>"
   ```

Flyway automatically runs `V1__init_schema.sql`, `V2__seed_hotels.sql`, and `V3__add_hotel_images.sql` on startup, creating the schema, seeding 6 hotels across Mumbai, Goa, Delhi, and Jaipur, and populating `image_url`.

## Running the Application

### Backend (`/backend`)
```bash
cd backend
./mvnw spring-boot:run        # macOS/Linux
.\mvnw.cmd spring-boot:run    # Windows
```
The API starts on `http://localhost:8080` with CORS enabled for `http://localhost:4200`.

### Frontend (`/frontend`)
```bash
cd frontend
npm install
npm start
```
Open `http://localhost:4200` in your browser.

## Running Tests & Builds

### Backend Tests (14 tests pass — JUnit 5 + Mockito + H2)
```bash
cd backend
./mvnw test        # macOS/Linux
.\mvnw.cmd test    # Windows
```
Tests run against an in-memory H2 database in MySQL mode (`src/test/resources/application.properties`) and do not require a live MySQL server.

### Frontend Build
```bash
cd frontend
npx ng build
```

## Assumptions

- **Exclusive check-out date**: A stay occupies `[checkIn, checkOut)` (e.g., 10th–12th occupies the nights of the 10th and 11th).
- **Back-to-back stays allowed**: Because check-out is exclusive, a stay of 10th–12th does not block a stay starting on the 12th.
- **One room per booking**: Each reservation books 1 room.
- **30-night maximum**: Stays longer than 30 nights are rejected on both client and server.
- **No authentication**: No login, passwords, or admin panel are included.
- **Booking retrieval**: Bookings are retrieved and cancelled using the booking `reference` + `guestEmail` pair (case-insensitive).

## Screenshot Gallery

- [Home & Hotel Search](docs/screenshots/home.png)
- [Hotel Details & Quote](docs/screenshots/hotel-detail.png)
- [Booking Confirmation](docs/screenshots/confirmation.png)
- [Manage Booking & Cancel Modal](docs/screenshots/manage-booking.png)

## Photo Credits

Hotel preview photos are stored locally under `frontend/src/assets/hotels/hotel-1.jpg` through `hotel-6.jpg` for offline/local development use.

## Time Spent

`<I will fill in the real hours>`

## Unfinished Items / Known Gaps

- Screenshots in `docs/screenshots/*.png` have not been captured yet.
- Concurrency and schema tests run against H2 in MySQL mode; a Testcontainers suite against real MySQL 8 has not been added yet.
- End-to-end browser tests (Playwright/Cypress) and `@WebMvcTest` controller slice tests were not added.

## AI Assistance Disclosure

Antigravity was used to generate scaffolding and boilerplate across the Spring Boot backend, Flyway migrations, unit tests, and Angular frontend. I reviewed and understand the code, architecture, concurrency controls, and trade-offs documented in [DESIGN.md](./DESIGN.md).
