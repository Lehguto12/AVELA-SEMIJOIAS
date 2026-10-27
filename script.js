/* =========================================================
   AVELA SEMIJOIAS - script.js
   Catálogo (Google Sheets), favoritos, carrinho e WhatsApp.
   Um único arquivo para as 3 páginas: o <body data-pagina="...">
   diz qual parte do código deve rodar.
   ========================================================= */

/* ---------------------------------------------------------
   1. CONFIGURAÇÃO (é aqui que você mexe)
   --------------------------------------------------------- */
const CONFIG = {
  // Número do WhatsApp da loja: código do país + DDD + número, só dígitos.
  // Exemplo: 55 (Brasil) + 11 (DDD) + 999999999
  WHATSAPP_NUMERO: "5511945375821",

  // Link CSV da planilha publicada (veja o README, passo a passo).
  // Deixe vazio ("") para usar os produtos de exemplo abaixo.
  PLANILHA_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTwdStz24CSa24b4LzwfQuXSUj58_HivRAXlYp_fpjhLN3ZLJZ-axs8bKSXPC1XoJ9f7LfZ_H-n6OLX/pub?gid=0&single=true&output=csv",
};

/* Produtos de exemplo: usados quando PLANILHA_CSV_URL está vazio
   ou quando a planilha não carrega. Têm o mesmo formato da planilha. */
const PRODUTOS_EXEMPLO = [
  { id: "1", nome: "Brinco Argola Lisa", categoria: "Aço Inox", preco: 49.9, imagem: "", descricao: "Argola lisa em aço inox, não escurece e não perde o brilho. Ideal para o dia a dia.", destaque: true },
  { id: "2", nome: "Colar Ponto de Luz", categoria: "Pratas", preco: 129.9, imagem: "", descricao: "Corrente delicada com pingente de ponto de luz. Prata com acabamento polido.", destaque: true },
  { id: "3", nome: "Pulseira Riviera", categoria: "Aço Inox", preco: 79.9, imagem: "", descricao: "Pulseira com zircônias, fecho seguro e ajuste de tamanho.", destaque: false },
  { id: "4", nome: "Anel Solitário", categoria: "Pratas", preco: 159.9, imagem: "", descricao: "Anel solitário clássico, perfeito para presentear.", destaque: true },
  { id: "5", nome: "Colar com Nome", categoria: "Personalizados", preco: 99.9, imagem: "", descricao: "Colar com o nome que você escolher. Informe o nome nas observações do pedido.", destaque: true },
  { id: "6", nome: "Pulseira com Inicial", categoria: "Personalizados", preco: 89.9, imagem: "", descricao: "Pulseira com a letra inicial de quem você ama. Informe a letra nas observações.", destaque: false },
  { id: "7", nome: "Corrente Cartier", categoria: "Aço Inox", preco: 69.9, imagem: "", descricao: "Corrente de elos em aço inox. Combina sozinha ou com pingentes.", destaque: false },
  { id: "8", nome: "Brinco Ear Cuff", categoria: "Pratas", preco: 59.9, imagem: "", descricao: "Brinco ear cuff que dispensa furo. Leve e confortável.", destaque: false },
];

/* ---------------------------------------------------------
   2. UTILITÁRIOS
   --------------------------------------------------------- */

/* Imagem usada quando o produto não tem foto (SVG simples em tom de bordô) */
const IMAGEM_PADRAO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#26262a"/>' +
    '<g fill="none" stroke="#7a2323" stroke-width="6" stroke-linejoin="round"><path d="M160 130h80l30 36-70 60-70-60z"/>' +
    '<path d="M130 166h140M180 130l-12 36 32 60M220 130l12 36-32 60"/></g></svg>'
  );

/* Imagens quebradas: o evento "error" não borbulha, por isso usamos a fase
   de captura (o "true" no final). */
document.addEventListener("error", (e) => {
  const img = e.target;
  if (img.tagName !== "IMG") return;

  // 1ª falha: tenta o outro formato de link do Drive
  const m = img.src.match(/googleusercontent\.com\/d\/([\w-]+)=w800/);
  if (m && !img.dataset.tentouAlt) {
    img.dataset.tentouAlt = "1";
    img.src = `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800`;
    return;
  }

  // 2ª falha: mostra a imagem padrão
  if (!img.dataset.fallback) {
    img.dataset.fallback = "1";
    img.src = IMAGEM_PADRAO;
  }
}, true);

