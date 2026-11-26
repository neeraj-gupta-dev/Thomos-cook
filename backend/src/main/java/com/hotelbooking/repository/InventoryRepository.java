package com.hotelbooking.repository;

import com.hotelbooking.entity.RoomInventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface InventoryRepository extends JpaRepository<RoomInventory, Long> {

    interface NightlyAvailability {
        LocalDate getStayDate();
        Integer getBookedRooms();
        Integer getAvailableRooms();
    }

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT ri FROM RoomInventory ri
            WHERE ri.hotel.id = :hotelId
              AND ri.stayDate >= :checkIn
              AND ri.stayDate < :checkOut
            ORDER BY ri.stayDate ASC
            """)
    List<RoomInventory> findByHotelAndDateRangeForUpdate(
            @Param("hotelId") Long hotelId,
            @Param("checkIn") LocalDate checkIn,
            @Param("checkOut") LocalDate checkOut
    );

    @Query("""
            SELECT ri.stayDate AS stayDate,
                   ri.bookedRooms AS bookedRooms,
                   (h.totalRooms - ri.bookedRooms) AS availableRooms
            FROM RoomInventory ri
            JOIN ri.hotel h
            WHERE h.id = :hotelId
              AND ri.stayDate >= :startDate
              AND ri.stayDate < :endDate
            ORDER BY ri.stayDate ASC
            """)
    List<NightlyAvailability> findAvailableRoomsPerNight(
            @Param("hotelId") Long hotelId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
}
