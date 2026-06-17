// ============================================================
// BLOCO 1: IMPORTAÇÕES (TODAS JUNTAS!)
// ============================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const axios = require('axios'); // ← APENAS UMA VEZ!

// ============================================================
// BLOCO 2: INICIALIZANDO O SERVIDOR
// ============================================================

const app = express();
const PORT = 3000;

// ============================================================
// BLOCO 3: MIDDLEWARES
// ============================================================

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// BLOCO 4: ENDPOINT DE BUSCA
// ============================================================

app.get('/buscar', (req, res) => {
    const termoBusca = req.query.q || '';
    
    if (!termoBusca.trim()) {
        return res.json([]);
    }

    const query = `
        SELECT * FROM registros 
        WHERE nome LIKE ? 
           OR descricao LIKE ? 
           OR categoria LIKE ?
        ORDER BY nome
        LIMIT 50
    `;
    
    const searchTerm = `%${termoBusca}%`;
    
    db.all(query, [searchTerm, searchTerm, searchTerm], (err, rows) => {
        if (err) {
            console.error('❌ Erro na busca:', err.message);
            return res.status(500).json({ 
                erro: 'Erro ao buscar dados. Tente novamente.' 
            });
        }
        res.json(rows);
    });
});

// ============================================================
// BLOCO 5: ENDPOINT DE TESTE
// ============================================================

app.get('/teste', (req, res) => {
    res.json({ mensagem: '🚀 Servidor SQLite funcionando!' });
});

// ============================================================
// BLOCO 6: CONSULTA CNPJ COM DELAY AUTOMÁTICO
// ============================================================

// Controle global de requisições
let ultimaRequisicao = 0;
const MIN_INTERVALO_MS = 20000; // 20 segundos entre consultas