/* Formata número como moeda brasileira: 49.9 vira "R$ 49,90" */
function formatarPreco(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* Evita que texto vindo da planilha quebre o HTML */
function escaparHTML(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/* Remove acentos e deixa minúsculo: "Aço Inox" vira "aco inox" (para comparar textos) */
function normalizar(texto) {
  return String(texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

/* Converte "R$ 1.299,90", "49,90" ou "49.90" em número */
function converterPreco(texto) {
  let t = String(texto ?? "").replace(/[^\d.,]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(t);
  return Number.isNaN(n) ? 0 : n;
}

/* Lê e grava no localStorage (guarda carrinho e favoritos no navegador) */
function lerArmazenado(chave, padrao) {
  try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; }
  catch { return padrao; }
}
function salvarArmazenado(chave, valor) {
  localStorage.setItem(chave, JSON.stringify(valor));
}

/* Aviso rápido no rodapé da tela */
let temporizadorToast;
function mostrarAviso(mensagem) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.textContent = mensagem;
  toast.classList.add("visivel");
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => toast.classList.remove("visivel"), 2200);
}

/* ---------------------------------------------------------
   2B. TEMA CLARO / ESCURO
   O tema fica no atributo data-tema do <html> e é lembrado no navegador.
   O visual de cada tema está no final do style.css.
   --------------------------------------------------------- */
const CHAVE_TEMA = "avela_tema"; // guarda "escuro" ou "claro"

function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
}

function alternarTema() {
  const novo = document.documentElement.dataset.tema === "claro" ? "escuro" : "claro";
  aplicarTema(novo);
  salvarArmazenado(CHAVE_TEMA, novo);
}

// Aplica o tema salvo assim que o script carrega (padrão: escuro, como a marca)
aplicarTema(lerArmazenado(CHAVE_TEMA, "escuro"));

/* ---------------------------------------------------------
   3. CATÁLOGO: leitura da planilha do Google Sheets
   --------------------------------------------------------- */

/* Transforma o texto CSV em uma lista de linhas (cada linha é uma lista de colunas).
   Trata campos entre aspas, que podem ter vírgula dentro. */
function lerCSV(texto) {
  const linhas = [];
  let linha = [], campo = "", dentroAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i], proximo = texto[i + 1];
    if (dentroAspas) {
      if (c === '"' && proximo === '"') { campo += '"'; i++; }
      else if (c === '"') dentroAspas = false;
      else campo += c;
    } else if (c === '"') dentroAspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && proximo === "\n") i++;
      linha.push(campo); campo = "";
      if (linha.some((x) => x.trim() !== "")) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some((x) => x.trim() !== "")) linhas.push(linha);
  return linhas;
}

