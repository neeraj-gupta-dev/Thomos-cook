# StayEase — Hotel Booking Portal

A full-stack Hotel Booking Portal built with **Java 17 + Spring Boot 3**, **MySQL 8 + Flyway**, and **Angular 19 (standalone components)**.

## Prerequisites

- **JDK 17** (e.g., Eclipse Temurin 17)
- **Apache Maven 3.9+**
- **Node.js 20+** and **npm 10+**
- **MySQL 8.0+**

## Database Setup

1. Start MySQL 8 and create the database:
   ```sql
   CREATE DATABASE hotel_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Configure database credentials via environment variables (no credentials are hardcoded in the repository; see `backend/src/main/resources/application-example.properties`):

   **PowerShell (Windows):**
   ```powershell
   $env:DB_URL="jdbc:mysql://localhost:3306/hotel_booking?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
   $env:DB_USERNAME="your_mysql_username"
   $env:DB_PASSWORD="your_mysql_password"
   ```

   **Bash (macOS/Linux):**
   ```bash
   export DB_URL="jdbc:mysql://localhost:3306/hotel_booking?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
   export DB_USERNAME="your_mysql_username"
   export DB_PASSWORD="your_mysql_password"
   ```

Flyway automatically runs `V1__init_schema.sql` and `V2__seed_hotels.sql` on startup, creating the schema and seeding 6 hotels across Mumbai, Goa, Delhi, and Jaipur.

## Running the Application

### Backend (`/backend`)
```bash
cd backend
mvn spring-boot:run
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

### Backend Tests (JUnit 5 + Mockito + H2)
```bash
cd backend
mvn test
```
Tests run against an in-memory H2 database in MySQL mode (`src/test/resources/application.properties`) and do not require a live MySQL server.

### Frontend Build
```bash
cd frontend
npx ng build
```

## Approximate Time Spent

- ~25–30 minutes end-to-end across backend scaffolding, Flyway migrations, booking/concurrency logic, JUnit 5 tests, Angular standalone UI, flexible date suggestions, and documentation.

## Unfinished Items / Known Gaps

- `mvn test` has not been executed in the local authoring shell because Maven (`mvn`) was not installed on `PATH` (the Angular production build `npx ng build` was run and passed).
- End-to-end browser tests (Playwright/Cypress) and MockMvc slice tests were not added.
- Authentication, payments, and an admin panel were intentionally omitted per assignment scope.

## AI Assistance Disclosure

Antigravity was used to generate scaffolding and boilerplate across the Spring Boot backend, Flyway migrations, unit tests, and Angular frontend. I reviewed and understand the code, architecture, concurrency controls, and trade-offs documented in [DESIGN.md](./DESIGN.md).
