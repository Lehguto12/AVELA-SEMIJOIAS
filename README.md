# AVELA Semijoias: loja virtual

Vitrine simples em HTML, CSS e JavaScript puro. Os produtos vêm de uma planilha do Google Sheets e o pedido é finalizado pelo WhatsApp. Não precisa de servidor nem de banco de dados.

## Estrutura

```
avela_semijoias/
├── index.html      # Vitrine: banner, destaques, filtros e catálogo
├── produto.html    # Detalhes do produto (produto.html?id=3)
├── carrinho.html   # Carrinho e envio do pedido ao WhatsApp
├── style.css       # Estilos (bordô, chumbo, branco e dourado)
├── script.js       # Catálogo, favoritos, carrinho e WhatsApp
└── README.md
```

## Como abrir no VSCode

1. Abra a pasta `avela_semijoias` no VSCode (Arquivo > Abrir Pasta).
2. Instale a extensão **Live Server** (Ritwick Dey).
3. Clique com o botão direito em `index.html` e escolha **Open with Live Server**.

Prefira o Live Server a abrir o arquivo com duplo clique: a leitura da planilha funciona melhor num endereço `http://`.

## Configuração (só no começo do `script.js`)

```js
const CONFIG = {
  WHATSAPP_NUMERO: "5511999999999",   // 55 + DDD + número, só dígitos
  PLANILHA_CSV_URL: "",               // link CSV da planilha (próxima seção)
};
```

Com `PLANILHA_CSV_URL` vazio, a loja mostra 8 produtos de exemplo. Assim você vê o site funcionando antes de montar a planilha.

## Planilha do Google Sheets

Crie uma planilha com **esta linha de cabeçalho exatamente** na linha 1:

| ID | Nome | Categoria | Preço | Imagem_URL | Descrição | Destaque |
|----|------|-----------|-------|------------|-----------|----------|
| 1 | Brinco Argola Lisa | Aço Inox | 49,90 | https://... | Argola lisa em aço inox. | Sim |
| 2 | Colar Ponto de Luz | Pratas | 129,90 | https://... | Corrente delicada. | Não |

Regras:

- **ID**: único para cada produto (1, 2, 3...). Não repita.
- **Categoria**: use `Aço Inox`, `Pratas` ou `Personalizados`, igual aos filtros da vitrine.
- **Preço**: pode ser `49,90`, `49.90` ou `R$ 49,90`.
- **Imagem_URL**: link direto da foto. Se ficar vazio ou quebrar, aparece uma imagem padrão.
- **Destaque**: `Sim` coloca o produto na seção Destaques (até 4 aparecem).

### Publicar a planilha

1. Na planilha: **Arquivo > Compartilhar > Publicar na Web**.
2. Escolha a aba com os produtos e o formato **Valores separados por vírgula (.csv)**.
3. Clique em **Publicar** e copie o link gerado.
4. Cole o link em `PLANILHA_CSV_URL` no `script.js`.

Depois disso, qualquer alteração na planilha aparece no site (o Google pode levar alguns minutos para atualizar o link publicado).

### Fotos dos produtos

- No Google Drive: compartilhe a foto como "Qualquer pessoa com o link" e use `https://drive.google.com/thumbnail?id=ID_DO_ARQUIVO&sz=w800`, trocando `ID_DO_ARQUIVO` pelo trecho do link de compartilhamento que fica entre `/d/` e `/view`.
- Também funciona qualquer hospedagem de imagens que dê um link direto (termina em .jpg, .png ou .webp).

## Como funciona o pedido pelo WhatsApp

No carrinho, a cliente informa nome e observações (por exemplo, o nome para gravação nas peças personalizadas) e clica em **Finalizar pelo WhatsApp**. O site abre o WhatsApp da loja com uma mensagem assim:

```
Olá! Gostaria de fazer um pedido na AVELA Semijoias:

• 2x Brinco Argola Lisa - R$ 99,80
• 1x Colar com Nome - R$ 99,90

Total: R$ 199,70

Nome: Maria
Observações: nome Maria, corrente 45 cm
```

Pagamento e entrega ficam combinados na conversa.

## Observações

- Carrinho e favoritos ficam salvos no navegador da cliente (`localStorage`). Não há login.
- Para trocar as cores, edite as variáveis no começo do `style.css` (seção `:root`).
- Para publicar o site na internet, serviços gratuitos como Netlify, Vercel ou GitHub Pages aceitam esta pasta como está.
