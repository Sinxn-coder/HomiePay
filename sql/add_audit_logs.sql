-- Create the audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID, -- Can be null if action is not linked to a specific user (or if we can't determine it easily)
    action_type TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL, -- ID of the row that was affected
    record_details JSONB, -- The row data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure RLS is enabled and admins can read it
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );

-- Trigger function to log actions
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    affected_row JSONB;
    user_id_val UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        affected_row = row_to_json(OLD)::jsonb;
    ELSE
        affected_row = row_to_json(NEW)::jsonb;
    END IF;

    -- Try to extract user_id if it exists in the row
    -- Many tables have 'created_by' or 'user_id' or 'id' (if it's the users table)
    IF TG_TABLE_NAME = 'users' THEN
        user_id_val := (affected_row->>'id')::uuid;
    ELSIF affected_row ? 'user_id' THEN
        user_id_val := (affected_row->>'user_id')::uuid;
    ELSIF affected_row ? 'created_by' THEN
        user_id_val := (affected_row->>'created_by')::uuid;
    ELSE
        user_id_val := NULL;
    END IF;

    -- Insert the log
    INSERT INTO public.audit_logs (
        user_id,
        action_type,
        table_name,
        record_id,
        record_details
    ) VALUES (
        user_id_val,
        TG_OP,
        TG_TABLE_NAME,
        affected_row->>'id',
        affected_row
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers to core tables
DROP TRIGGER IF EXISTS audit_users_trigger ON public.users;
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_groups_trigger ON public.groups;
CREATE TRIGGER audit_groups_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.groups
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_saved_bills_trigger ON public.saved_bills;
CREATE TRIGGER audit_saved_bills_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.saved_bills
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_support_tickets_trigger ON public.support_tickets;
CREATE TRIGGER audit_support_tickets_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
