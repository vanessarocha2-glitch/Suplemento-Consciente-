-- URL da imagem da tabela nutricional, exibida no carrossel da listagem
-- e na página de detalhe do suplemento. Vazia quando não houver imagem.
alter table supplements
  add column nutrition_table_url text;