/* Aceita qualquer link do Drive (compartilhar, thumbnail ou open) e devolve um link de imagem */
function ajustarLinkImagem(url) {
  const m = String(url).match(/drive\.google\.com\/(?:file\/d\/|thumbnail\?id=|open\?id=|uc\?[^ ]*?id=)([\w-]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}=w800` : url;
}

/* Converte as linhas do CSV em objetos de produto, usando o cabeçalho da planilha */
function csvParaProdutos(texto) {
  const [cabecalho, ...linhas] = lerCSV(texto);
  const colunas = cabecalho.map(normalizar); // id, nome, categoria, preco, imagem_url, descricao, destaque
  const pos = (nome) => colunas.indexOf(nome);

  return linhas
    .map((l) => ({
      id: (l[pos("id")] || "").trim(),
      nome: (l[pos("nome")] || "").trim(),
      categoria: (l[pos("categoria")] || "").trim(),
      preco: converterPreco(l[pos("preco")]),
      imagem: ajustarLinkImagem((l[pos("imagem_url")] || "").trim()),
      descricao: (l[pos("descricao")] || "").trim(),
      destaque: ["sim", "s", "true", "1", "x"].includes(normalizar(l[pos("destaque")])),
    }))
    .filter((p) => p.id && p.nome);
}

/* Busca os produtos (uma vez só por página) */
let cacheProdutos = null;
async function carregarProdutos() {
  if (cacheProdutos) return cacheProdutos;

  if (CONFIG.PLANILHA_CSV_URL) {
    try {
      const resposta = await fetch(CONFIG.PLANILHA_CSV_URL);
      if (!resposta.ok) throw new Error("Resposta " + resposta.status);
      const produtos = csvParaProdutos(await resposta.text());
      if (produtos.length) return (cacheProdutos = produtos);
    } catch (erro) {
      console.warn("Não foi possível ler a planilha. Usando produtos de exemplo.", erro);
    }
  }
  return (cacheProdutos = PRODUTOS_EXEMPLO);
}

/* ---------------------------------------------------------
   4. FAVORITOS E CARRINHO (guardados no navegador)
   --------------------------------------------------------- */
const CHAVE_FAVORITOS = "avela_favoritos"; // lista de ids
const CHAVE_CARRINHO = "avela_carrinho";   // lista de { id, qtd }

const obterFavoritos = () => lerArmazenado(CHAVE_FAVORITOS, []);
const ehFavorito = (id) => obterFavoritos().includes(id);

function alternarFavorito(id) {
  let favoritos = obterFavoritos();
  favoritos = favoritos.includes(id) ? favoritos.filter((f) => f !== id) : [...favoritos, id];
  salvarArmazenado(CHAVE_FAVORITOS, favoritos);
  atualizarContadores();
  return favoritos.includes(id);
}

const obterCarrinho = () => lerArmazenado(CHAVE_CARRINHO, []);

function adicionarAoCarrinho(id, qtd = 1) {
  const carrinho = obterCarrinho();
  const item = carrinho.find((i) => i.id === id);
  if (item) item.qtd += qtd;
  else carrinho.push({ id, qtd });
  salvarArmazenado(CHAVE_CARRINHO, carrinho);
  atualizarContadores();
}

function alterarQuantidade(id, diferenca) {
  let carrinho = obterCarrinho();
  const item = carrinho.find((i) => i.id === id);
  if (!item) return;
  item.qtd += diferenca;
  if (item.qtd <= 0) carrinho = carrinho.filter((i) => i.id !== id);
  salvarArmazenado(CHAVE_CARRINHO, carrinho);
  atualizarContadores();
}

function removerDoCarrinho(id) {
  salvarArmazenado(CHAVE_CARRINHO, obterCarrinho().filter((i) => i.id !== id));
  atualizarContadores();
}

/* ---------------------------------------------------------
   5. WHATSAPP: monta a mensagem do pedido
   --------------------------------------------------------- */

/* itens: lista de { produto, qtd } */
function montarLinkWhatsApp(itens, nomeCliente = "", observacoes = "") {
  const total = itens.reduce((soma, i) => soma + i.produto.preco * i.qtd, 0);

  const linhas = [
    "Olá! Gostaria de fazer um pedido na *AVELA Semijoias*:",
    "",
    ...itens.map((i) => `• ${i.qtd}x ${i.produto.nome} - ${formatarPreco(i.produto.preco * i.qtd)}`),
    "",
    `*Total: ${formatarPreco(total)}*`,
  ];
  if (nomeCliente) linhas.push("", `Nome: ${nomeCliente}`);
  if (observacoes) linhas.push(`Observações: ${observacoes}`);

  return `https://wa.me/${CONFIG.WHATSAPP_NUMERO}?text=${encodeURIComponent(linhas.join("\n"))}`;
}

/* ---------------------------------------------------------
   6. PEÇAS COMPARTILHADAS: ícones, cabeçalho, rodapé, card
   --------------------------------------------------------- */
const ICONE_CORACAO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.7 7.7 3.8 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.2 0 5.3 3.2 4.2 6.6-1.7 4.8-9.2 9.4-9.2 9.4z"/></svg>';
const ICONE_SACOLA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>';

const ICONE_SOL = '<svg class="icone-sol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg>';
const ICONE_LUA = '<svg class="icone-lua" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';

function montarCabecalho() {
  const el = document.getElementById("cabecalho");
  if (!el) return;
  el.innerHTML = `
    <header class="cabecalho">
      <div class="container cabecalho__interno">
        <a class="logo" href="index.html" aria-label="AVELA Semijoias, página inicial">
          <span class="logo__nome">AVELA</span>
          <span class="logo__sub">SEMIJOIAS</span>
        </a>
        <nav class="acoes" aria-label="Atalhos">
          <button class="icone-btn" id="btn-tema" type="button" aria-label="Alternar entre tema claro e escuro">
            ${ICONE_SOL}${ICONE_LUA}
          </button>
          <a class="icone-btn" href="index.html?filtro=favoritos#vitrine" aria-label="Favoritos">
            ${ICONE_CORACAO}<span class="badge" id="badge-fav" hidden>0</span>
          </a>
          <a class="icone-btn" href="carrinho.html" aria-label="Carrinho">
            ${ICONE_SACOLA}<span class="badge" id="badge-car" hidden>0</span>
          </a>
        </nav>
      </div>
    </header>`;

  document.getElementById("btn-tema").addEventListener("click", alternarTema);
}

function montarRodape() {
  const el = document.getElementById("rodape");
  if (!el) return;
  el.innerHTML = `
    <footer class="rodape">
      <div class="container rodape__interno">
        <strong>AVELA SEMIJOIAS</strong>
        <span>Guarulhos, SP. Compre pelo WhatsApp.</span>
      </div>
    </footer>`;
}

/* Atualiza os números nos ícones do cabeçalho */
function atualizarContadores() {
  const totalCarrinho = obterCarrinho().reduce((soma, i) => soma + i.qtd, 0);
  const totalFavoritos = obterFavoritos().length;
  const definir = (id, n) => {
    const badge = document.getElementById(id);
    if (!badge) return;
    badge.textContent = n;
    badge.hidden = n === 0;
  };
  definir("badge-car", totalCarrinho);
  definir("badge-fav", totalFavoritos);
}

/* HTML de um card de produto */
function htmlCard(p) {
  const id = escaparHTML(p.id);
  const link = `produto.html?id=${encodeURIComponent(p.id)}`;
  const fav = ehFavorito(p.id);
  return `
    <article class="card">
      <a class="card__img" href="${link}">
        <img src="${escaparHTML(p.imagem || IMAGEM_PADRAO)}" alt="${escaparHTML(p.nome)}" loading="lazy">
      </a>
      <button class="card__fav ${fav ? "ativo" : ""}" data-acao="favoritar" data-id="${id}"
        aria-pressed="${fav}" aria-label="${fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}">${ICONE_CORACAO}</button>
      <div class="card__corpo">
        <p class="card__cat">${escaparHTML(p.categoria)}</p>
        <h3 class="card__nome"><a href="${link}">${escaparHTML(p.nome)}</a></h3>
        <p class="card__preco">${formatarPreco(p.preco)}</p>
        <div class="card__botoes">
          <a class="btn btn--contorno" href="${link}">Ver detalhes</a>
          <button class="btn btn--bordo" data-acao="adicionar" data-id="${id}">Adicionar</button>
        </div>
      </div>
    </article>`;
}

/* Cliques nos botões dos cards (funciona mesmo para cards criados depois) */
function ativarAcoesDosCards(aoMudarFavoritos) {
  document.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-acao]");
    if (!botao) return;
    const id = botao.dataset.id;

    if (botao.dataset.acao === "adicionar") {
      adicionarAoCarrinho(id);
      mostrarAviso("Adicionado ao carrinho");
    }
    if (botao.dataset.acao === "favoritar") {
      alternarFavorito(id);
      if (aoMudarFavoritos) aoMudarFavoritos();
    }
  });
}

