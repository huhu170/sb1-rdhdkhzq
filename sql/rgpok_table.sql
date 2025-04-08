-- 创建RGP & OK镜内容表
CREATE TABLE IF NOT EXISTS public.rgpok_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    video_url TEXT,
    content TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 设置RLS策略
ALTER TABLE public.rgpok_contents ENABLE ROW LEVEL SECURITY;

-- 允许匿名用户和已登录用户读取内容
CREATE POLICY "允许任何人查看RGP&OK镜内容" ON public.rgpok_contents
    FOR SELECT USING (true);

-- 只允许管理员添加、修改和删除内容
CREATE POLICY "只允许管理员添加RGP&OK镜内容" ON public.rgpok_contents
    FOR INSERT WITH CHECK (auth.uid() IN (
        SELECT auth.uid() FROM public.users WHERE role = 'admin'
    ));

CREATE POLICY "只允许管理员修改RGP&OK镜内容" ON public.rgpok_contents
    FOR UPDATE USING (auth.uid() IN (
        SELECT auth.uid() FROM public.users WHERE role = 'admin'
    ));

CREATE POLICY "只允许管理员删除RGP&OK镜内容" ON public.rgpok_contents
    FOR DELETE USING (auth.uid() IN (
        SELECT auth.uid() FROM public.users WHERE role = 'admin'
    ));

-- 添加触发器以自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rgpok_contents_updated_at
BEFORE UPDATE ON public.rgpok_contents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 