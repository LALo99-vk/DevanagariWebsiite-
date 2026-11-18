-- Contact page messages (run once in the Supabase SQL editor)
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
    email TEXT NOT NULL CHECK (char_length(email) BETWEEN 3 AND 200),
    topic TEXT CHECK (topic IN ('Product Questions', 'Order Support', 'Bulk Orders')),
    message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'replied', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone (signed in or not) may send a message; they cannot read others'
DROP POLICY IF EXISTS "Anyone can send a contact message" ON public.contact_messages;
CREATE POLICY "Anyone can send a contact message" ON public.contact_messages
    FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Only admins can read and manage messages
DROP POLICY IF EXISTS "Admins can manage contact messages" ON public.contact_messages;
CREATE POLICY "Admins can manage contact messages" ON public.contact_messages
    FOR ALL USING (public.is_admin_by_role());
