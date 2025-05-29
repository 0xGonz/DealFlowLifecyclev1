-- Add partially_paid status to capital calls table
ALTER TABLE capital_calls
ALTER COLUMN status TYPE TEXT USING status::TEXT;

-- Ensure the status can now accept 'partially_paid'
-- Update any partial payments to use the new status
UPDATE capital_calls 
SET status = 'partially_paid'
WHERE status = 'partial' 
AND paid_amount > 0 
AND outstanding_amount > 0;