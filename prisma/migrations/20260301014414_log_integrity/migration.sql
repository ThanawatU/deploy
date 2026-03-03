-- ============================================================
-- Migration: Log Integrity & Compliance
-- File: prisma/migrations/YYYYMMDDHHMMSS_log_integrity/migration.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. เพิ่มคอลัมน์ integrity สำหรับ SystemLog และ AccessLog
--    (AuditLog มี integrityHash อยู่แล้ว)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE "SystemLog"
  ADD COLUMN IF NOT EXISTS "integrityHash" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "prevHash"      VARCHAR(64);

ALTER TABLE "AccessLog"
  ADD COLUMN IF NOT EXISTS "integrityHash" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "prevHash"      VARCHAR(64);

ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "prevHash" VARCHAR(64);

-- ─────────────────────────────────────────────────────────────
-- 2. Immutable Trigger — ป้องกัน UPDATE / DELETE ทุก log table
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION prevent_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    '[IMMUTABLE] Table "%" is append-only. Operation "%" is not permitted. Contact compliance team.',
    TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

-- AuditLog
DROP TRIGGER IF EXISTS audit_log_immutable ON "AuditLog";
CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_log_mutation();

-- SystemLog
DROP TRIGGER IF EXISTS system_log_immutable ON "SystemLog";
CREATE TRIGGER system_log_immutable
  BEFORE UPDATE OR DELETE ON "SystemLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_log_mutation();

-- AccessLog
DROP TRIGGER IF EXISTS access_log_immutable ON "AccessLog";
CREATE TRIGGER access_log_immutable
  BEFORE UPDATE OR DELETE ON "AccessLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_log_mutation();

-- ─────────────────────────────────────────────────────────────
-- 3. Log Retention Function — bypass trigger ผ่าน SECURITY DEFINER
--    เรียกได้เฉพาะผ่าน function นี้เท่านั้น ไม่ใช่ DELETE โดยตรง
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS cleanup_logs_older_than(INT);
CREATE OR REPLACE FUNCTION cleanup_logs_older_than(retention_days INT)
RETURNS JSON AS $$
DECLARE
  deleted_audit  INT := 0;
  deleted_system INT := 0;
  deleted_access INT := 0;
BEGIN
  -- ปิด trigger ชั่วคราวเฉพาะ session นี้ (superuser เท่านั้น)
  SET LOCAL session_replication_role = 'replica';

  DELETE FROM "AuditLog"
  WHERE "createdAt" < NOW() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_audit = ROW_COUNT;

  DELETE FROM "SystemLog"
  WHERE "createdAt" < NOW() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_system = ROW_COUNT;

  DELETE FROM "AccessLog"
  WHERE "createdAt" < NOW() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_access = ROW_COUNT;

  -- คืนค่า trigger กลับ
  SET LOCAL session_replication_role = 'origin';

  RETURN json_build_object(
    'retentionDays',    retention_days,
    'deletedAuditLogs', deleted_audit,
    'deletedSystemLogs',deleted_system,
    'deletedAccessLogs',deleted_access,
    'executedAt',       NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- 4. Index เพิ่มเติมสำหรับ integrity lookup
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "SystemLog_integrityHash_idx" ON "SystemLog"("integrityHash");
CREATE INDEX IF NOT EXISTS "AccessLog_integrityHash_idx" ON "AccessLog"("integrityHash");
CREATE INDEX IF NOT EXISTS "AuditLog_prevHash_idx"       ON "AuditLog"("prevHash");
CREATE INDEX IF NOT EXISTS "SystemLog_prevHash_idx"      ON "SystemLog"("prevHash");
CREATE INDEX IF NOT EXISTS "AccessLog_prevHash_idx"      ON "AccessLog"("prevHash");