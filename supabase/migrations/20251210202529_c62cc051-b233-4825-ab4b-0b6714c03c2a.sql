INSERT INTO public.user_roles (user_id, role)
VALUES ('cf1548dd-621c-48f5-9460-bf224e85e497', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;