/* ---------------------------------------------------------
   7. PÁGINA INICIAL (index.html)
   --------------------------------------------------------- */
async function iniciarHome() {
  const produtos = await carregarProdutos();
  const grade = document.getElementById("grade");
  const vazio = document.getElementById("vazio");
  const botoes = document.querySelectorAll(".filtro");

  // Se veio do coração do cabeçalho (?filtro=favoritos), já abre nos favoritos
  const params = new URLSearchParams(location.search);
  let filtroAtual = params.get("filtro") === "favoritos" ? "favoritos" : "todos";

  // Destaques
  const destaques = produtos.filter((p) => p.destaque).slice(0, 4);
  if (destaques.length) {
    document.getElementById("grade-destaques").innerHTML = destaques.map(htmlCard).join("");
    document.getElementById("destaques").hidden = false;
  }

  // Catálogo filtrado
  function desenharVitrine() {
    let lista = produtos;
    if (filtroAtual === "favoritos") lista = produtos.filter((p) => ehFavorito(p.id));
    else if (filtroAtual !== "todos") lista = produtos.filter((p) => normalizar(p.categoria) === normalizar(filtroAtual));

    grade.innerHTML = lista.map(htmlCard).join("");
    vazio.hidden = lista.length > 0;
    if (!lista.length) {
      vazio.textContent = filtroAtual === "favoritos"
        ? "Você ainda não tem favoritos. Toque no coração de uma peça para guardá-la aqui."
        : "Nenhuma peça nesta categoria por enquanto.";
    }
    botoes.forEach((b) => b.classList.toggle("ativo", b.dataset.categoria === filtroAtual));
  }

  botoes.forEach((b) => b.addEventListener("click", () => {
    filtroAtual = b.dataset.categoria;
    desenharVitrine();
  }));

  // Ao favoritar, redesenha a vitrine e os destaques para atualizar os corações
  ativarAcoesDosCards(() => {
    desenharVitrine();
    document.getElementById("grade-destaques").innerHTML = destaques.map(htmlCard).join("");
  });

  desenharVitrine();
}

