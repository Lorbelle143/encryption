# Encrypted Storage for Office Forms

React + Ionic + Supabase application for secure office records management.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a Supabase project at https://supabase.com

3. Set up your database with this SQL:

```sql
-- Create user roles table
CREATE TABLE user_roles (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'STAFF', 'VIEWER')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create forms table
CREATE TABLE forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  form_type TEXT NOT NULL,
  classification TEXT NOT NULL,
  notes TEXT,
  file_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only admins can view forms
CREATE POLICY "Only admins can view forms"
  ON forms FOR SELECT
  USING (is_admin());

-- Only admins can insert forms
CREATE POLICY "Only admins can insert forms"
  ON forms FOR INSERT
  WITH CHECK (is_admin());

-- Only admins can update forms
CREATE POLICY "Only admins can update forms"
  ON forms FOR UPDATE
  USING (is_admin());

-- Only admins can delete forms
CREATE POLICY "Only admins can delete forms"
  ON forms FOR DELETE
  USING (is_admin());

-- Users can view their own role
CREATE POLICY "Users can view their own role"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('office-forms', 'office-forms', false);

-- Only admins can upload files
CREATE POLICY "Only admins can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'office-forms' AND 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

-- Only admins can download files
CREATE POLICY "Only admins can download files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'office-forms' AND 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

-- Only admins can delete files
CREATE POLICY "Only admins can delete files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'office-forms' AND 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

-- Insert your admin user (replace with your actual user email after signup)
-- First sign up in the app, then run this with your user ID:
-- INSERT INTO user_roles (user_id, role) 
-- VALUES ('your-user-id-here', 'ADMIN');
```

4. Copy `.env.example` to `.env` and add your Supabase credentials

5. Run the app:
```bash
npm run dev
```

## Features

- Secure authentication with Supabase Auth
- Encrypted file storage with Supabase Storage
- Role-based access control with RLS
- Classification levels (Public, Internal, Confidential, Restricted)
- Mobile-responsive UI with Ionic Framework
- File upload and download functionality

## Security

- All data encrypted at rest by Supabase
- Row Level Security (RLS) policies enforce access control
- User authentication required for all operations
- Classification-based data protection
