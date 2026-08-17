ALTER TABLE `sop_versions`
  ADD COLUMN `file_path` varchar(500) DEFAULT NULL AFTER `file_name`,
  ADD COLUMN `mime_type` varchar(120) DEFAULT NULL AFTER `file_size`;
