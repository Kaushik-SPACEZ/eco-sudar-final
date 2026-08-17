-- Add alternate_phone to users table for standardised customer/dealer forms
ALTER TABLE users
  ADD COLUMN alternate_phone VARCHAR(25) DEFAULT NULL AFTER phone;
