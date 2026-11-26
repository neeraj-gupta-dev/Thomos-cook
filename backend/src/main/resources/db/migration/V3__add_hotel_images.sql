ALTER TABLE hotels
    ADD COLUMN image_url VARCHAR(255) NULL AFTER amenities;

UPDATE hotels SET image_url = '/assets/hotels/hotel-1.jpg' WHERE id = 1;
UPDATE hotels SET image_url = '/assets/hotels/hotel-2.jpg' WHERE id = 2;
UPDATE hotels SET image_url = '/assets/hotels/hotel-3.jpg' WHERE id = 3;
UPDATE hotels SET image_url = '/assets/hotels/hotel-4.jpg' WHERE id = 4;
UPDATE hotels SET image_url = '/assets/hotels/hotel-5.jpg' WHERE id = 5;
UPDATE hotels SET image_url = '/assets/hotels/hotel-6.jpg' WHERE id = 6;

