-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create or replace the user registration handler with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  customer_role_id uuid;
BEGIN
  -- Get customer role ID first to avoid nested transactions
  SELECT id INTO customer_role_id
  FROM roles
  WHERE name = 'customer';

  IF customer_role_id IS NULL THEN
    -- Create customer role if it doesn't exist
    INSERT INTO roles (name, description)
    VALUES ('customer', '普通客户')
    RETURNING id INTO customer_role_id;
  END IF;

  -- Create user profile
  INSERT INTO user_profiles (
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

  -- Create user cart
  INSERT INTO carts (user_id)
  VALUES (NEW.id);

  -- Assign customer role (if not admin)
  IF NEW.email != 'admin@sijoer.com' THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (NEW.id, customer_role_id);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error details
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT SELECT, INSERT ON public.user_profiles TO authenticated, anon;
GRANT SELECT, INSERT ON public.carts TO authenticated, anon;
GRANT SELECT, INSERT ON public.user_roles TO authenticated, anon;
GRANT SELECT ON public.roles TO authenticated, anon;

-- Ensure the function has proper permissions
ALTER FUNCTION handle_new_user() OWNER TO postgres;