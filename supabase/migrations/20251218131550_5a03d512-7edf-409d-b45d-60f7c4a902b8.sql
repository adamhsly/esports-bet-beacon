-- RLS policies for blog admin (adamhsly@googlemail.com)

-- Allow admin email to SELECT all posts (including drafts)
CREATE POLICY "Admin can view all blog posts"
ON public.blog_posts
FOR SELECT
TO authenticated
USING (auth.email() = 'adamhsly@googlemail.com');

-- Allow admin email to INSERT posts
CREATE POLICY "Admin can create blog posts"
ON public.blog_posts
FOR INSERT
TO authenticated
WITH CHECK (auth.email() = 'adamhsly@googlemail.com');

-- Allow admin email to UPDATE posts
CREATE POLICY "Admin can update blog posts"
ON public.blog_posts
FOR UPDATE
TO authenticated
USING (auth.email() = 'adamhsly@googlemail.com')
WITH CHECK (auth.email() = 'adamhsly@googlemail.com');

-- Allow admin email to DELETE posts
CREATE POLICY "Admin can delete blog posts"
ON public.blog_posts
FOR DELETE
TO authenticated
USING (auth.email() = 'adamhsly@googlemail.com');