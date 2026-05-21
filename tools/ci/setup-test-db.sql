CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
END;
$$;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), current_user)
$$;

CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY,
    instance_id UUID,
    aud VARCHAR,
    role VARCHAR,
    email VARCHAR UNIQUE,
    encrypted_password VARCHAR,
    email_confirmed_at TIMESTAMPTZ,
    raw_app_meta_data JSONB DEFAULT '{}'::jsonb,
    raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
