-- Orbit tables are private API storage. Only the server database role may access them.
-- The owner/bypass-RLS server role still enforces tenant membership in NestJS.
BEGIN;
DO $orbit$
DECLARE table_name text; role_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['User','Organization','Workspace','Membership','Brand','SocialAccount','OAuthToken','Campaign','ContentItem','MediaAsset','ContentMedia','Schedule','PublishingJob','Approval','AnalyticsSnapshot','AiUsage','AuditLog','Webhook','ContentRevision','AiQuota','MediaRender','BillingAccount','BillingEvent','_prisma_migrations'] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
      FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
          EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, role_name);
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END
$orbit$;
COMMIT;
