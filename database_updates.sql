-- Database updates for vacation management and employee roll call capability

-- Create vacation masters table
CREATE TABLE IF NOT EXISTS app_9213e72257_vacation_masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  vacation_date DATE NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for vacation masters table
CREATE INDEX IF NOT EXISTS idx_vacation_employee_id ON app_9213e72257_vacation_masters(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacation_date ON app_9213e72257_vacation_masters(vacation_date);
CREATE INDEX IF NOT EXISTS idx_vacation_location ON app_9213e72257_vacation_masters(location);

-- Add roll_call_capable column to employees table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_9213e72257_employees' 
    AND column_name = 'roll_call_capable'
  ) THEN
    ALTER TABLE app_9213e72257_employees 
    ADD COLUMN roll_call_capable BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Update existing roll_call_capable values based on roll_call_duty
UPDATE app_9213e72257_employees 
SET roll_call_capable = CASE 
  WHEN roll_call_duty = '1' THEN TRUE
  WHEN roll_call_duty = '0' THEN FALSE
  ELSE FALSE
END
WHERE roll_call_capable IS NULL;

-- Create index for roll_call_capable column
CREATE INDEX IF NOT EXISTS idx_employees_roll_call_capable ON app_9213e72257_employees(roll_call_capable);

-- Add comments
COMMENT ON TABLE app_9213e72257_vacation_masters IS '休暇マスタテーブル - 従業員の休暇情報を管理';
COMMENT ON COLUMN app_9213e72257_employees.roll_call_capable IS '点呼対応可能フラグ - 従業員が点呼業務に対応可能かどうか';

-- Create function to sync roll_call_duty and roll_call_capable
CREATE OR REPLACE FUNCTION sync_roll_call_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- When roll_call_duty changes, update roll_call_capable
  IF OLD.roll_call_duty IS DISTINCT FROM NEW.roll_call_duty THEN
    NEW.roll_call_capable = CASE 
      WHEN NEW.roll_call_duty = '1' THEN TRUE
      WHEN NEW.roll_call_duty = '0' THEN FALSE
      ELSE FALSE
    END;
  END IF;
  
  -- When roll_call_capable changes, update roll_call_duty
  IF OLD.roll_call_capable IS DISTINCT FROM NEW.roll_call_capable THEN
    NEW.roll_call_duty = CASE 
      WHEN NEW.roll_call_capable = TRUE THEN '1'
      WHEN NEW.roll_call_capable = FALSE THEN '0'
      ELSE ''
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync the fields
DROP TRIGGER IF EXISTS trigger_sync_roll_call_fields ON app_9213e72257_employees;
CREATE TRIGGER trigger_sync_roll_call_fields
  BEFORE UPDATE ON app_9213e72257_employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_roll_call_fields();

