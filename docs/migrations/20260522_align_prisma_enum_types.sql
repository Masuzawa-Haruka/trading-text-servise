-- Align existing Supabase enum column types with Prisma's mapped enum type names.
-- Older environments may have snake_case enum types on existing tables, while the
-- Prisma schema and docs/supabase_schema.sql use quoted PascalCase enum types.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'UserStatus') THEN
        CREATE TYPE public."UserStatus" AS ENUM ('active', 'warning', 'suspended');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'ItemStatus') THEN
        CREATE TYPE public."ItemStatus" AS ENUM ('available', 'matching', 'completed', 'canceled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'ItemCondition') THEN
        CREATE TYPE public."ItemCondition" AS ENUM ('new', 'used_good', 'used_bad');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'TransactionStatus') THEN
        CREATE TYPE public."TransactionStatus" AS ENUM ('proposing', 'scheduled', 'completed', 'canceled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'ProposalStatus') THEN
        CREATE TYPE public."ProposalStatus" AS ENUM ('pending', 'accepted', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'OfferStatus') THEN
        CREATE TYPE public."OfferStatus" AS ENUM ('pending', 'accepted', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'EvaluationType') THEN
        CREATE TYPE public."EvaluationType" AS ENUM ('good', 'bad', 'cancel', 'no_show');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'NotificationType') THEN
        CREATE TYPE public."NotificationType" AS ENUM ('action_required', 'info');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'CancellationStatus') THEN
        CREATE TYPE public."CancellationStatus" AS ENUM ('pending', 'accepted', 'rejected');
    END IF;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'status'
          AND udt_name <> 'UserStatus'
    ) THEN
        ALTER TABLE public.users ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE public.users ALTER COLUMN status TYPE public."UserStatus" USING status::text::public."UserStatus";
        ALTER TABLE public.users ALTER COLUMN status SET DEFAULT 'active'::public."UserStatus";
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'items'
          AND column_name = 'condition'
          AND udt_name <> 'ItemCondition'
    ) THEN
        ALTER TABLE public.items ALTER COLUMN condition DROP DEFAULT;
        ALTER TABLE public.items ALTER COLUMN condition TYPE public."ItemCondition" USING condition::text::public."ItemCondition";
        ALTER TABLE public.items ALTER COLUMN condition SET DEFAULT 'new'::public."ItemCondition";
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'items'
          AND column_name = 'status'
          AND udt_name <> 'ItemStatus'
    ) THEN
        ALTER TABLE public.items ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE public.items ALTER COLUMN status TYPE public."ItemStatus" USING status::text::public."ItemStatus";
        ALTER TABLE public.items ALTER COLUMN status SET DEFAULT 'available'::public."ItemStatus";
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'transactions'
          AND column_name = 'status'
          AND udt_name <> 'TransactionStatus'
    ) THEN
        ALTER TABLE public.transactions ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE public.transactions ALTER COLUMN status TYPE public."TransactionStatus" USING status::text::public."TransactionStatus";
        ALTER TABLE public.transactions ALTER COLUMN status SET DEFAULT 'proposing'::public."TransactionStatus";
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'schedule_proposals'
          AND column_name = 'status'
          AND udt_name <> 'ProposalStatus'
    ) THEN
        ALTER TABLE public.schedule_proposals ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE public.schedule_proposals ALTER COLUMN status TYPE public."ProposalStatus" USING status::text::public."ProposalStatus";
        ALTER TABLE public.schedule_proposals ALTER COLUMN status SET DEFAULT 'pending'::public."ProposalStatus";
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'schedule_candidates'
          AND column_name = 'status'
          AND udt_name <> 'ProposalStatus'
    ) THEN
        ALTER TABLE public.schedule_candidates ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE public.schedule_candidates ALTER COLUMN status TYPE public."ProposalStatus" USING status::text::public."ProposalStatus";
        ALTER TABLE public.schedule_candidates ALTER COLUMN status SET DEFAULT 'pending'::public."ProposalStatus";
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'price_offers'
          AND column_name = 'status'
          AND udt_name <> 'OfferStatus'
    ) THEN
        ALTER TABLE public.price_offers ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE public.price_offers ALTER COLUMN status TYPE public."OfferStatus" USING status::text::public."OfferStatus";
        ALTER TABLE public.price_offers ALTER COLUMN status SET DEFAULT 'pending'::public."OfferStatus";
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'evaluations'
          AND column_name = 'type'
          AND udt_name <> 'EvaluationType'
    ) THEN
        ALTER TABLE public.evaluations ALTER COLUMN type TYPE public."EvaluationType" USING type::text::public."EvaluationType";
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notifications'
          AND column_name = 'type'
          AND udt_name <> 'NotificationType'
    ) THEN
        ALTER TABLE public.notifications ALTER COLUMN type TYPE public."NotificationType" USING type::text::public."NotificationType";
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'cancellation_requests'
          AND column_name = 'status'
          AND udt_name <> 'CancellationStatus'
    ) THEN
        ALTER TABLE public.cancellation_requests ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE public.cancellation_requests ALTER COLUMN status TYPE public."CancellationStatus" USING status::text::public."CancellationStatus";
        ALTER TABLE public.cancellation_requests ALTER COLUMN status SET DEFAULT 'pending'::public."CancellationStatus";
    END IF;
END;
$$;