async function consultarCNPJ(cnpj) {
    // Aguarda o intervalo mínimo entre consultas
    const agora = Date.now();
    const tempoDecorrido = agora - ultimaRequisicao;
    
    if (tempoDecorrido < MIN_INTERVALO_MS) {
        const tempoEspera = (MIN_INTERVALO_MS - tempoDecorrido) / 1000;
        console.log(`⏳ Aguardando ${tempoEspera.toFixed(0)} segundos antes da próxima consulta...`);
        await new Promise(resolve => setTimeout(resolve, MIN_INTERVALO_MS - tempoDecorrido));
    }
    
    ultimaRequisicao = Date.now();
    
    console.log(`🔍 Consultando CNPJ: ${cnpj}`);
    
    try {
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        
        if (cnpjLimpo.length !== 14) {
            throw new Error('CNPJ deve ter 14 dígitos');
        }
        
        console.log(`✅ CNPJ validado: ${cnpjLimpo}`);
        
        // Usando apenas a BrasilAPI (mais confiável)
        const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`;
        
        console.log(`🌐 URL: ${url}`);
        
        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
        });

        const dados = response.data;
        
        if (dados.message || dados.erro) {
            throw new Error(dados.message || dados.erro);
        }
        
        if (dados && dados.cnpj) {
            console.log(`✅ Consulta bem-sucedida!`);
            console.log(`📌 Empresa: ${dados.razao_social || dados.nome_fantasia || 'Não informado'}`);
            
            return {
                cnpj: dados.cnpj,
                razao_social: dados.razao_social || 'Não informado',
                nome_fantasia: dados.nome_fantasia || dados.razao_social || 'Não informado',
                situacao: dados.situacao || 'Não informado',
                data_abertura: dados.data_abertura || 'Não informado',
                municipio: dados.municipio || 'Não informado',
                uf: dados.uf || 'Não informado',
                cnae_fiscal_descricao: dados.cnae_fiscal_descricao || 'Não informado',
                email: dados.email || 'Não informado',
                ddd_telefone_1: dados.ddd_telefone_1 || 'Não informado',
                logradouro: dados.logradouro || 'Não informado',
                numero: dados.numero || 'Não informado',
                bairro: dados.bairro || 'Não informado',
                cep: dados.cep || 'Não informado',
                capital_social: dados.capital_social || 0,
                natureza_juridica: dados.natureza_juridica || 'Não informado',
                qsa: dados.qsa || []
            };
        }
        
        throw new Error('Dados inválidos');
        
    } catch (erro) {
        console.log(`❌ Erro ao consultar CNPJ: ${erro.message}`);
        
        // Se for erro de limite (429), aguarda mais tempo
        if (erro.response?.status === 429 || erro.message.includes('limite')) {
            console.log(`🚨 LIMITE DE REQUISIÇÕES EXCEDIDO!`);
            console.log(`⏳ Aguardando 60 segundos...`);
            await new Promise(resolve => setTimeout(resolve, 60000));
            
            // Tenta novamente uma vez após o delay
            console.log(`🔄 Tentando novamente após o delay...`);
            return consultarCNPJ(cnpj);
        }
        
        // Se for CNPJ inválido
        if (erro.message.includes('inválido')) {
            throw new Error(`CNPJ ${cnpj} é inválido. Verifique o número.`);
        }
        
        // Fallback: retorna dados parciais para não quebrar a aplicação
        return {
            cnpj: cnpj.replace(/\D/g, ''),
            razao_social: `Empresa não encontrada (${cnpj})`,
            nome_fantasia: `Empresa não encontrada`,
            situacao: 'Não informado',
            data_abertura: 'Não informado',
            municipio: 'Não informado',
            uf: 'Não informado',
            cnae_fiscal_descricao: 'Não informado',
            email: 'Não informado',
            ddd_telefone_1: 'Não informado',
            logradouro: 'Não informado',
            numero: 'Não informado',
            bairro: 'Não informado',
            cep: 'Não informado',
            capital_social: 0,
            natureza_juridica: 'Não informado',
            qsa: []
        };
    }
}

// ============================================================
// BLOCO 7: ENDPOINT PARA CONSULTAR CNPJ
// ============================================================

app.get('/cnpj/:cnpj', async (req, res) => {
    try {
        const cnpj = req.params.cnpj.replace(/\D/g, '');
        
        if (cnpj.length !== 14) {
            return res.status(400).json({ 
                erro: 'CNPJ inválido. Digite 14 dígitos.' 
            });
        }

        const dados = await consultarCNPJ(cnpj);
        res.json(dados);
        
    } catch (erro) {
        console.error('❌ Erro na consulta CNPJ:', erro.message);
        res.status(500).json({ 
            erro: 'Não foi possível consultar o CNPJ. Tente novamente mais tarde.',
            detalhe: erro.message 
        });
    }
});

// ============================================================
// BLOCO 8: ENDPOINT PARA CONSULTAR E SALVAR CNPJ
// ============================================================

app.get('/cnpj-salvar/:cnpj', async (req, res) => {
    try {
        const cnpj = req.params.cnpj.replace(/\D/g, '');
        
        if (cnpj.length !== 14) {
            return res.status(400).json({ 
                erro: 'CNPJ inválido. Digite 14 dígitos.' 
            });
        }

        console.log(`💾 Consultando e salvando CNPJ: ${cnpj}`);
        
        const dados = await consultarCNPJ(cnpj);
        
        const nomeFantasia = dados.nome_fantasia || dados.razao_social || 'Nome não encontrado';
        
        const socios = dados.qsa?.map(socio => 
            `${socio.nome_socio} (${socio.qualificacao_socio || 'Sócio'})`
        ).join('; ') || 'Não informado';
        
        const descricao = `
            📌 CNPJ: ${dados.cnpj || cnpj}
            🏢 Razão Social: ${dados.razao_social || 'Não informado'}
            🏷️ Nome Fantasia: ${dados.nome_fantasia || 'Não informado'}
            📊 Situação: ${dados.situacao || 'Não informado'}
            📅 Data Abertura: ${dados.data_abertura || 'Não informado'}
            💰 Capital Social: R$ ${(dados.capital_social || 0).toLocaleString('pt-BR')}
            📍 Endereço: ${dados.logradouro || ''}, ${dados.numero || ''} - ${dados.bairro || ''}, ${dados.municipio || ''} - ${dados.uf || ''}
            📮 CEP: ${dados.cep || 'Não informado'}
            📞 Telefone: ${dados.ddd_telefone_1 || 'Não informado'}
            📧 Email: ${dados.email || 'Não informado'}
            🔍 Atividade Principal: ${dados.cnae_fiscal_descricao || 'Não informado'}
            👥 Sócios: ${socios}
            🏛️ Natureza Jurídica: ${dados.natureza_juridica || 'Não informado'}
        `.trim();

        const insertStmt = db.prepare(`
            INSERT INTO registros (nome, descricao, categoria) 
            VALUES (?, ?, ?)
        `);
        
        insertStmt.run(
            nomeFantasia,
            descricao,
            'CNPJ - Receita Federal'
        );
        insertStmt.finalize();

        res.json({ 
            mensagem: `✅ Empresa "${nomeFantasia}" salva com sucesso!`,
            dados: dados
        });
        
    } catch (erro) {
        console.error('❌ Erro ao salvar CNPJ:', erro.message);
        res.status(500).json({ 
            erro: 'Não foi possível consultar e salvar o CNPJ. Tente novamente.' 
        });
    }
});

// ============================================================
// BLOCO 9: INICIANDO O SERVIDOR
// ============================================================

app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
    console.log(`📝 Teste: http://localhost:${PORT}/teste`);
    console.log(`🔍 Busca: http://localhost:${PORT}/buscar?q=ana`);
    console.log(`🏢 CNPJ: http://localhost:${PORT}/cnpj/18236120000158`);
    console.log('='.repeat(50));
    console.log('🟢 Servidor pronto para receber requisições!');
});