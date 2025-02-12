-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create or replace the user registration handler with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create user profile with proper error handling
  BEGIN
    INSERT INTO public.user_profiles (
      id,
      display_name,
      phone,
      status,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        split_part(NEW.email, '@', 1)
      ),
      NEW.raw_user_meta_data->>'phone',
      'active',
      NOW(),
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
  END;

  -- Create user cart with proper error handling
  BEGIN
    INSERT INTO public.carts (user_id)
    VALUES (NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create user cart: %', SQLERRM;
  END;

  -- Assign customer role (if not admin) with proper error handling
  BEGIN
    IF NEW.email != 'admin@sijoer.com' THEN
      INSERT INTO public.user_roles (user_id, role_id)
      SELECT NEW.id, id FROM public.roles WHERE name = 'customer';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to assign user role: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger with proper error handling
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Ensure customer role exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'customer') THEN
    INSERT INTO public.roles (name, description)
    VALUES ('customer', '普通客户');
  END IF;
END $$;