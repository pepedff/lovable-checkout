-- ====================================================================
-- LOVABLEUNLIMITED — SCHEMA DE ENTREGAS, AUDITORIA E CUSTOMIZADOR VISUAL
-- Execute este script no SQL Editor do seu Supabase Dashboard
-- ====================================================================

-- 1. Colunas na tabela 'orders' para controle de entrega e auditoria
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS delivery_type text,
ADD COLUMN IF NOT EXISTS delivery_payload text,
ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
ADD COLUMN IF NOT EXISTS delivered_by text,
ADD COLUMN IF NOT EXISTS free_balance_granted boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS audit_log jsonb DEFAULT '[]'::jsonb;

-- 2. Colunas na tabela 'settings' para o Editor Visual da Página de Entrega
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS delivery_page_config jsonb,
ADD COLUMN IF NOT EXISTS delivery_page_draft jsonb;

-- 3. Atualizar pedidos antigos que já estavam aprovados como 'delivered'
UPDATE orders 
SET delivery_status = 'delivered', 
    payment_status = 'payment_confirmed'
WHERE status = 'approved' AND (delivery_status IS NULL OR delivery_status = 'pending');
