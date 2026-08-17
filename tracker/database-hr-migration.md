# Change: database/hr_migration.sql

**Type:** New file created
**Date:** 2026-04-23
**Module:** HR — Database Schema

---

## What This File Is

`database/hr_migration.sql` defines the three database tables required for the HR module: `employees`, `attendance`, and `payroll`. Run this file once on Hostinger phpMyAdmin (database `u952547820_ecosudar`) before deploying the HR backend. All statements use `CREATE TABLE IF NOT EXISTS` so they are safe to re-run.

The filename was intentionally chosen to match the `tasks_migration.sql` naming pattern and avoid any personal names in filenames.

---

## Table: employees

Stores the master record for each employee.

Columns:
- `employee_id` — auto-increment primary key (internal use only)
- `employee_key` — human-readable identifier in the format `EMP-001`, unique
- `name` — full name, VARCHAR(120)
- `email` — unique, stored lowercase, VARCHAR(180)
- `phone` — VARCHAR(25)
- `department` — ENUM restricted to `Production`, `Quality`, `Sales`, `Admin`, `Dispatch`, `Maintenance`
- `designation` — job title, VARCHAR(100)
- `base_salary` — monthly gross, DECIMAL(10,2)
- `joined_at` — DATE, the date they started
- `qr_token` — unique token in format `ESD-AP-001-7Q9X`, VARCHAR(32); embedded in QR codes for attendance scanning
- `is_active` — TINYINT(1) default 1; set to 0 for soft-delete instead of removing the row
- `created_at`, `updated_at` — auto-managed timestamps

Indexes:
- UNIQUE on `employee_key`, `email`, `qr_token`
- Regular index on `department` and `is_active` for filter queries

---

## Table: attendance

Stores one row per employee per day. Designed for both QR-scan check-in/out and manual correction.

Columns:
- `attendance_id` — auto-increment primary key
- `employee_key` — FK to `employees.employee_key`, CASCADE on delete/update
- `date` — DATE, the calendar day
- `check_in` — DATETIME, when the employee arrived (NULL if absent/leave)
- `check_out` — DATETIME, when the employee left (NULL until checked out)
- `hours_worked` — DECIMAL(4,2), calculated from check_in/out difference
- `status` — ENUM: `Present`, `Half-day`, `Absent`, `Leave`; `Half-day` is set automatically when `hours_worked < 5`
- `created_at`, `updated_at` — auto-managed timestamps

Constraints:
- UNIQUE on `(employee_key, date)` — prevents duplicate records for the same employee on the same day
- FK to `employees` with CASCADE DELETE so attendance is removed if an employee is hard-deleted (though the API soft-deletes instead)

---

## Table: payroll

Stores one payroll slip per employee per month. Designed so payroll can be re-calculated and re-saved for the same month without losing approval status.

Columns:
- `payroll_id` — auto-increment primary key
- `employee_key` — FK to `employees.employee_key`, CASCADE on delete/update
- `month` — VARCHAR(7) in `YYYY-MM` format
- `working_days` — total working days in the month (Sundays excluded)
- `present_days` — DECIMAL(5,1) to support half-days (e.g. 18.5)
- `leaves` — integer count of leave days
- `base_salary` — gross monthly salary at the time of calculation
- `earned_salary` — pro-rated salary based on present days
- `hra` — house rent allowance (10% of base)
- `allowances` — other allowances (5% of base)
- `pf` — provident fund deduction (12% of base)
- `professional_tax` — fixed ₹200
- `deductions` — total of pf + professional_tax
- `net_pay` — take-home after deductions
- `status` — ENUM: `Draft` (default), `Processed`, `Paid`
- `generated_at` — when the calculation was last run
- `processed_at` — set by the `process()` endpoint when marked Processed
- `paid_at` — set by the `process()` endpoint when marked Paid

Constraints:
- UNIQUE on `(employee_key, month)` — combined with `ON DUPLICATE KEY UPDATE` in the model, this makes payroll re-runs safe
- FK to `employees` with CASCADE DELETE
