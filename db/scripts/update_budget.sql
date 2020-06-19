-- update_budget(data, action):
--
-- Any changes to budget data should be made using this script.
--
-- To save a new budget, create the metadata entry, then call
--  update_budget(data, null)
--
-- To update an existing budget, call
--  update_budget(data, action)
-- where action is the redux action (a JSON object) that represents the change.
--

WITH upd AS (
	INSERT INTO budget_data
		(budget_id, data)
	VALUES (($1::jsonb->>'id')::int, $1)
	ON CONFLICT (budget_id, change_date)
	DO UPDATE SET data = EXCLUDED.data
	RETURNING budget_id, change_date, change_time, $2::jsonb AS action
)
-- And create a changelog entry with the same change date/time, unless 'action' was null.
INSERT INTO budget_changelog
	(budget_id, changed_at, action)
SELECT budget_id, (change_date + change_time), action FROM upd WHERE action IS NOT NULL
RETURNING id AS change_id;
