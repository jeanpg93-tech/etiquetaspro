
-- Allow anon (publishable key) full access — single-tenant app without user auth.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO anon;

DROP POLICY IF EXISTS "anon full access products" ON public.products;
CREATE POLICY "anon full access products" ON public.products
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon full access api_keys" ON public.api_keys;
CREATE POLICY "anon full access api_keys" ON public.api_keys
  FOR ALL TO anon USING (true) WITH CHECK (true);
