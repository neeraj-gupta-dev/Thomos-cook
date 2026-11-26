package com.hotelbooking.repository;

import com.hotelbooking.entity.Hotel;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface HotelRepository extends JpaRepository<Hotel, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT h FROM Hotel h WHERE h.id = :id")
    Optional<Hotel> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            SELECT h FROM Hotel h
            WHERE (:location IS NULL OR :location = '' OR LOWER(h.location) LIKE LOWER(CONCAT('%', :location, '%')))
            ORDER BY h.id ASC
            """)
    List<Hotel> searchByLocation(@Param("location") String location);
}
