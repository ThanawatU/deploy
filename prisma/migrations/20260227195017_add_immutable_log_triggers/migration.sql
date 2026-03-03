-- Create immutable trigger function
CREATE OR REPLACE FUNCTION prevent_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION '% is immutable. % operation is not allowed.', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

-- AuditLog
CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_log_mutation();

-- SystemLog
CREATE TRIGGER system_log_immutable
  BEFORE UPDATE OR DELETE ON "SystemLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_log_mutation();

-- AccessLog
CREATE TRIGGER access_log_immutable
  BEFORE UPDATE OR DELETE ON "AccessLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_log_mutation();

-- Cleanup function (bypass trigger สำหรับ log retention)
CREATE OR REPLACE FUNCTION cleanup_logs_older_than(days INT)
RETURNS JSON AS $$
DECLARE
  deleted_audit  INT;
  deleted_system INT;
  deleted_access INT;
BEGIN
  DELETE FROM "AuditLog"  WHERE "createdAt" < NOW() - (days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_audit = ROW_COUNT;

  DELETE FROM "SystemLog" WHERE "createdAt" < NOW() - (days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_system = ROW_COUNT;

  DELETE FROM "AccessLog" WHERE "createdAt" < NOW() - (days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_access = ROW_COUNT;

  RETURN json_build_object(
    'deletedAuditLogs',  deleted_audit,
    'deletedSystemLogs', deleted_system,
    'deletedAccessLogs', deleted_access
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;