-- Map existing categories to the appropriate chart of accounts where
-- they haven't been manually assigned.

-- Income categories
UPDATE categories c
  SET chart_of_account_id = coa.id
FROM chart_of_accounts coa
WHERE c.chart_of_account_id IS NULL
  AND c.tenant_id = coa.tenant_id
  AND c.type = 'income_transaction'
  AND c.code = 'tithe'
  AND coa.code = '4101';

UPDATE categories c
  SET chart_of_account_id = coa.id
FROM chart_of_accounts coa
WHERE c.chart_of_account_id IS NULL
  AND c.tenant_id = coa.tenant_id
  AND c.type = 'income_transaction'
  AND c.code = 'first_fruit_offering'
  AND coa.code = '4102';

UPDATE categories c
  SET chart_of_account_id = coa.id
FROM chart_of_accounts coa
WHERE c.chart_of_account_id IS NULL
  AND c.tenant_id = coa.tenant_id
  AND c.type = 'income_transaction'
  AND c.code = 'love_offering'
  AND coa.code = '4201';

UPDATE categories c
  SET chart_of_account_id = coa.id
FROM chart_of_accounts coa
WHERE c.chart_of_account_id IS NULL
  AND c.tenant_id = coa.tenant_id
  AND c.type = 'income_transaction'
  AND c.code IN ('mission_offering','mission_pledge')
  AND coa.code = '4202';

UPDATE categories c
  SET chart_of_account_id = coa.id
FROM chart_of_accounts coa
WHERE c.chart_of_account_id IS NULL
  AND c.tenant_id = coa.tenant_id
  AND c.type = 'income_transaction'
  AND c.code = 'building_offering'
  AND coa.code = '4203';

UPDATE categories c
  SET chart_of_account_id = coa.id
FROM chart_of_accounts coa
WHERE c.chart_of_account_id IS NULL
  AND c.tenant_id = coa.tenant_id
  AND c.type = 'income_transaction'
  AND c.code = 'lot_offering'
  AND coa.code = '4204';

UPDATE categories c
  SET chart_of_account_id = coa.id
FROM chart_of_accounts coa
WHERE c.chart_of_account_id IS NULL
  AND c.tenant_id = coa.tenant_id
  AND c.type = 'income_transaction'
  AND c.code = 'other'
  AND coa.code = '4700';

-- Expense categories
UPDATE categories c
  SET chart_of_account_id = coa.id
FROM chart_of_accounts coa
WHERE c.chart_of_account_id IS NULL
  AND c.tenant_id = coa.tenant_id
  AND c.type = 'expense_transaction'
  AND c.code = 'ministry_expense'
  AND coa.code = '5100';

UPDATE categories c
  SET chart_of_account_id = coa.id
FROM chart_of_accounts coa
WHERE c.chart_of_account_id IS NULL
  AND c.tenant_id = coa.tenant_id
  AND c.type = 'expense_transaction'
  AND c.code = 'payroll'
  AND coa.code = '5200';

UPDATE categories c
  SET chart_of_account_id = coa.id
FROM chart_of_accounts coa
WHERE c.chart_of_account_id IS NULL
  AND c.tenant_id = coa.tenant_id
  AND c.type = 'expense_transaction'
  AND c.code = 'utilities'
  AND coa.code = '5301';

UPDATE categories c
  SET chart_of_account_id = coa.id
FROM chart_of_accounts coa
WHERE c.chart_of_account_id IS NULL
  AND c.tenant_id = coa.tenant_id
  AND c.type = 'expense_transaction'
  AND c.code = 'maintenance'
  AND coa.code = '5302';

UPDATE categories c
  SET chart_of_account_id = coa.id
FROM chart_of_accounts coa
WHERE c.chart_of_account_id IS NULL
  AND c.tenant_id = coa.tenant_id
  AND c.type = 'expense_transaction'
  AND c.code = 'events'
  AND coa.code = '5500';

UPDATE categories c
  SET chart_of_account_id = coa.id
FROM chart_of_accounts coa
WHERE c.chart_of_account_id IS NULL
  AND c.tenant_id = coa.tenant_id
  AND c.type = 'expense_transaction'
  AND c.code = 'missions'
  AND coa.code = '5106';

UPDATE categories c
  SET chart_of_account_id = coa.id
FROM chart_of_accounts coa
WHERE c.chart_of_account_id IS NULL
  AND c.tenant_id = coa.tenant_id
  AND c.type = 'expense_transaction'
  AND c.code = 'education'
  AND coa.code = '5600';

UPDATE categories c
  SET chart_of_account_id = coa.id
FROM chart_of_accounts coa
WHERE c.chart_of_account_id IS NULL
  AND c.tenant_id = coa.tenant_id
  AND c.type = 'expense_transaction'
  AND c.code = 'other'
  AND coa.code = '5900';
