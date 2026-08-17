-- Phase 2 / Module 05: HR compliance, TMS attendance imports, and meeting media.
-- Run after create_attachments.sql and create_import_jobs.sql.

CREATE TABLE IF NOT EXISTS `employee_compliance` (
  `compliance_id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_key` varchar(12) NOT NULL,
  `type` varchar(30) NOT NULL,
  `provider` varchar(120) DEFAULT NULL,
  `policy_number` varchar(80) DEFAULT NULL,
  `coverage_amount` decimal(14,2) NOT NULL DEFAULT 0.00,
  `premium` decimal(14,2) NOT NULL DEFAULT 0.00,
  `start_date` date DEFAULT NULL,
  `expiry_date` date NOT NULL,
  `status` varchar(12) NOT NULL DEFAULT 'active',
  `attachment_id` int(11) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`compliance_id`),
  KEY `idx_emp_compliance_employee` (`employee_key`),
  KEY `idx_emp_compliance_status_expiry` (`status`, `expiry_date`),
  KEY `idx_emp_compliance_type` (`type`),
  KEY `idx_emp_compliance_attachment` (`attachment_id`),
  CONSTRAINT `fk_emp_compliance_employee`
    FOREIGN KEY (`employee_key`) REFERENCES `employees` (`employee_key`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_emp_compliance_attachment`
    FOREIGN KEY (`attachment_id`) REFERENCES `attachments` (`attachment_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attendance_punches` (
  `punch_id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_key` varchar(12) NOT NULL,
  `punch_timestamp` datetime NOT NULL,
  `direction` varchar(10) NOT NULL DEFAULT 'unknown',
  `external_punch_id` varchar(120) DEFAULT NULL,
  `import_job_id` int(11) DEFAULT NULL,
  `raw_json` text DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'imported',
  `error_text` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`punch_id`),
  UNIQUE KEY `uq_att_punch_emp_ts_dir` (`employee_key`, `punch_timestamp`, `direction`),
  UNIQUE KEY `uq_att_punch_external` (`external_punch_id`),
  KEY `idx_att_punch_job` (`import_job_id`),
  KEY `idx_att_punch_employee_day` (`employee_key`, `punch_timestamp`),
  CONSTRAINT `fk_att_punch_employee`
    FOREIGN KEY (`employee_key`) REFERENCES `employees` (`employee_key`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_att_punch_job`
    FOREIGN KEY (`import_job_id`) REFERENCES `import_jobs` (`job_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `attachments`
  ADD COLUMN IF NOT EXISTS `caption` varchar(255) DEFAULT NULL AFTER `category`,
  ADD COLUMN IF NOT EXISTS `thumbnail_path` varchar(500) DEFAULT NULL AFTER `file_path`,
  ADD COLUMN IF NOT EXISTS `metadata_json` text DEFAULT NULL AFTER `storage_disk`;

ALTER TABLE `attendance`
  MODIFY COLUMN `source` enum('manual','qr','auto','tms') NOT NULL DEFAULT 'manual';