/* ---------------------------------------------------------
   8. PÁGINA DO PRODUTO (produto.html?id=...)
   --------------------------------------------------------- */
async function iniciarProduto() {
  const produtos = await carregarProdutos();
  const id = new URLSearchParams(location.search).get("id");
  const p = produtos.find((x) => x.id === id);
  const area = document.getElementById("produto");

  if (!p) {
    area.innerHTML = '<p class="vazio">Produto não encontrado.</p><a class="voltar" href="index.html">Voltar à vitrine</a>';
    return;
  }

  document.title = `${p.nome} | AVELA Semijoias`;
  let qtd = 1;

  function desenhar() {
    const fav = ehFavorito(p.id);
    area.innerHTML = `
      <div class="produto">
        <div class="produto__foto">
          <img src="${escaparHTML(p.imagem || IMAGEM_PADRAO)}" alt="${escaparHTML(p.nome)}">
        </div>
        <div class="produto__info">
          <p class="produto__cat">${escaparHTML(p.categoria)}</p>
          <h1>${escaparHTML(p.nome)}</h1>
          <p class="produto__preco">${formatarPreco(p.preco)}</p>
          <p class="produto__desc">${escaparHTML(p.descricao)}</p>

          <div class="qtd" aria-label="Quantidade">
            <button id="menos" aria-label="Diminuir quantidade">−</button>
            <span id="qtd-valor">${qtd}</span>
            <button id="mais" aria-label="Aumentar quantidade">+</button>
          </div>

          <div class="produto__acoes" style="margin-top:1.2rem">
            <button class="btn btn--bordo btn--grande" id="btn-adicionar">Adicionar ao carrinho</button>
            <a class="btn btn--contorno btn--grande" id="btn-comprar" href="#" target="_blank" rel="noopener">Comprar agora pelo WhatsApp</a>
            <button class="btn-fav ${fav ? "ativo" : ""}" id="btn-fav" aria-pressed="${fav}">
              ${ICONE_CORACAO} ${fav ? "Nos favoritos" : "Salvar nos favoritos"}
            </button>
          </div>
          <a class="voltar" href="index.html#vitrine">Voltar à vitrine</a>
        </div>
      </div>`;

    document.getElementById("menos").onclick = () => { qtd = Math.max(1, qtd - 1); atualizarQtd(); };
    document.getElementById("mais").onclick = () => { qtd += 1; atualizarQtd(); };
    document.getElementById("btn-adicionar").onclick = () => {
      adicionarAoCarrinho(p.id, qtd);
      mostrarAviso("Adicionado ao carrinho");
    };
    document.getElementById("btn-fav").onclick = () => { alternarFavorito(p.id); desenhar(); };
    atualizarQtd();
  }

  // Atualiza só o número e o link do WhatsApp (sem redesenhar a página toda)
  function atualizarQtd() {
    document.getElementById("qtd-valor").textContent = qtd;
    document.getElementById("btn-comprar").href = montarLinkWhatsApp([{ produto: p, qtd }]);
  }

  desenhar();

  // Sugestões da mesma categoria
  const relacionados = produtos.filter((x) => x.categoria === p.categoria && x.id !== p.id).slice(0, 4);
  if (relacionados.length) {
    document.getElementById("grade-relacionados").innerHTML = relacionados.map(htmlCard).join("");
    document.getElementById("relacionados").hidden = false;
  }
  ativarAcoesDosCards(() => {
    document.getElementById("grade-relacionados").innerHTML = relacionados.map(htmlCard).join("");
  });
}

