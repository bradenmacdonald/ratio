-- Atomically increment the open_count of a budget.
-- Whenever a client (e.g. a web browser) opens the budget, this open count is atomically
-- incremented. Clients can create new entries in the budget with an ID prefixed by
-- open_count * 1000000 and be guaranteed that if that ID doesn't yet exist in their local
-- copy of the budget, that ID can safely be used without any risk of conflicts with other
-- concurrent users/sessions.

UPDATE budget_metadata SET open_count = open_count + 1 WHERE id = $1 RETURNING open_count;
