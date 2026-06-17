// ============================================================
// BLOCO 1: IMPORTAÇÃO DAS BIBLIOTECAS
// ============================================================
// axios: faz requisições HTTP
// cheerio: analisa HTML e extrai dados
// database: nossa conexão com o SQLite
// ============================================================

const axios = require('axios');
const cheerio = require('cheerio');
const db = require('./database');

// ============================================================
// BLOCO 2: FUNÇÃO PARA EXTRAIR DADOS DE UM SITE EXEMPLO
// ============================================================
// Neste exemplo, vamos buscar produtos de uma página de exemplo
// Você pode adaptar para qualquer site que quiser
// ============================================================

async function coletarDados() {
    try {
        console.log('🌐 Iniciando coleta de dados...');
        
        // 2.1: Define a URL que vamos raspar
        // ATENÇÃO: Troque pela URL real que você quer consultar
        const url = 'https://www.example.com/produtos';
        
        // 2.2: Faz a requisição para a página
        const { data } = await axios.get(url);
        
        // 2.3: Carrega o HTML no Cheerio para análise
        const $ = cheerio.load(data);
        
        // 2.4: Extrai os dados (adaptar conforme a estrutura do site)
        // Exemplo: encontrar todos os produtos na página
        const produtos = [];
        
        $('.produto').each((index, elemento) => {
            const nome = $(elemento).find('.nome-produto').text().trim();
            const preco = $(elemento).find('.preco').text().trim();
            const descricao = $(elemento).find('.descricao').text().trim();
            
            if (nome) {
                produtos.push({ nome, preco, descricao, categoria: 'Coletado Online' });
            }
        });
        
        console.log(`📦 Encontrados ${produtos.length} produtos`);
        
        // 2.5: Salva os dados no banco SQLite
        if (produtos.length > 0) {
            const insertStmt = db.prepare(`
                INSERT INTO registros (nome, descricao, categoria) 
                VALUES (?, ?, ?)
            `);
            
            produtos.forEach(produto => {
                insertStmt.run(produto.nome, produto.descricao || '', produto.categoria);
            });
            
            insertStmt.finalize();
            console.log(`✅ ${produtos.length} registros salvos no banco!`);
        }
        
        return produtos;
        
    } catch (erro) {
        console.error('❌ Erro na coleta:', erro.message);
        return [];
    }
}

// ============================================================
// BLOCO 3: FUNÇÃO PARA BUSCAR DADOS ESPECÍFICOS (ex: por termo)
// ============================================================
// Essa função pode ser chamada pela sua API para buscar online
// ============================================================

async function buscarOnline(termo) {
    try {
        console.log(`🔍 Buscando por "${termo}" online...`);
        
        // Exemplo: buscar em um site com parâmetro de pesquisa
        const url = `https://www.example.com/buscar?q=${encodeURIComponent(termo)}`;
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        
        const resultados = [];
        $('.resultado').each((index, elemento) => {
            const titulo = $(elemento).find('.titulo').text().trim();
            const descricao = $(elemento).find('.descricao').text().trim();
            
            if (titulo) {
                resultados.push({ nome: titulo, descricao, categoria: 'Busca Online' });
            }
        });
        
        return resultados;
        
    } catch (erro) {
        console.error('❌ Erro na busca online:', erro.message);
        return [];
    }
}

// ============================================================
// BLOCO 4: EXPORTANDO AS FUNÇÕES
// ============================================================

module.exports = { coletarDados, buscarOnline };

// ============================================================
// BLOCO 5: EXECUÇÃO DIRETA (se rodar node scraper.js)
// ============================================================

// Se executar este arquivo diretamente, faz a coleta
if (require.main === module) {
    coletarDados().then(() => {
        console.log('🏁 Coleta finalizada!');
        db.close();
    });
}