/* ---------------------------------------------------------
   9. PÁGINA DO CARRINHO (carrinho.html)
   --------------------------------------------------------- */
async function iniciarCarrinho() {
  const produtos = await carregarProdutos();
  const areaItens = document.getElementById("itens");
  const resumo = document.getElementById("resumo");

  function desenhar() {
    // Junta cada item do carrinho com os dados do produto (ignora ids que não existem mais)
    const itens = obterCarrinho()
      .map((i) => ({ produto: produtos.find((p) => p.id === i.id), qtd: i.qtd }))
      .filter((i) => i.produto);

    if (!itens.length) {
      areaItens.innerHTML = '<p class="vazio">Seu carrinho está vazio. Escolha uma peça na vitrine.</p><a class="btn btn--bordo" href="index.html#vitrine">Ver a vitrine</a>';
      resumo.hidden = true;
      return;
    }

    areaItens.innerHTML = itens.map(({ produto: p, qtd }) => `
      <div class="item">
        <img src="${escaparHTML(p.imagem || IMAGEM_PADRAO)}" alt="${escaparHTML(p.nome)}">
        <div>
          <h3 class="item__nome"><a href="produto.html?id=${encodeURIComponent(p.id)}">${escaparHTML(p.nome)}</a></h3>
          <p class="item__preco">${formatarPreco(p.preco)}</p>
          <div class="item__linha">
            <div class="qtd">
              <button data-acao="menos" data-id="${escaparHTML(p.id)}" aria-label="Diminuir quantidade">−</button>
              <span>${qtd}</span>
              <button data-acao="mais" data-id="${escaparHTML(p.id)}" aria-label="Aumentar quantidade">+</button>
            </div>
            <button class="link-discreto" data-acao="remover" data-id="${escaparHTML(p.id)}">Remover</button>
          </div>
        </div>
      </div>`).join("");

    const total = itens.reduce((soma, i) => soma + i.produto.preco * i.qtd, 0);
    document.getElementById("total").textContent = formatarPreco(total);
    resumo.hidden = false;
    atualizarLinkWhatsApp(itens);
  }

  // O link do WhatsApp é refeito sempre que algo muda (itens, nome ou observações)
  function atualizarLinkWhatsApp(itens) {
    const nome = document.getElementById("cliente-nome").value.trim();
    const obs = document.getElementById("cliente-obs").value.trim();
    document.getElementById("btn-whatsapp").href = montarLinkWhatsApp(itens, nome, obs);
  }

  const itensAtuais = () => obterCarrinho()
    .map((i) => ({ produto: produtos.find((p) => p.id === i.id), qtd: i.qtd }))
    .filter((i) => i.produto);

  areaItens.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-acao]");
    if (!botao) return;
    const id = botao.dataset.id;
    if (botao.dataset.acao === "mais") alterarQuantidade(id, 1);
    if (botao.dataset.acao === "menos") alterarQuantidade(id, -1);
    if (botao.dataset.acao === "remover") removerDoCarrinho(id);
    desenhar();
  });

  ["cliente-nome", "cliente-obs"].forEach((campo) =>
    document.getElementById(campo).addEventListener("input", () => atualizarLinkWhatsApp(itensAtuais()))
  );

  document.getElementById("btn-limpar").addEventListener("click", () => {
    if (confirm("Esvaziar o carrinho?")) {
      salvarArmazenado(CHAVE_CARRINHO, []);
      atualizarContadores();
      desenhar();
    }
  });

  desenhar();
}

/* ---------------------------------------------------------
   10. INÍCIO: decide o que rodar conforme a página
   --------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  montarCabecalho();
  montarRodape();
  atualizarContadores();

  const pagina = document.body.dataset.pagina;
  if (pagina === "home") iniciarHome();
  if (pagina === "produto") iniciarProduto();
  if (pagina === "carrinho") iniciarCarrinho();
});
