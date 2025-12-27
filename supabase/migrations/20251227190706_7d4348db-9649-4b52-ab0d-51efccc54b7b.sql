-- Add admin role for paymenttester2000@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('a16d68b1-9d8b-4476-b32a-bf90f10511dd', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;