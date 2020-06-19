-- Generic function for preventing updates to any immutable data:
CREATE OR REPLACE FUNCTION fn_prevent_update() RETURNS trigger AS $$
    BEGIN
        RAISE EXCEPTION 'UPDATE is not allowed to that column/table.';
    END;
$$ LANGUAGE plpgsql;



-- Users table
CREATE TABLE users (
    id bigserial PRIMARY KEY,
    -- User's first name, e.g. "Braden"
    short_name varchar(150) NOT NULL,
    email varchar(500) NOT NULL CHECK (email LIKE '%@%'),
    password text NOT NULL,
    created timestamp WITH TIME ZONE NOT NULL DEFAULT NOW() CHECK(EXTRACT(TIMEZONE FROM created) = '0')
);
-- Emails are stored as case-sensititve but must be unique in a case-insensitive constraint
-- and can be efficiently searched using this case-insensitive index:
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));
CREATE TRIGGER trg_prevent_update__users_created BEFORE UPDATE OF created ON users
    FOR EACH ROW EXECUTE PROCEDURE fn_prevent_update();

CREATE FUNCTION user_by_email(text) RETURNS users AS $$
    SELECT * FROM users WHERE lower(email) = lower($1);
$$ LANGUAGE SQL;

-- Budget table
-- This table stores metadata about budgets.
-- The metadata is very limited as most data is stored within the 'data' field of the budget_data table.
CREATE TABLE budget_metadata (
    id bigserial PRIMARY KEY,
    owner bigint NOT NULL REFERENCES users,
    -- Whenever a client (e.g. a web browser) opens the budget, this open count is atomically
    -- incremented. Clients can create new entries in the budget with an ID prefixed by
    -- open_count * 1000000 and be guaranteed that if that ID doesn't yet exist in their local
    -- copy of the budget, that ID can safely be used without any risk of conflicts with other
    -- concurrent users/sessions.
    open_count bigint NOT NULL DEFAULT 0,
    created timestamp WITH TIME ZONE NOT NULL DEFAULT NOW() CHECK(EXTRACT(TIMEZONE FROM created) = '0')
);


-- Budget data table
-- Stores the actual data that comprises the budget.
-- To provide a simple backup of past budget versions, the table is keyed by date.
-- There should be a unique (budget_id, change_date) entry pair for any day on which the
-- budget in question was modified.
CREATE TABLE budget_data (
    budget_id bigint NOT NULL REFERENCES budget_metadata,
    change_date date NOT NULL DEFAULT CURRENT_DATE,
    change_time time WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIME CHECK(EXTRACT(TIMEZONE FROM change_time) = '0'),
    data jsonb NOT NULL,
    PRIMARY KEY (budget_id, change_date),
    CHECK ((data->>'id')::bigint = budget_id)
);


-- Budget changelog table
-- This table stores a complete history of all changes made to each budget.
CREATE TABLE budget_changelog (
    id bigserial PRIMARY KEY,
    budget_id bigint NOT NULL REFERENCES budget_metadata,
    changed_at timestamp WITH TIME ZONE NOT NULL DEFAULT NOW() CHECK(EXTRACT(TIMEZONE FROM changed_at) = '0'),
    action jsonb NOT NULL
);
CREATE TRIGGER budget_changelog_is_append_only BEFORE UPDATE ON budget_changelog
    FOR EACH ROW EXECUTE PROCEDURE fn_prevent_update();


-- Main view of budgets
CREATE VIEW budgets AS
    SELECT
        id,
        owner,
        open_count,
        created,
        (change_date + change_time) AS updated,
        COALESCE(version, 0) AS version,
        data->>'name' AS name,
        (data->>'startDate')::int AS start_date,
        (data->>'endDate')::int AS end_date,
        data
    FROM budget_metadata m
    LEFT JOIN (
        SELECT DISTINCT ON (budget_id)
            *
        FROM budget_data
        ORDER BY budget_id, change_date DESC
    ) d ON d.budget_id = m.id
    LEFT JOIN (
        SELECT DISTINCT ON (budget_id)
            id AS version,
            budget_id
        FROM budget_changelog
        ORDER BY budget_id, id DESC
    ) as c ON c.budget_id = m.id
    ORDER BY updated DESC;


-- Email validated actions
-- This table is used in three cases:
-- 1) For user registration: users enter *only* their email address;
--    upon receiving a link in their email, they click it, then complete
--    the registration form. The entry in 'users' is only created
--    after their email address has been verified.
--    In these cases, 'user' is NULL.
-- 2) When an existing user wishes to change their email address.
--    In this case, 'email' will not match 'user.email'
-- 3) When an existing user has forgotten their password and wants to reset it.
--    In this case, 'email' will match 'user.email'
--
-- Email addresses in this table are not necessarily unique - this is to allow
-- users to retry registration or password resets in the event of an email delivery
-- error.
CREATE TABLE email_validated_action (
    "user" bigint NULL REFERENCES users(id) ON DELETE CASCADE,
    email varchar(500) NOT NULL CHECK (email LIKE '%@%'),
    code uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    expires timestamp WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '72 hours') CHECK(EXTRACT(TIMEZONE FROM expires) = '0')
);
-- Do not allow inserting email addresses that belong to an existing user:
CREATE OR REPLACE FUNCTION fn_check_email_doesnt_exist() RETURNS trigger AS $$
    BEGIN
        -- Clean up old rows of the email_validated_action table
        DELETE FROM email_validated_action WHERE expires <= NOW();
        -- Check that the email is not already taken
        PERFORM 1 FROM users WHERE lower(email)=lower(NEW.email) AND (NEW.user IS NULL OR NEW.user != users.id);
        IF FOUND THEN
            RAISE EXCEPTION 'A user account with that email address already exists';
        END IF;
        RETURN NEW;
    END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_check_email_doesnt_exist BEFORE INSERT ON email_validated_action
    FOR EACH ROW EXECUTE PROCEDURE fn_check_email_doesnt_exist();
-- This table is immutable:
CREATE TRIGGER trg_prevent_update__email_validated_action BEFORE UPDATE ON email_validated_action
    FOR EACH ROW EXECUTE PROCEDURE fn_prevent_update();
