// ============================================================
// BLOCO 1: IMPORTAÇÃO DO SQLITE
// ============================================================
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// ============================================================
// BLOCO 2: CONEXÃO COM O BANCO (CRIA O ARQUIVO .db)
// ============================================================
const db = new sqlite3.Database(
    path.join(__dirname, 'banco.db'),
    (err) => {
        if (err) {
            console.error('❌ Erro ao conectar ao banco:', err.message);
        } else {
            console.log('✅ Conectado ao banco SQLite (banco.db)');
        }
    }
);

// ============================================================
// BLOCO 3: CRIAÇÃO DA TABELA
// ============================================================
db.run(`
    CREATE TABLE IF NOT EXISTS registros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome VARCHAR(200) NOT NULL,
        descricao TEXT,
        categoria VARCHAR(100),
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        console.error('❌ Erro ao criar tabela:', err.message);
    } else {
        console.log('✅ Tabela "registros" criada/verificada com sucesso');
        
        // ============================================================
        // BLOCO 4: INSERINDO DADOS DE TESTE
        // ============================================================
        db.get('SELECT COUNT(*) as total FROM registros', (err, row) => {
            if (err) {
                console.error('❌ Erro ao verificar dados:', err.message);
                return;
            }
            
            if (row.total === 0) {
                const dadosExemplo = [
                    ['Ana Oliveira', 'Cliente empresarial desde 2020', 'Clientes'],
                    ['Carlos Silva', 'Fornecedor de materiais de construção', 'Fornecedores'],
                    ['Tech Solutions', 'Empresa de consultoria em TI', 'Empresas'],
                    ['Maria Santos', 'Cliente pessoa física', 'Clientes'],
                    ['Produto X', 'Novo produto em desenvolvimento', 'Produtos'],
                    ['João Pereira', 'Parceiro de negócios', 'Parceiros'],
                    ['Inovação Labs', 'Startup de tecnologia', 'Empresas'],
                    ['Material Y', 'Matéria-prima para produção', 'Produtos']
                ];
                
                const insertStmt = db.prepare(
                    'INSERT INTO registros (nome, descricao, categoria) VALUES (?, ?, ?)'
                );
                
                dadosExemplo.forEach(dado => {
                    insertStmt.run(dado[0], dado[1], dado[2]);
                });
                
                insertStmt.finalize();
                console.log('✅ Dados de teste inseridos (8 registros)');
            } else {
                console.log(`ℹ️ Banco já possui ${row.total} registros`);
            }
        });
    }
});

// ============================================================
// BLOCO 5: EXPORTANDO A CONEXÃO
// ============================================================
module.exports = db;