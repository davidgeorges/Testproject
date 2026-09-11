CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908100158_InitialWorkspace') THEN
    CREATE TABLE user_profiles (
        "Id" text NOT NULL,
        "FirstName" text NOT NULL,
        "Theme" text NOT NULL,
        "NotificationsEnabled" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_user_profiles" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908100158_InitialWorkspace') THEN
    CREATE TABLE bank_connections (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "BankName" text NOT NULL,
        "Provider" text NOT NULL,
        "Status" text NOT NULL,
        "LastSyncAt" timestamp with time zone,
        "ConsentExpiresAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_bank_connections" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_bank_connections_user_profiles_UserId" FOREIGN KEY ("UserId") REFERENCES user_profiles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908100158_InitialWorkspace') THEN
    CREATE TABLE consents (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "Type" text NOT NULL,
        "Version" text NOT NULL,
        "GrantedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_consents" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_consents_user_profiles_UserId" FOREIGN KEY ("UserId") REFERENCES user_profiles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908100158_InitialWorkspace') THEN
    CREATE TABLE recommendation_events (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "RecommendationId" text NOT NULL,
        "EventType" text NOT NULL,
        "OccurredAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_recommendation_events" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_recommendation_events_user_profiles_UserId" FOREIGN KEY ("UserId") REFERENCES user_profiles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908100158_InitialWorkspace') THEN
    CREATE TABLE transactions (
        "Id" uuid NOT NULL,
        "ConnectionId" uuid NOT NULL,
        "UserId" text NOT NULL,
        "ExternalId" text NOT NULL,
        "Provider" text NOT NULL,
        "AccountKey" text NOT NULL,
        "BookedAt" date NOT NULL,
        "Amount" numeric(18,2) NOT NULL,
        "Currency" text NOT NULL,
        "MerchantName" text NOT NULL,
        "Category" text NOT NULL,
        CONSTRAINT "PK_transactions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_transactions_bank_connections_ConnectionId" FOREIGN KEY ("ConnectionId") REFERENCES bank_connections ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908100158_InitialWorkspace') THEN
    CREATE INDEX "IX_bank_connections_UserId_Status" ON bank_connections ("UserId", "Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908100158_InitialWorkspace') THEN
    CREATE INDEX "IX_consents_UserId" ON consents ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908100158_InitialWorkspace') THEN
    CREATE INDEX "IX_recommendation_events_UserId_OccurredAt" ON recommendation_events ("UserId", "OccurredAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908100158_InitialWorkspace') THEN
    CREATE INDEX "IX_transactions_ConnectionId" ON transactions ("ConnectionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908100158_InitialWorkspace') THEN
    CREATE INDEX "IX_transactions_UserId_BookedAt" ON transactions ("UserId", "BookedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908100158_InitialWorkspace') THEN
    CREATE UNIQUE INDEX "IX_transactions_UserId_Provider_ExternalId" ON transactions ("UserId", "Provider", "ExternalId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908100158_InitialWorkspace') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908100158_InitialWorkspace', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908161915_AddNotifications') THEN
    CREATE TABLE notifications (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "Type" text NOT NULL,
        "Title" text NOT NULL,
        "Body" text NOT NULL,
        "ResourceId" text,
        "SourceKey" text NOT NULL,
        "ReadAt" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_notifications" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_notifications_user_profiles_UserId" FOREIGN KEY ("UserId") REFERENCES user_profiles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908161915_AddNotifications') THEN
    CREATE INDEX "IX_notifications_UserId_CreatedAt" ON notifications ("UserId", "CreatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908161915_AddNotifications') THEN
    CREATE UNIQUE INDEX "IX_notifications_UserId_SourceKey" ON notifications ("UserId", "SourceKey");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908161915_AddNotifications') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908161915_AddNotifications', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908163806_AddSubscriptionPreferences') THEN
    CREATE TABLE subscription_preferences (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "SubscriptionId" text NOT NULL,
        "Category" text,
        "Status" text NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_subscription_preferences" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_subscription_preferences_user_profiles_UserId" FOREIGN KEY ("UserId") REFERENCES user_profiles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908163806_AddSubscriptionPreferences') THEN
    CREATE UNIQUE INDEX "IX_subscription_preferences_UserId_SubscriptionId" ON subscription_preferences ("UserId", "SubscriptionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908163806_AddSubscriptionPreferences') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908163806_AddSubscriptionPreferences', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908171636_ExtendConsentsForRevocation') THEN
    ALTER TABLE consents ADD "RevokedAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908171636_ExtendConsentsForRevocation') THEN
    ALTER TABLE consents ADD "SubjectId" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908171636_ExtendConsentsForRevocation') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908171636_ExtendConsentsForRevocation', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908171911_AddBankAccounts') THEN
    ALTER TABLE transactions ADD "AccountId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908171911_AddBankAccounts') THEN
    CREATE TABLE bank_accounts (
        "Id" uuid NOT NULL,
        "ConnectionId" uuid NOT NULL,
        "UserId" text NOT NULL,
        "ExternalAccountId" text NOT NULL,
        "AccountType" text NOT NULL,
        "MaskedName" text NOT NULL,
        CONSTRAINT "PK_bank_accounts" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_bank_accounts_bank_connections_ConnectionId" FOREIGN KEY ("ConnectionId") REFERENCES bank_connections ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908171911_AddBankAccounts') THEN
    CREATE INDEX "IX_transactions_AccountId" ON transactions ("AccountId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908171911_AddBankAccounts') THEN
    CREATE UNIQUE INDEX "IX_bank_accounts_ConnectionId_ExternalAccountId" ON bank_accounts ("ConnectionId", "ExternalAccountId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908171911_AddBankAccounts') THEN
    CREATE INDEX "IX_bank_accounts_UserId" ON bank_accounts ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908171911_AddBankAccounts') THEN
    ALTER TABLE transactions ADD CONSTRAINT "FK_transactions_bank_accounts_AccountId" FOREIGN KEY ("AccountId") REFERENCES bank_accounts ("Id") ON DELETE CASCADE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908171911_AddBankAccounts') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908171911_AddBankAccounts', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908172317_AddAdminOfferCatalog') THEN
    CREATE TABLE offers (
        "Id" text NOT NULL,
        "Category" text NOT NULL,
        "ProviderName" text NOT NULL,
        "MonthlyPrice" numeric(18,2) NOT NULL,
        "SetupFee" numeric(18,2) NOT NULL,
        "Benefits" text[] NOT NULL,
        "Assumptions" text[] NOT NULL,
        "Active" boolean NOT NULL,
        "IsPartner" boolean NOT NULL,
        "Url" text,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_offers" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908172317_AddAdminOfferCatalog') THEN
    INSERT INTO offers ("Id", "Active", "Assumptions", "Benefits", "Category", "IsPartner", "MonthlyPrice", "ProviderName", "SetupFee", "UpdatedAt", "Url")
    VALUES ('insurance-demo', TRUE, ARRAY['Garanties, franchises et profil conducteur à comparer.','Catalogue fictif : aucun tarif commercial vérifié.']::text[], ARRAY['Exemple de contrat automobile']::text[], 'insurance', TRUE, 49.0, 'Offre assurance démo', 0.0, TIMESTAMPTZ '2026-09-08T00:00:00+00:00', NULL);
    INSERT INTO offers ("Id", "Active", "Assumptions", "Benefits", "Category", "IsPartner", "MonthlyPrice", "ProviderName", "SetupFee", "UpdatedAt", "Url")
    VALUES ('internet-demo', TRUE, ARRAY['Éligibilité du logement inconnue.','Catalogue fictif : aucun tarif commercial vérifié.']::text[], ARRAY['Exemple de connexion fibre','39 € de mise en service']::text[], 'internet', TRUE, 29.99, 'Offre fibre démo', 39.0, TIMESTAMPTZ '2026-09-08T00:00:00+00:00', NULL);
    INSERT INTO offers ("Id", "Active", "Assumptions", "Benefits", "Category", "IsPartner", "MonthlyPrice", "ProviderName", "SetupFee", "UpdatedAt", "Url")
    VALUES ('mobile-demo', TRUE, ARRAY['Catalogue fictif : aucun tarif commercial vérifié.']::text[], ARRAY['Sans engagement','Exemple de forfait mobile']::text[], 'mobile', TRUE, 14.99, 'Offre mobile démo', 0.0, TIMESTAMPTZ '2026-09-08T00:00:00+00:00', NULL);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908172317_AddAdminOfferCatalog') THEN
    CREATE INDEX "IX_offers_Category_Active" ON offers ("Category", "Active");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908172317_AddAdminOfferCatalog') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908172317_AddAdminOfferCatalog', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908172547_AddAuditLogs') THEN
    CREATE TABLE audit_logs (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "Action" text NOT NULL,
        "ResourceType" text NOT NULL,
        "ResourceId" text,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_audit_logs_user_profiles_UserId" FOREIGN KEY ("UserId") REFERENCES user_profiles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908172547_AddAuditLogs') THEN
    CREATE INDEX "IX_audit_logs_UserId_CreatedAt" ON audit_logs ("UserId", "CreatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908172547_AddAuditLogs') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908172547_AddAuditLogs', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908172934_AddPremiumSubscriptions') THEN
    CREATE TABLE premium_subscriptions (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "Provider" text NOT NULL,
        "ExternalSubscriptionId" text NOT NULL,
        "Plan" text NOT NULL,
        "Status" text NOT NULL,
        "RenewsAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_premium_subscriptions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_premium_subscriptions_user_profiles_UserId" FOREIGN KEY ("UserId") REFERENCES user_profiles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908172934_AddPremiumSubscriptions') THEN
    CREATE UNIQUE INDEX "IX_premium_subscriptions_Provider_ExternalSubscriptionId" ON premium_subscriptions ("Provider", "ExternalSubscriptionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908172934_AddPremiumSubscriptions') THEN
    CREATE INDEX "IX_premium_subscriptions_UserId_Status" ON premium_subscriptions ("UserId", "Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908172934_AddPremiumSubscriptions') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908172934_AddPremiumSubscriptions', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908173235_PersistAnalysisResults') THEN
    CREATE TABLE recommendations (
        "Id" text NOT NULL,
        "UserId" text NOT NULL,
        "SubscriptionId" text NOT NULL,
        "Category" text NOT NULL,
        "CurrentCost" numeric(18,2) NOT NULL,
        "SuggestedCost" numeric(18,2) NOT NULL,
        "AnnualSaving" numeric(18,2) NOT NULL,
        "Confidence" text NOT NULL,
        "Explanation" text NOT NULL,
        "Assumptions" text[] NOT NULL,
        "OfferId" text NOT NULL,
        "Status" text NOT NULL,
        "ComputedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_recommendations" PRIMARY KEY ("UserId", "Id"),
        CONSTRAINT "FK_recommendations_user_profiles_UserId" FOREIGN KEY ("UserId") REFERENCES user_profiles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908173235_PersistAnalysisResults') THEN
    CREATE TABLE recurring_payments (
        "Id" text NOT NULL,
        "UserId" text NOT NULL,
        "Merchant" text NOT NULL,
        "Category" text NOT NULL,
        "Cadence" text NOT NULL,
        "AverageAmount" numeric(18,2) NOT NULL,
        "MonthlyCost" numeric(18,2) NOT NULL,
        "Confidence" text NOT NULL,
        "FirstSeenAt" date NOT NULL,
        "LastSeenAt" date NOT NULL,
        "NextPaymentAt" date NOT NULL,
        "ComputedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_recurring_payments" PRIMARY KEY ("UserId", "Id"),
        CONSTRAINT "FK_recurring_payments_user_profiles_UserId" FOREIGN KEY ("UserId") REFERENCES user_profiles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908173235_PersistAnalysisResults') THEN
    CREATE INDEX "IX_recommendations_UserId_Status" ON recommendations ("UserId", "Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908173235_PersistAnalysisResults') THEN
    CREATE INDEX "IX_recurring_payments_UserId_ComputedAt" ON recurring_payments ("UserId", "ComputedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908173235_PersistAnalysisResults') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908173235_PersistAnalysisResults', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908211624_AddPushDevices') THEN
    CREATE TABLE push_devices (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "Platform" text NOT NULL,
        "Token" text NOT NULL,
        "RegisteredAt" timestamp with time zone NOT NULL,
        "LastSeenAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_push_devices" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_push_devices_user_profiles_UserId" FOREIGN KEY ("UserId") REFERENCES user_profiles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908211624_AddPushDevices') THEN
    CREATE INDEX "IX_push_devices_UserId" ON push_devices ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908211624_AddPushDevices') THEN
    CREATE UNIQUE INDEX "IX_push_devices_UserId_Token" ON push_devices ("UserId", "Token");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908211624_AddPushDevices') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908211624_AddPushDevices', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908212224_AddDurableIdempotency') THEN
    CREATE TABLE idempotency_records (
        "CacheKey" character varying(512) NOT NULL,
        "Fingerprint" text NOT NULL,
        "StatusCode" integer,
        "ResponseBody" text,
        "CreatedAt" timestamp with time zone NOT NULL,
        "ExpiresAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_idempotency_records" PRIMARY KEY ("CacheKey")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908212224_AddDurableIdempotency') THEN
    CREATE INDEX "IX_idempotency_records_ExpiresAt" ON idempotency_records ("ExpiresAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908212224_AddDurableIdempotency') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908212224_AddDurableIdempotency', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908212849_AddBankSyncJobs') THEN
    CREATE TABLE bank_sync_jobs (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "ConnectionId" uuid NOT NULL,
        "Status" text NOT NULL,
        "Attempts" integer NOT NULL,
        "TransactionCount" integer,
        "ErrorCode" text,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        "LeaseExpiresAt" timestamp with time zone,
        CONSTRAINT "PK_bank_sync_jobs" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_bank_sync_jobs_bank_connections_ConnectionId" FOREIGN KEY ("ConnectionId") REFERENCES bank_connections ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_bank_sync_jobs_user_profiles_UserId" FOREIGN KEY ("UserId") REFERENCES user_profiles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908212849_AddBankSyncJobs') THEN
    CREATE INDEX "IX_bank_sync_jobs_ConnectionId" ON bank_sync_jobs ("ConnectionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908212849_AddBankSyncJobs') THEN
    CREATE INDEX "IX_bank_sync_jobs_Status_CreatedAt" ON bank_sync_jobs ("Status", "CreatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908212849_AddBankSyncJobs') THEN
    CREATE INDEX "IX_bank_sync_jobs_UserId_CreatedAt" ON bank_sync_jobs ("UserId", "CreatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908212849_AddBankSyncJobs') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908212849_AddBankSyncJobs', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908213245_AddAffiliateConversions') THEN
    CREATE TABLE affiliate_conversions (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "RecommendationEventId" uuid NOT NULL,
        "Provider" text NOT NULL,
        "ExternalConversionId" text NOT NULL,
        "Amount" numeric(18,2) NOT NULL,
        "Currency" text NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_affiliate_conversions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_affiliate_conversions_recommendation_events_RecommendationE~" FOREIGN KEY ("RecommendationEventId") REFERENCES recommendation_events ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_affiliate_conversions_user_profiles_UserId" FOREIGN KEY ("UserId") REFERENCES user_profiles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908213245_AddAffiliateConversions') THEN
    CREATE UNIQUE INDEX "IX_affiliate_conversions_Provider_ExternalConversionId" ON affiliate_conversions ("Provider", "ExternalConversionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908213245_AddAffiliateConversions') THEN
    CREATE INDEX "IX_affiliate_conversions_RecommendationEventId" ON affiliate_conversions ("RecommendationEventId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908213245_AddAffiliateConversions') THEN
    CREATE INDEX "IX_affiliate_conversions_UserId_CreatedAt" ON affiliate_conversions ("UserId", "CreatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908213245_AddAffiliateConversions') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908213245_AddAffiliateConversions', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908214237_AddPushDeliveryState') THEN
    ALTER TABLE push_devices ADD "Active" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908214237_AddPushDeliveryState') THEN
    ALTER TABLE notifications ADD "PushAttemptedAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908214237_AddPushDeliveryState') THEN
    ALTER TABLE notifications ADD "PushAttempts" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908214237_AddPushDeliveryState') THEN
    ALTER TABLE notifications ADD "PushStatus" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908214237_AddPushDeliveryState') THEN
    ALTER TABLE notifications ADD "PushedAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908214237_AddPushDeliveryState') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908214237_AddPushDeliveryState', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908215827_AddOpenBankingIdentifiers') THEN
    ALTER TABLE bank_connections ADD "ExternalConnectionId" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908215827_AddOpenBankingIdentifiers') THEN
    CREATE UNIQUE INDEX "IX_bank_connections_Provider_ExternalConnectionId" ON bank_connections ("Provider", "ExternalConnectionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908215827_AddOpenBankingIdentifiers') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908215827_AddOpenBankingIdentifiers', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908221652_AddPushDeliveryLeases') THEN
    ALTER TABLE notifications ADD "PushLeaseExpiresAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908221652_AddPushDeliveryLeases') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908221652_AddPushDeliveryLeases', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260909050845_AddPremiumWebhookEvents') THEN
    CREATE TABLE premium_webhook_events (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "Provider" text NOT NULL,
        "ExternalEventId" text NOT NULL,
        "ExternalSubscriptionId" text NOT NULL,
        "EventType" text NOT NULL,
        "OccurredAt" timestamp with time zone NOT NULL,
        "ProcessedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_premium_webhook_events" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_premium_webhook_events_user_profiles_UserId" FOREIGN KEY ("UserId") REFERENCES user_profiles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260909050845_AddPremiumWebhookEvents') THEN
    CREATE UNIQUE INDEX "IX_premium_webhook_events_Provider_ExternalEventId" ON premium_webhook_events ("Provider", "ExternalEventId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260909050845_AddPremiumWebhookEvents') THEN
    CREATE INDEX "IX_premium_webhook_events_Provider_ExternalSubscriptionId" ON premium_webhook_events ("Provider", "ExternalSubscriptionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260909050845_AddPremiumWebhookEvents') THEN
    CREATE INDEX "IX_premium_webhook_events_UserId" ON premium_webhook_events ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260909050845_AddPremiumWebhookEvents') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260909050845_AddPremiumWebhookEvents', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260909233008_AddBankProviderSecret') THEN
    ALTER TABLE bank_connections ADD "ProviderSecret" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260909233008_AddBankProviderSecret') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260909233008_AddBankProviderSecret', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260909233142_RemoveDemoOffers') THEN
    DELETE FROM offers
    WHERE "Id" = 'insurance-demo';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260909233142_RemoveDemoOffers') THEN
    DELETE FROM offers
    WHERE "Id" = 'internet-demo';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260909233142_RemoveDemoOffers') THEN
    DELETE FROM offers
    WHERE "Id" = 'mobile-demo';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260909233142_RemoveDemoOffers') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260909233142_RemoveDemoOffers', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910054850_AddDurableOperations') THEN
    ALTER TABLE recommendation_events ADD "ConfirmedAnnualSaving" numeric(18,2);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910054850_AddDurableOperations') THEN
    CREATE TABLE account_deletion_jobs (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "Status" text NOT NULL,
        "Attempts" integer NOT NULL,
        "LastError" text,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_account_deletion_jobs" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910054850_AddDurableOperations') THEN
    CREATE TABLE push_receipts (
        "Id" uuid NOT NULL,
        "NotificationId" uuid NOT NULL,
        "DeviceId" uuid NOT NULL,
        "TicketId" text NOT NULL,
        "Status" text NOT NULL,
        "Attempts" integer NOT NULL,
        "LastError" text,
        "CheckAfter" timestamp with time zone NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_push_receipts" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_push_receipts_notifications_NotificationId" FOREIGN KEY ("NotificationId") REFERENCES notifications ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_push_receipts_push_devices_DeviceId" FOREIGN KEY ("DeviceId") REFERENCES push_devices ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910054850_AddDurableOperations') THEN
    CREATE INDEX "IX_account_deletion_jobs_Status_UpdatedAt" ON account_deletion_jobs ("Status", "UpdatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910054850_AddDurableOperations') THEN
    CREATE UNIQUE INDEX "IX_account_deletion_jobs_UserId" ON account_deletion_jobs ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910054850_AddDurableOperations') THEN
    CREATE INDEX "IX_push_receipts_DeviceId" ON push_receipts ("DeviceId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910054850_AddDurableOperations') THEN
    CREATE INDEX "IX_push_receipts_NotificationId" ON push_receipts ("NotificationId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910054850_AddDurableOperations') THEN
    CREATE INDEX "IX_push_receipts_Status_CheckAfter" ON push_receipts ("Status", "CheckAfter");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910054850_AddDurableOperations') THEN
    CREATE UNIQUE INDEX "IX_push_receipts_TicketId" ON push_receipts ("TicketId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910054850_AddDurableOperations') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260910054850_AddDurableOperations', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910062024_PersistDataProtectionKeys') THEN
    CREATE TABLE data_protection_keys (
        "Id" integer GENERATED BY DEFAULT AS IDENTITY,
        "FriendlyName" text,
        "Xml" text,
        CONSTRAINT "PK_data_protection_keys" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910062024_PersistDataProtectionKeys') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260910062024_PersistDataProtectionKeys', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910075559_SeedVerifiedOfferCandidates') THEN
    INSERT INTO offers ("Id", "Active", "Assumptions", "Benefits", "Category", "IsPartner", "MonthlyPrice", "ProviderName", "SetupFee", "UpdatedAt", "Url")
    VALUES ('candidate-free-mobile-2eur-2026-03-31', FALSE, ARRAY['Tarif public vérifié le 10 septembre 2026 ; à revalider avant activation.','Le tarif à 0 €/mois est réservé aux abonnés Freebox éligibles.','Cette fiche n''établit aucun partenariat commercial avec Free.']::text[], ARRAY['2 h d''appels','50 Mo','SMS/MMS illimités','Sans engagement']::text[], 'mobile', FALSE, 2.0, 'Free Mobile — Forfait 2 €', 10.0, TIMESTAMPTZ '2026-09-10T00:00:00+00:00', 'https://mobile.free.fr/fiche-forfait-2-euros');
    INSERT INTO offers ("Id", "Active", "Assumptions", "Benefits", "Category", "IsPartner", "MonthlyPrice", "ProviderName", "SetupFee", "UpdatedAt", "Url")
    VALUES ('candidate-sosh-mobile-100go-2026-09-10', FALSE, ARRAY['Tarif public vérifié le 10 septembre 2026 ; à revalider avant activation.','Offre réservée aux nouvelles souscriptions, hors changement d''offre Orange ou Sosh.','Cette fiche n''établit aucun partenariat commercial avec Sosh.']::text[], ARRAY['100 Go en France','40 Go en Europe et DOM','Appels/SMS/MMS illimités','Sans engagement']::text[], 'mobile', FALSE, 13.99, 'Sosh — Forfait 100 Go', 10.0, TIMESTAMPTZ '2026-09-10T00:00:00+00:00', 'https://shop.sosh.fr/mobile/forfait-100go');
    INSERT INTO offers ("Id", "Active", "Assumptions", "Benefits", "Category", "IsPartner", "MonthlyPrice", "ProviderName", "SetupFee", "UpdatedAt", "Url")
    VALUES ('candidate-byou-mobile-100go-5g-2026-09-10', FALSE, ARRAY['Tarif public vérifié le 10 septembre 2026 ; à revalider avant activation.','Les frais et le volume de données à l''étranger doivent être revérifiés lors de l''activation.','Cette fiche n''établit aucun partenariat commercial avec Bouygues Telecom.']::text[], ARRAY['100 Go en 5G','35 Go en Europe et DOM','Appels/SMS/MMS illimités','Sans engagement']::text[], 'mobile', FALSE, 13.99, 'B&You — Forfait 100 Go 5G', 2.0, TIMESTAMPTZ '2026-09-10T00:00:00+00:00', 'https://www.bouyguestelecom.fr/forfaits-mobiles/sans-engagement');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910075559_SeedVerifiedOfferCandidates') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260910075559_SeedVerifiedOfferCandidates', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910184156_AddBudgetAssistant') THEN
    ALTER TABLE transactions ADD "IsInternalTransfer" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910184156_AddBudgetAssistant') THEN
    UPDATE transactions
    SET "IsInternalTransfer" = TRUE
    WHERE "Category" ILIKE '%internal_transfer%'
       OR "Category" ILIKE '%account_transfer%'
       OR "MerchantName" ILIKE '%virement interne%'
       OR "MerchantName" ILIKE '%transfert interne%'
       OR "MerchantName" ILIKE '%transfert entre compte%'
       OR "MerchantName" ILIKE '%internal transfer%';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910184156_AddBudgetAssistant') THEN
    CREATE TABLE category_budgets (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "Category" text NOT NULL,
        "MonthlyLimit" numeric(18,2) NOT NULL,
        "CategoryType" text NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_category_budgets" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_category_budgets_user_profiles_UserId" FOREIGN KEY ("UserId") REFERENCES user_profiles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910184156_AddBudgetAssistant') THEN
    CREATE TABLE transaction_category_rules (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "TransactionId" uuid NOT NULL,
        "Category" text NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_transaction_category_rules" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_transaction_category_rules_transactions_TransactionId" FOREIGN KEY ("TransactionId") REFERENCES transactions ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_transaction_category_rules_user_profiles_UserId" FOREIGN KEY ("UserId") REFERENCES user_profiles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910184156_AddBudgetAssistant') THEN
    CREATE UNIQUE INDEX "IX_category_budgets_UserId_Category" ON category_budgets ("UserId", "Category");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910184156_AddBudgetAssistant') THEN
    CREATE INDEX "IX_transaction_category_rules_TransactionId" ON transaction_category_rules ("TransactionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910184156_AddBudgetAssistant') THEN
    CREATE INDEX "IX_transaction_category_rules_UserId_Category" ON transaction_category_rules ("UserId", "Category");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910184156_AddBudgetAssistant') THEN
    CREATE UNIQUE INDEX "IX_transaction_category_rules_UserId_TransactionId" ON transaction_category_rules ("UserId", "TransactionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910184156_AddBudgetAssistant') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260910184156_AddBudgetAssistant', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910202029_AddProfileAccentColor') THEN
    ALTER TABLE user_profiles ADD "AccentColor" character varying(7) NOT NULL DEFAULT '#70737A';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910202029_AddProfileAccentColor') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260910202029_AddProfileAccentColor', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910215913_AddBudgetDisplayName') THEN
    ALTER TABLE category_budgets ADD "DisplayName" character varying(60);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910215913_AddBudgetDisplayName') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260910215913_AddBudgetDisplayName', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911053038_AddDocuments') THEN
    CREATE TABLE documents (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "OriginalFileName" character varying(255) NOT NULL,
        "ContentType" character varying(100) NOT NULL,
        "Size" bigint NOT NULL,
        "Sha256" character varying(64) NOT NULL,
        "ProtectedContent" bytea NOT NULL,
        "Status" character varying(20) NOT NULL,
        "Category" character varying(40) NOT NULL,
        "Title" character varying(160) NOT NULL,
        "Issuer" character varying(160),
        "ExtractedText" text NOT NULL,
        "Amount" numeric(18,2),
        "DocumentDate" date,
        "DueDate" date,
        "ContractNumber" character varying(120),
        "ProcessingError" character varying(80),
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_documents" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_documents_user_profiles_UserId" FOREIGN KEY ("UserId") REFERENCES user_profiles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911053038_AddDocuments') THEN
    CREATE INDEX "IX_documents_UserId_Category" ON documents ("UserId", "Category");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911053038_AddDocuments') THEN
    CREATE INDEX "IX_documents_UserId_CreatedAt" ON documents ("UserId", "CreatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911053038_AddDocuments') THEN
    CREATE UNIQUE INDEX "IX_documents_UserId_Sha256" ON documents ("UserId", "Sha256");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911053038_AddDocuments') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260911053038_AddDocuments', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911060547_AddDeadlines') THEN
    CREATE TABLE deadlines (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "Title" character varying(160) NOT NULL,
        "Category" character varying(40) NOT NULL,
        "Notes" character varying(1000),
        "DueAt" timestamp with time zone NOT NULL,
        "ReminderMinutesBefore" integer NOT NULL,
        "ReminderSentAt" timestamp with time zone,
        "CompletedAt" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_deadlines" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_deadlines_user_profiles_UserId" FOREIGN KEY ("UserId") REFERENCES user_profiles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911060547_AddDeadlines') THEN
    CREATE INDEX "IX_deadlines_ReminderSentAt_CompletedAt_DueAt" ON deadlines ("ReminderSentAt", "CompletedAt", "DueAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911060547_AddDeadlines') THEN
    CREATE INDEX "IX_deadlines_UserId_DueAt" ON deadlines ("UserId", "DueAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911060547_AddDeadlines') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260911060547_AddDeadlines', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE TABLE households (
        "Id" uuid NOT NULL,
        "OwnerUserId" text NOT NULL,
        "Name" character varying(80) NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_households" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_households_user_profiles_OwnerUserId" FOREIGN KEY ("OwnerUserId") REFERENCES user_profiles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE TABLE household_budgets (
        "Id" uuid NOT NULL,
        "HouseholdId" uuid NOT NULL,
        "Name" character varying(80) NOT NULL,
        "Category" character varying(40) NOT NULL,
        "MonthlyLimit" numeric(18,2) NOT NULL,
        "Notes" character varying(500),
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_household_budgets" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_household_budgets_households_HouseholdId" FOREIGN KEY ("HouseholdId") REFERENCES households ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE TABLE household_members (
        "Id" uuid NOT NULL,
        "HouseholdId" uuid NOT NULL,
        "DisplayName" character varying(80) NOT NULL,
        "Relationship" character varying(30) NOT NULL,
        "BirthDate" date,
        "Email" character varying(254),
        "LinkedUserId" text,
        "AccountStatus" character varying(20) NOT NULL,
        "AccessRole" character varying(20) NOT NULL,
        "InvitationTokenHash" character varying(64),
        "InvitationExpiresAt" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_household_members" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_household_members_households_HouseholdId" FOREIGN KEY ("HouseholdId") REFERENCES households ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_household_members_user_profiles_LinkedUserId" FOREIGN KEY ("LinkedUserId") REFERENCES user_profiles ("Id") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE TABLE household_residences (
        "Id" uuid NOT NULL,
        "HouseholdId" uuid NOT NULL,
        "Name" character varying(80) NOT NULL,
        "Kind" character varying(30) NOT NULL,
        "Address" character varying(300),
        "Notes" character varying(500),
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_household_residences" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_household_residences_households_HouseholdId" FOREIGN KEY ("HouseholdId") REFERENCES households ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE TABLE household_vehicles (
        "Id" uuid NOT NULL,
        "HouseholdId" uuid NOT NULL,
        "Name" character varying(80) NOT NULL,
        "Registration" character varying(30),
        "Notes" character varying(500),
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_household_vehicles" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_household_vehicles_households_HouseholdId" FOREIGN KEY ("HouseholdId") REFERENCES households ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE TABLE household_budget_members (
        "BudgetId" uuid NOT NULL,
        "MemberId" uuid NOT NULL,
        CONSTRAINT "PK_household_budget_members" PRIMARY KEY ("BudgetId", "MemberId"),
        CONSTRAINT "FK_household_budget_members_household_budgets_BudgetId" FOREIGN KEY ("BudgetId") REFERENCES household_budgets ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_household_budget_members_household_members_MemberId" FOREIGN KEY ("MemberId") REFERENCES household_members ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE TABLE household_contracts (
        "Id" uuid NOT NULL,
        "HouseholdId" uuid NOT NULL,
        "Name" character varying(100) NOT NULL,
        "Category" character varying(40) NOT NULL,
        "Provider" character varying(100),
        "MonthlyAmount" numeric(18,2),
        "RenewalDate" date,
        "ResidenceId" uuid,
        "VehicleId" uuid,
        "Notes" character varying(500),
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_household_contracts" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_household_contracts_household_residences_ResidenceId" FOREIGN KEY ("ResidenceId") REFERENCES household_residences ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_household_contracts_household_vehicles_VehicleId" FOREIGN KEY ("VehicleId") REFERENCES household_vehicles ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_household_contracts_households_HouseholdId" FOREIGN KEY ("HouseholdId") REFERENCES households ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE TABLE household_contract_members (
        "ContractId" uuid NOT NULL,
        "MemberId" uuid NOT NULL,
        CONSTRAINT "PK_household_contract_members" PRIMARY KEY ("ContractId", "MemberId"),
        CONSTRAINT "FK_household_contract_members_household_contracts_ContractId" FOREIGN KEY ("ContractId") REFERENCES household_contracts ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_household_contract_members_household_members_MemberId" FOREIGN KEY ("MemberId") REFERENCES household_members ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE INDEX "IX_household_budget_members_MemberId" ON household_budget_members ("MemberId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE INDEX "IX_household_budgets_HouseholdId_Name" ON household_budgets ("HouseholdId", "Name");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE INDEX "IX_household_contract_members_MemberId" ON household_contract_members ("MemberId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE INDEX "IX_household_contracts_HouseholdId_Category" ON household_contracts ("HouseholdId", "Category");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE INDEX "IX_household_contracts_ResidenceId" ON household_contracts ("ResidenceId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE INDEX "IX_household_contracts_VehicleId" ON household_contracts ("VehicleId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE INDEX "IX_household_members_HouseholdId_LinkedUserId" ON household_members ("HouseholdId", "LinkedUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE UNIQUE INDEX "IX_household_members_InvitationTokenHash" ON household_members ("InvitationTokenHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE INDEX "IX_household_members_LinkedUserId" ON household_members ("LinkedUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE INDEX "IX_household_residences_HouseholdId" ON household_residences ("HouseholdId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE INDEX "IX_household_vehicles_HouseholdId" ON household_vehicles ("HouseholdId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    CREATE UNIQUE INDEX "IX_households_OwnerUserId" ON households ("OwnerUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911065649_AddHouseholdWorkspace') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260911065649_AddHouseholdWorkspace', '10.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911082607_AddHouseholdExpenseTracking') THEN
    ALTER TABLE household_members ADD "CanManageAssets" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911082607_AddHouseholdExpenseTracking') THEN
    ALTER TABLE household_members ADD "CanManageBudgets" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911082607_AddHouseholdExpenseTracking') THEN
    ALTER TABLE household_members ADD "CanManageContracts" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911082607_AddHouseholdExpenseTracking') THEN
    ALTER TABLE household_contracts ADD "SourceDocumentId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911082607_AddHouseholdExpenseTracking') THEN
    ALTER TABLE deadlines ADD "SourceId" character varying(80);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911082607_AddHouseholdExpenseTracking') THEN
    ALTER TABLE deadlines ADD "SourceType" character varying(40) NOT NULL DEFAULT 'manual';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911082607_AddHouseholdExpenseTracking') THEN
    UPDATE household_members SET "CanManageBudgets" = TRUE, "CanManageAssets" = TRUE, "CanManageContracts" = TRUE WHERE "AccountStatus" = 'owner';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911082607_AddHouseholdExpenseTracking') THEN
    CREATE TABLE household_expenses (
        "Id" uuid NOT NULL,
        "HouseholdId" uuid NOT NULL,
        "BudgetId" uuid,
        "BankTransactionId" uuid,
        "CreatedByUserId" text NOT NULL,
        "Title" character varying(160) NOT NULL,
        "Category" character varying(40) NOT NULL,
        "Amount" numeric(18,2) NOT NULL,
        "OccurredOn" date NOT NULL,
        "Source" character varying(20) NOT NULL,
        "Notes" character varying(500),
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_household_expenses" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_household_expenses_household_budgets_BudgetId" FOREIGN KEY ("BudgetId") REFERENCES household_budgets ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_household_expenses_households_HouseholdId" FOREIGN KEY ("HouseholdId") REFERENCES households ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_household_expenses_transactions_BankTransactionId" FOREIGN KEY ("BankTransactionId") REFERENCES transactions ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_household_expenses_user_profiles_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES user_profiles ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911082607_AddHouseholdExpenseTracking') THEN
    CREATE TABLE household_expense_splits (
        "ExpenseId" uuid NOT NULL,
        "MemberId" uuid NOT NULL,
        "Amount" numeric(18,2) NOT NULL,
        CONSTRAINT "PK_household_expense_splits" PRIMARY KEY ("ExpenseId", "MemberId"),
        CONSTRAINT "FK_household_expense_splits_household_expenses_ExpenseId" FOREIGN KEY ("ExpenseId") REFERENCES household_expenses ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_household_expense_splits_household_members_MemberId" FOREIGN KEY ("MemberId") REFERENCES household_members ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911082607_AddHouseholdExpenseTracking') THEN
    CREATE UNIQUE INDEX "IX_household_contracts_SourceDocumentId" ON household_contracts ("SourceDocumentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911082607_AddHouseholdExpenseTracking') THEN
    CREATE UNIQUE INDEX "IX_deadlines_UserId_SourceType_SourceId" ON deadlines ("UserId", "SourceType", "SourceId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911082607_AddHouseholdExpenseTracking') THEN
    CREATE INDEX "IX_household_expense_splits_MemberId" ON household_expense_splits ("MemberId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911082607_AddHouseholdExpenseTracking') THEN
    CREATE UNIQUE INDEX "IX_household_expenses_BankTransactionId" ON household_expenses ("BankTransactionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911082607_AddHouseholdExpenseTracking') THEN
    CREATE INDEX "IX_household_expenses_BudgetId" ON household_expenses ("BudgetId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911082607_AddHouseholdExpenseTracking') THEN
    CREATE INDEX "IX_household_expenses_CreatedByUserId" ON household_expenses ("CreatedByUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911082607_AddHouseholdExpenseTracking') THEN
    CREATE INDEX "IX_household_expenses_HouseholdId_OccurredOn" ON household_expenses ("HouseholdId", "OccurredOn");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911082607_AddHouseholdExpenseTracking') THEN
    ALTER TABLE household_contracts ADD CONSTRAINT "FK_household_contracts_documents_SourceDocumentId" FOREIGN KEY ("SourceDocumentId") REFERENCES documents ("Id") ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911082607_AddHouseholdExpenseTracking') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260911082607_AddHouseholdExpenseTracking', '10.0.11');
    END IF;
END $EF$;
COMMIT;

