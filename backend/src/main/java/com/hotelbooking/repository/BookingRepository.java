package com.hotelbooking.repository;

import com.hotelbooking.entity.Booking;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    @EntityGraph(attributePaths = "hotel")
    Optional<Booking> findByReferenceIgnoreCase(String reference);

    @EntityGraph(attributePaths = "hotel")
    Optional<Booking> findByReferenceIgnoreCaseAndGuestEmailIgnoreCase(String reference, String guestEmail);

    @EntityGraph(attributePaths = "hotel")
    List<Booking> findByGuestEmailIgnoreCaseOrderByCreatedAtDesc(String guestEmail);
}
