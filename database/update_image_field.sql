-- SQL para atualizar o campo imagem_url para suportar data URIs
-- Execute este comando no seu banco de dados MySQL

-- Verificar o tipo atual do campo
DESCRIBE fichas_npc;

-- Alterar o campo para MEDIUMTEXT para suportar data URIs grandes
ALTER TABLE fichas_npc 
MODIFY COLUMN imagem_url MEDIUMTEXT;

-- Verificar a mudança
DESCRIBE fichas_npc;
