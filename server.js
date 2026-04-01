const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
const port = 3000;

// 🔥 FORÇAR TIMEZONE DO BRASIL
process.env.TZ = 'America/Sao_Paulo';

// Middlewares
app.use(cors({
    origin: ['http://localhost:3001', 'https://vailsonhair.com.br'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 Conexão com MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'salao_beleza',
    timezone: '-03:00'
});

// Testar conexão
db.connect((err) => {
    if (err) {
        console.error('❌ Erro ao conectar ao MySQL:', err);
        return;
    }
    console.log('✅ Conectado ao MySQL!');
    
    // Configurar timezone apenas uma vez
    db.query("SET SESSION time_zone = '-03:00'", (err) => {
        if (err) {
            console.error('❌ Erro ao setar timezone:', err);
        } else {
            console.log('✅ Timezone configurado para Brasília (UTC-3)');
        }
    });
});

// 🔥 MIDDLEWARE CORRIGIDO - Só aplica timezone em consultas de escrita
app.use((req, res, next) => {
    // Apenas para requisições POST, PUT, DELETE (escrita)
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        db.query("SET SESSION time_zone = '-03:00'", (err) => {
            if (err) console.error('❌ Erro ao garantir timezone:', err);
            next();
        });
    } else {
        // Para GET (leitura), não precisa reconfigurar
        next();
    }
});

// Rota de teste
app.get('/', (req, res) => {
    res.json({ message: 'API do Salão de Beleza funcionando!' });
});

// ============================================
// ROTAS DE CLIENTES
// ============================================

// Listar todos os clientes
app.get('/api/clientes', (req, res) => {
    db.query('SELECT * FROM clientes', (err, results) => {
        if (err) {
            console.error('Erro na consulta:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Buscar cliente por ID
app.get('/api/clientes/:id', (req, res) => {
    db.query('SELECT * FROM clientes WHERE id = ?', [req.params.id], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ error: 'Cliente não encontrado' });
            return;
        }
        res.json(results[0]);
    });
});

// Criar novo cliente
app.post('/api/clientes', (req, res) => {
    const { nome, telefone, email, data_nascimento, observacoes } = req.body;
    
    if (!nome) {
        res.status(400).json({ error: 'Nome é obrigatório' });
        return;
    }
    
    db.query(
        'INSERT INTO clientes (nome, telefone, email, data_nascimento, observacoes) VALUES (?, ?, ?, ?, ?)',
        [nome, telefone, email, data_nascimento, observacoes],
        (err, result) => {
            if (err) {
                console.error('Erro ao inserir:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json({ 
                id: result.insertId,
                message: 'Cliente criado com sucesso' 
            });
        }
    );
});

// Atualizar cliente
app.put('/api/clientes/:id', (req, res) => {
    const { nome, telefone, email, data_nascimento, observacoes } = req.body;
    
    db.query(
        'UPDATE clientes SET nome = ?, telefone = ?, email = ?, data_nascimento = ?, observacoes = ? WHERE id = ?',
        [nome, telefone, email, data_nascimento, observacoes, req.params.id],
        (err, result) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (result.affectedRows === 0) {
                res.status(404).json({ error: 'Cliente não encontrado' });
                return;
            }
            res.json({ message: 'Cliente atualizado com sucesso' });
        }
    );
});

// Deletar cliente
app.delete('/api/clientes/:id', (req, res) => {
    db.query('DELETE FROM clientes WHERE id = ?', [req.params.id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Cliente não encontrado' });
            return;
        }
        res.json({ message: 'Cliente deletado com sucesso' });
    });
});

// ============================================
// ROTAS DE FUNCIONÁRIOS - COMPLETAS E CORRIGIDAS
// ============================================

// Listar todos os funcionários ativos
app.get('/api/funcionarios', (req, res) => {
    console.log('📋 Buscando funcionários ativos...');
    db.query('SELECT * FROM funcionarios WHERE ativo = true ORDER BY nome', (err, results) => {
        if (err) {
            console.error('❌ Erro ao listar funcionários:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log(`✅ ${results.length} funcionários encontrados`);
        res.json(results);
    });
});

// Listar todos os funcionários (inclusive inativos)
app.get('/api/funcionarios/todos', (req, res) => {
    console.log('📋 Buscando todos os funcionários...');
    db.query('SELECT * FROM funcionarios ORDER BY nome', (err, results) => {
        if (err) {
            console.error('❌ Erro ao listar funcionários:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log(`✅ ${results.length} funcionários encontrados`);
        res.json(results);
    });
});

// Buscar funcionário por ID
app.get('/api/funcionarios/:id', (req, res) => {
    const { id } = req.params;
    console.log(`🔍 Buscando funcionário ID: ${id}`);
    
    db.query('SELECT * FROM funcionarios WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('❌ Erro ao buscar funcionário:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ error: 'Funcionário não encontrado' });
            return;
        }
        console.log('✅ Funcionário encontrado:', results[0].nome);
        res.json(results[0]);
    });
});

// Criar novo funcionário (CORRIGIDO - permite salário base = 0)
app.post('/api/funcionarios', (req, res) => {
    console.log('\n=== 📥 CRIANDO NOVO FUNCIONÁRIO ===');
    console.log('📦 Body recebido:', JSON.stringify(req.body, null, 2));
    
    const { 
        nome, 
        especialidade, 
        telefone, 
        email, 
        dataContratacao, 
        salarioBase, 
        comissaoPercentual, 
        documentos,
        avatar,
        cor 
    } = req.body;
    
    // VALIDAÇÃO CORRIGIDA - apenas nome e especialidade são obrigatórios
    if (!nome || !especialidade) {
        console.log('❌ Validação falhou: nome ou especialidade ausentes');
        return res.status(400).json({ 
            error: 'Nome e especialidade são obrigatórios',
            campos: { nome: !!nome, especialidade: !!especialidade }
        });
    }
    
    // Converter salárioBase para número (pode ser 0)
    const salario = parseFloat(salarioBase) || 0;
    
    // Gerar avatar se não fornecido
    const avatarFinal = avatar || nome.substring(0, 2).toUpperCase();
    
    console.log('📝 Inserindo no banco:', {
        nome,
        especialidade,
        telefone: telefone || '',
        email: email || '',
        dataContratacao: dataContratacao || null,
        salario,
        comissaoPercentual: comissaoPercentual || 30,
        avatar: avatarFinal,
        cor: cor || 'bg-blue-500'
    });
    
    db.query(
        `INSERT INTO funcionarios 
        (nome, especialidade, telefone, email, data_contratacao, salario_base, comissao_percentual, documentos, avatar, cor, ativo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)`,
        [
            nome, 
            especialidade, 
            telefone || '', 
            email || '', 
            dataContratacao || null, 
            salario, // Agora aceita 0
            comissaoPercentual || 30, 
            JSON.stringify(documentos || {}),
            avatarFinal,
            cor || 'bg-blue-500'
        ],
        (err, result) => {
            if (err) {
                console.error('❌ Erro ao inserir funcionário:', err);
                console.error('❌ SQL:', err.sql);
                console.error('❌ Mensagem:', err.sqlMessage);
                return res.status(500).json({ 
                    error: err.message,
                    sqlMessage: err.sqlMessage 
                });
            }
            
            console.log('✅ Funcionário criado com ID:', result.insertId);
            
            // Buscar o funcionário recém-criado para retornar os dados completos
            db.query('SELECT * FROM funcionarios WHERE id = ?', [result.insertId], (err, results) => {
                if (err) {
                    console.error('❌ Erro ao buscar funcionário criado:', err);
                    return res.status(201).json({ 
                        id: result.insertId,
                        message: 'Funcionário criado com sucesso' 
                    });
                }
                
                res.status(201).json(results[0]);
            });
        }
    );
});

// Atualizar funcionário (CORRIGIDO)
app.put('/api/funcionarios/:id', (req, res) => {
    const { id } = req.params;
    console.log(`\n=== ✏️ ATUALIZANDO FUNCIONÁRIO ID: ${id} ===`);
    console.log('📦 Body recebido:', JSON.stringify(req.body, null, 2));
    
    const { 
        nome, 
        especialidade, 
        telefone, 
        email, 
        dataContratacao, 
        salarioBase, 
        comissaoPercentual, 
        documentos,
        avatar,
        cor,
        ativo 
    } = req.body;
    
    // Validar campos obrigatórios
    if (!nome || !especialidade) {
        console.log('❌ Validação falhou: nome ou especialidade ausentes');
        return res.status(400).json({ error: 'Nome e especialidade são obrigatórios' });
    }
    
    // Converter salarioBase para número (pode ser 0)
    const salario = parseFloat(salarioBase) || 0;
    
    db.query(
        `UPDATE funcionarios SET 
        nome = ?, 
        especialidade = ?, 
        telefone = ?, 
        email = ?, 
        data_contratacao = ?, 
        salario_base = ?, 
        comissao_percentual = ?, 
        documentos = ?,
        avatar = ?,
        cor = ?,
        ativo = ?
        WHERE id = ?`,
        [
            nome, 
            especialidade, 
            telefone || '', 
            email || '', 
            dataContratacao || null, 
            salario, 
            comissaoPercentual || 30, 
            JSON.stringify(documentos || {}),
            avatar,
            cor,
            ativo !== undefined ? ativo : true,
            id
        ],
        (err, result) => {
            if (err) {
                console.error('❌ Erro ao atualizar funcionário:', err);
                console.error('❌ SQL:', err.sql);
                console.error('❌ Mensagem:', err.sqlMessage);
                return res.status(500).json({ error: err.message });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Funcionário não encontrado' });
            }
            
            console.log('✅ Funcionário atualizado com sucesso');
            
            // Buscar o funcionário atualizado para retornar os dados completos
            db.query('SELECT * FROM funcionarios WHERE id = ?', [id], (err, results) => {
                if (err) {
                    console.error('❌ Erro ao buscar funcionário atualizado:', err);
                    return res.json({ message: 'Funcionário atualizado com sucesso' });
                }
                
                res.json(results[0]);
            });
        }
    );
});

// Desativar funcionário (soft delete)
app.delete('/api/funcionarios/:id', (req, res) => {
    const { id } = req.params;
    console.log(`\n=== 🗑️ DESATIVANDO FUNCIONÁRIO ID: ${id} ===`);
    
    db.query('UPDATE funcionarios SET ativo = false WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('❌ Erro ao desativar funcionário:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Funcionário não encontrado' });
            return;
        }
        console.log('✅ Funcionário desativado com sucesso');
        res.json({ message: 'Funcionário desativado com sucesso' });
    });
});

// Reativar funcionário
app.put('/api/funcionarios/:id/reativar', (req, res) => {
    const { id } = req.params;
    console.log(`\n=== 🔄 REATIVANDO FUNCIONÁRIO ID: ${id} ===`);
    
    db.query('UPDATE funcionarios SET ativo = true WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('❌ Erro ao reativar funcionário:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Funcionário não encontrado' });
            return;
        }
        console.log('✅ Funcionário reativado com sucesso');
        res.json({ message: 'Funcionário reativado com sucesso' });
    });
});

// ============================================
// ROTAS DE PONTO (CORRIGIDAS)
// ============================================

// Buscar ponto do funcionário por mês/ano
app.get('/api/funcionarios/:id/ponto', (req, res) => {
    const { id } = req.params;
    const { mes, ano } = req.query;
    
    console.log(`📋 Buscando ponto do funcionário ${id} para ${mes}/${ano}`);
    
    db.query(
        'SELECT * FROM pontos WHERE funcionario_id = ? AND mes = ? AND ano = ?',
        [id, mes, ano],
        (err, results) => {
            if (err) {
                console.error('❌ Erro ao buscar ponto:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            if (results.length === 0) {
                console.log('📅 Nenhum ponto encontrado, retornando vazio');
                res.json({ dados: {} });
                return;
            }
            
            // Parse dos dados JSON
            try {
                const pontoData = results[0];
                pontoData.dados = JSON.parse(pontoData.dados || '{}');
                console.log('✅ Ponto carregado com sucesso');
                res.json(pontoData);
            } catch (parseError) {
                console.error('❌ Erro ao parsear dados do ponto:', parseError);
                res.json({ dados: {} });
            }
        }
    );
});

// Salvar ponto do funcionário
app.post('/api/funcionarios/:id/ponto', (req, res) => {
    const { id } = req.params;
    const { mes, ano, dados } = req.body;
    
    console.log(`💾 Salvando ponto do funcionário ${id} para ${mes}/${ano}`);
    console.log('📦 Dados recebidos:', dados);
    
    // Validar dados
    if (!dados || typeof dados !== 'object') {
        return res.status(400).json({ error: 'Dados inválidos' });
    }
    
    // Calcular total de descontos
    let totalDescontos = 0;
    Object.values(dados).forEach(dia => {
        if (dia.status === 'falta' && dia.desconto) {
            totalDescontos += dia.desconto || 0;
        }
    });
    
    const dadosParaSalvar = {
        ...dados,
        totalDescontos,
        ultimaAtualizacao: new Date().toISOString()
    };
    
    db.query(
        `INSERT INTO pontos (funcionario_id, mes, ano, dados) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE dados = ?`,
        [id, mes, ano, JSON.stringify(dadosParaSalvar), JSON.stringify(dadosParaSalvar)],
        (err, result) => {
            if (err) {
                console.error('❌ Erro ao salvar ponto:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log('✅ Ponto salvo com sucesso');
            res.json({ 
                message: 'Ponto salvo com sucesso',
                totalDescontos 
            });
        }
    );
});

// ============================================
// ROTAS DE PAGAMENTOS DE FUNCIONÁRIOS (CORRIGIDAS)
// ============================================

// Buscar pagamentos de um funcionário específico (usando tabela pagamentos_funcionarios)
app.get('/api/funcionarios/:id/pagamentos', (req, res) => {
    const { id } = req.params;
    const { ano } = req.query;
    
    console.log(`\n=== 💰 BUSCANDO PAGAMENTOS DO FUNCIONÁRIO ${id} ===`);
    console.log('📌 Ano:', ano);
    
    const query = 'SELECT * FROM pagamentos_funcionarios WHERE funcionario_id = ? AND ano = ? ORDER BY data_pagamento DESC';
    
    db.query(query, [id, ano], (err, results) => {
        if (err) {
            console.error('❌ Erro ao buscar pagamentos:', err);
            console.error('❌ SQL:', err.sql);
            console.error('❌ Mensagem:', err.sqlMessage);
            return res.status(500).json({ 
                error: err.message,
                sqlMessage: err.sqlMessage 
            });
        }
        
        console.log(`✅ ${results.length} pagamentos encontrados para o funcionário ${id}`);
        res.json(results);
    });
});

// Registrar pagamento para um funcionário específico (usando tabela pagamentos_funcionarios)
app.post('/api/funcionarios/:id/pagamentos', (req, res) => {
    const { id } = req.params;
    const {
        mes,
        ano,
        valor,
        salarioBase,
        descontos,
        comissoes,
        adiantamentos,
        forma_pagamento,
        observacoes
    } = req.body;
    
    console.log('\n=== 💰 REGISTRANDO PAGAMENTO PARA FUNCIONÁRIO ===');
    console.log('📌 ID do funcionário:', id);
    console.log('📦 Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    // Validar campos obrigatórios
    if (!mes || !ano || !valor) {
        return res.status(400).json({ 
            error: 'Mês, ano e valor são obrigatórios' 
        });
    }
    
    // Buscar o nome do funcionário
    db.query('SELECT nome FROM funcionarios WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('❌ Erro ao buscar funcionário:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Funcionário não encontrado' });
        }
        
        const funcionario_nome = results[0].nome;
        
        // Verificar se já existe pagamento para este mês/ano
        db.query(
            'SELECT id FROM pagamentos_funcionarios WHERE funcionario_id = ? AND mes = ? AND ano = ?',
            [id, mes, ano],
            (err, existing) => {
                if (err) {
                    console.error('❌ Erro ao verificar pagamento existente:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                if (existing.length > 0) {
                    return res.status(400).json({ 
                        error: 'Já existe um pagamento registrado para este mês/ano' 
                    });
                }
                
                // Inserir o pagamento na tabela pagamentos_funcionarios
                const query = `
                    INSERT INTO pagamentos_funcionarios 
                    (funcionario_id, funcionario_nome, mes, ano, valor, salario_base, descontos, comissoes, adiantamentos, data_pagamento, forma_pagamento, observacoes) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
                `;
                
                const params = [
                    parseInt(id),
                    funcionario_nome,
                    parseInt(mes),
                    parseInt(ano),
                    parseFloat(valor) || 0,
                    parseFloat(salarioBase) || 0,
                    parseFloat(descontos) || 0,
                    parseFloat(comissoes) || 0,
                    parseFloat(adiantamentos) || 0,
                    forma_pagamento || 'Dinheiro',
                    observacoes || `Pagamento referente a ${parseInt(mes) + 1}/${ano}`
                ];
                
                console.log('📝 Query SQL:', query);
                console.log('📦 Parâmetros:', params);
                
                db.query(query, params, (err, result) => {
                    if (err) {
                        console.error('❌ Erro ao registrar pagamento:');
                        console.error('❌ Código:', err.code);
                        console.error('❌ Mensagem:', err.message);
                        console.error('❌ SQL:', err.sql);
                        console.error('❌ SQL Message:', err.sqlMessage);
                        return res.status(500).json({ 
                            error: err.message,
                            sqlMessage: err.sqlMessage,
                            code: err.code
                        });
                    }
                    
                    console.log('✅ Pagamento registrado com ID:', result.insertId);
                    
                    // Buscar o pagamento recém-criado
                    db.query('SELECT * FROM pagamentos_funcionarios WHERE id = ?', [result.insertId], (err, results) => {
                        if (err) {
                            console.error('❌ Erro ao buscar pagamento criado:', err);
                            return res.status(201).json({
                                id: result.insertId,
                                message: 'Pagamento registrado com sucesso'
                            });
                        }
                        
                        console.log('✅ Pagamento criado com sucesso');
                        res.status(201).json(results[0]);
                    });
                });
            }
        );
    });
});

// Buscar pagamentos para o módulo financeiro
app.get('/api/pagamentos/funcionarios', (req, res) => {
    const { mes, ano } = req.query;
    
    console.log(`\n=== 📋 BUSCANDO PAGAMENTOS PARA FINANCEIRO ===`);
    console.log('📌 Mês:', mes, 'Ano:', ano);
    
    let query = 'SELECT * FROM pagamentos_funcionarios WHERE 1=1';
    const params = [];
    
    if (mes !== undefined && mes !== '' && mes !== null) {
        query += ' AND mes = ?';
        params.push(parseInt(mes));
    }
    
    if (ano !== undefined && ano !== '' && ano !== null) {
        query += ' AND ano = ?';
        params.push(parseInt(ano));
    }
    
    query += ' ORDER BY data_pagamento DESC';
    
    console.log('📝 Query:', query);
    console.log('📦 Params:', params);
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('❌ Erro ao buscar pagamentos:', err);
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`✅ ${results.length} pagamentos encontrados`);
        res.json(results);
    });
});

// Registrar pagamento via módulo financeiro
app.post('/api/pagamentos/funcionarios', (req, res) => {
    const {
        funcionario_id,
        funcionario_nome,
        mes,
        ano,
        valor,
        salario_base,
        descontos,
        comissoes,
        adiantamentos,
        forma_pagamento,
        observacoes
    } = req.body;
    
    console.log('\n=== 💰 REGISTRANDO PAGAMENTO NO FINANCEIRO ===');
    console.log('📦 Dados recebidos:', req.body);
    
    const query = `
        INSERT INTO pagamentos_funcionarios 
        (funcionario_id, funcionario_nome, mes, ano, valor, salario_base, descontos, comissoes, adiantamentos, data_pagamento, forma_pagamento, observacoes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
    `;
    
    const params = [
        parseInt(funcionario_id),
        funcionario_nome,
        parseInt(mes),
        parseInt(ano),
        parseFloat(valor) || 0,
        parseFloat(salario_base) || 0,
        parseFloat(descontos) || 0,
        parseFloat(comissoes) || 0,
        parseFloat(adiantamentos) || 0,
        forma_pagamento || 'Dinheiro',
        observacoes || `Pagamento referente a ${parseInt(mes) + 1}/${ano}`
    ];
    
    db.query(query, params, (err, result) => {
        if (err) {
            console.error('❌ Erro ao registrar pagamento:', err);
            console.error('❌ SQL:', err.sql);
            console.error('❌ Mensagem:', err.sqlMessage);
            return res.status(500).json({ 
                error: err.message,
                sqlMessage: err.sqlMessage 
            });
        }
        
        console.log('✅ Pagamento registrado com ID:', result.insertId);
        res.status(201).json({
            id: result.insertId,
            message: 'Pagamento registrado com sucesso'
        });
    });
});

// Remover pagamento
app.delete('/api/pagamentos/funcionarios/:id', (req, res) => {
    const { id } = req.params;
    
    console.log(`🗑️ Removendo pagamento ID: ${id}`);
    
    db.query('DELETE FROM pagamentos_funcionarios WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('❌ Erro ao remover pagamento:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Pagamento não encontrado' });
        }
        
        console.log('✅ Pagamento removido com sucesso');
        res.json({ message: 'Pagamento removido com sucesso' });
    });
});

// ============================================
// ROTAS DE ADIANTAMENTOS DE FUNCIONÁRIOS
// ============================================

// Buscar adiantamentos de um funcionário
app.get('/api/funcionarios/:id/adiantamentos', (req, res) => {
    const { id } = req.params;
    const { mes, ano } = req.query;
    
    console.log(`📋 Buscando adiantamentos do funcionário ${id} para ${mes}/${ano}`);
    
    db.query(
        'SELECT * FROM adiantamentos WHERE funcionario_id = ? AND mes = ? AND ano = ? ORDER BY data DESC',
        [id, mes, ano],
        (err, results) => {
            if (err) {
                console.error('❌ Erro ao buscar adiantamentos:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log(`✅ ${results.length} adiantamentos encontrados`);
            res.json(results);
        }
    );
});

// Registrar adiantamento
app.post('/api/funcionarios/:id/adiantamentos', (req, res) => {
    const { id } = req.params;
    const { mes, ano, valor, data, motivo, formaPagamento } = req.body;
    
    console.log(`💰 Registrando adiantamento para funcionário ${id}:`, req.body);
    
    db.query(
        `INSERT INTO adiantamentos 
         (funcionario_id, mes, ano, valor, data, motivo, forma_pagamento) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, mes, ano, valor, data, motivo, formaPagamento],
        (err, result) => {
            if (err) {
                console.error('❌ Erro ao registrar adiantamento:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            
            console.log('✅ Adiantamento registrado com ID:', result.insertId);
            res.status(201).json({
                id: result.insertId,
                message: 'Adiantamento registrado com sucesso'
            });
        }
    );
});

// Remover adiantamento
app.delete('/api/funcionarios/:id/adiantamentos/:adiantamentoId', (req, res) => {
    const { id, adiantamentoId } = req.params;
    
    console.log(`🗑️ Removendo adiantamento ${adiantamentoId} do funcionário ${id}`);
    
    db.query(
        'DELETE FROM adiantamentos WHERE id = ? AND funcionario_id = ?',
        [adiantamentoId, id],
        (err, result) => {
            if (err) {
                console.error('❌ Erro ao remover adiantamento:', err);
                return res.status(500).json({ error: err.message });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Adiantamento não encontrado' });
            }
            
            console.log('✅ Adiantamento removido com sucesso');
            res.json({ message: 'Adiantamento removido com sucesso' });
        }
    );
});

// ============================================
// ROTAS DE AGENDAMENTOS - SEM CONVERSÃO DE TIMEZONE
// ============================================

// Listar todos os agendamentos
app.get('/api/agendamentos', (req, res) => {
    let query = `
        SELECT a.*, 
               c.id as cliente_id,
               c.nome as cliente_nome, 
               c.telefone as cliente_telefone, 
               c.email as cliente_email,
               f.id as funcionario_id,
               f.nome as funcionario_nome, 
               f.especialidade as funcionario_especialidade,
               f.cor as funcionario_cor,
               f.avatar as funcionario_avatar,
               s.id as servico_id,
               s.nome as servico_nome, 
               s.duracao_minutos as servico_duracao,
               s.preco as servico_preco,
               s.preco as valor
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN funcionarios f ON a.funcionario_id = f.id
        LEFT JOIN servicos s ON a.servico_id = s.id
        ORDER BY a.data_hora DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ Erro na query:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('✅ Agendamentos encontrados:', results.length);
        res.json(results);
    });
});

// Buscar agendamentos por período
app.get('/api/agendamentos/periodo', (req, res) => {
    const { inicio, fim } = req.query;
    
    console.log('📅 Buscando agendamentos por período:', { inicio, fim });
    
    if (!inicio || !fim) {
        return res.status(400).json({ error: 'Parâmetros inicio e fim são obrigatórios' });
    }
    
    let query = `
        SELECT a.*, 
               c.id as cliente_id,
               c.nome as cliente_nome, 
               c.telefone as cliente_telefone, 
               c.email as cliente_email,
               f.id as funcionario_id,
               f.nome as funcionario_nome, 
               f.especialidade as funcionario_especialidade,
               f.cor as funcionario_cor,
               f.avatar as funcionario_avatar,
               s.id as servico_id,
               s.nome as servico_nome, 
               s.duracao_minutos as servico_duracao,
               s.preco as servico_preco,
               s.preco as valor
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN funcionarios f ON a.funcionario_id = f.id
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE a.data_hora BETWEEN ? AND ?
        ORDER BY a.data_hora DESC
    `;
    
    db.query(query, [inicio, fim], (err, results) => {
        if (err) {
            console.error('❌ Erro na query de período:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log(`✅ Agendamentos encontrados no período: ${results.length}`);
        res.json(results);
    });
});

// ROTA PARA BUSCAR AGENDAMENTOS POR FUNCIONÁRIO
app.get('/api/agendamentos/funcionario/:id', (req, res) => {
  const { id } = req.params;
  const { mes, ano, status } = req.query;
  
  console.log('📥 Buscando agendamentos para funcionário:', { id, mes, ano, status });
  
  let query = `
    SELECT a.*, 
           c.nome as cliente_nome,
           s.nome as servico_nome,
           s.preco as servico_preco
    FROM agendamentos a
    LEFT JOIN clientes c ON a.cliente_id = c.id
    LEFT JOIN servicos s ON a.servico_id = s.id
    WHERE a.funcionario_id = ?
  `;
  
  const params = [id];
  
  if (mes !== undefined && mes !== 'undefined' && ano !== undefined && ano !== 'undefined') {
    const mesNum = parseInt(mes) + 1;
    query += ` AND MONTH(a.data_hora) = ? AND YEAR(a.data_hora) = ?`;
    params.push(mesNum, ano);
  }
  
  if (status && status !== 'undefined') {
    query += ` AND a.status = ?`;
    params.push(status);
  }
  
  query += ` ORDER BY a.data_hora DESC`;
  
  console.log('📝 Query:', query);
  console.log('📦 Params:', params);
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('❌ Erro ao buscar agendamentos:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    console.log(`✅ Encontrados ${results.length} agendamentos`);
    res.json(results);
  });
});

// Buscar agendamento por ID
app.get('/api/agendamentos/:id', (req, res) => {
    db.query(
        `SELECT a.*, 
                c.id as cliente_id,
                c.nome as cliente_nome, 
                c.telefone as cliente_telefone, 
                c.email as cliente_email,
                f.id as funcionario_id,
                f.nome as funcionario_nome, 
                f.especialidade as funcionario_especialidade,
                f.cor as funcionario_cor,
                f.avatar as funcionario_avatar,
                s.id as servico_id,
                s.nome as servico_nome, 
                s.duracao_minutos as servico_duracao,
                s.preco as servico_preco,
                s.preco as valor
         FROM agendamentos a
         LEFT JOIN clientes c ON a.cliente_id = c.id
         LEFT JOIN funcionarios f ON a.funcionario_id = f.id
         LEFT JOIN servicos s ON a.servico_id = s.id
         WHERE a.id = ?`,
        [req.params.id],
        (err, results) => {
            if (err) {
                console.error('❌ Erro na query:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            if (results.length === 0) {
                res.status(404).json({ error: 'Agendamento não encontrado' });
                return;
            }
            res.json(results[0]);
        }
    );
});

// 🔥 CRIAR NOVO AGENDAMENTO - CORRIGIDO (busca comissão do serviço)
app.post('/api/agendamentos', (req, res) => {
    console.log('\n=== 🚀 CRIANDO NOVO AGENDAMENTO ===');
    console.log('📦 Body recebido:', JSON.stringify(req.body, null, 2));
    
    const { 
        cliente_id, 
        funcionario_id, 
        servico_id, 
        data_hora, 
        status, 
        observacoes,
        // 🔥 REMOVA valor_comissao e percentual_comissao daqui!
        forma_pagamento,
        bandeira_cartao,
        parcelas,
        data_pagamento
    } = req.body;
    
    if (!cliente_id || !funcionario_id || !servico_id || !data_hora) {
        res.status(400).json({ error: 'Cliente, funcionário, serviço e data/hora são obrigatórios' });
        return;
    }
    
    console.log('📅 DATA_HORA RECEBIDA DO FRONTEND:', data_hora);
    
    const dataHoraParaSalvar = data_hora;
    const dataFormatada = data_hora.split('T')[0];
    
    // 🔥 BUSCAR O SERVIÇO COMPLETO (preço E comissão)
    db.query('SELECT preco, comissao_percentual FROM servicos WHERE id = ?', [servico_id], (errServ, resultServ) => {
        if (errServ) {
            console.error('❌ Erro ao buscar serviço:', errServ);
            return res.status(500).json({ error: errServ.message });
        }
        
        const precoServico = resultServ[0]?.preco || 0;
        const percentualComissao = resultServ[0]?.comissao_percentual || 0; // 🔥 BUSCA DO BANCO!
        const valorComissao = (precoServico * percentualComissao) / 100; // 🔥 CALCULA AQUI!
        
        console.log('💰 Preço do serviço:', precoServico);
        console.log('📊 Percentual de comissão do serviço:', percentualComissao, '%');
        console.log('💰 Valor da comissão calculada:', valorComissao);
        
        db.query(
            `INSERT INTO agendamentos 
            (cliente_id, funcionario_id, servico_id, data_hora, status, observacoes, 
             valor_comissao, percentual_comissao, valor, forma_pagamento, bandeira_cartao, parcelas, data_pagamento) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [cliente_id, funcionario_id, servico_id, dataHoraParaSalvar, status || 'agendado', 
             observacoes || '', 
             valorComissao,        // 🔥 CALCULADO NO BACKEND!
             percentualComissao,   // 🔥 BUSCADO DO BANCO!
             precoServico,
             forma_pagamento, 
             bandeira_cartao, 
             parcelas || 1, 
             data_pagamento],
            (err, result) => {
                if (err) {
                    console.error('❌ Erro ao criar agendamento:', err);
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                const agendamentoId = result.insertId;
                console.log('✅ Agendamento criado com ID:', agendamentoId);
                
                // 2. SE FOR CONCLUÍDO, INSERIR NA TABELA VENDAS
                if (status === 'concluido') {
                    console.log('🟢 STATUS É CONCLUÍDO - Inserindo na tabela vendas...');
                    
                    db.query(
                        `INSERT INTO vendas (funcionario_id, cliente_id, data_venda, valor_total, forma_pagamento) 
                         VALUES (?, ?, ?, ?, ?)`,
                        [funcionario_id, cliente_id, dataFormatada, precoServico, forma_pagamento || 'dinheiro'],
                        (errVenda, resultVenda) => {
                            if (errVenda) {
                                console.error('❌ ERRO AO REGISTRAR VENDA:', errVenda);
                            } else {
                                console.log('✅ VENDA REGISTRADA COM SUCESSO! ID:', resultVenda.insertId);
                            }
                        }
                    );
                } else {
                    console.log('⚪ Status não é concluído (', status, ') - Nenhuma venda registrada');
                }
                
                res.status(201).json({ 
                    id: agendamentoId,
                    message: 'Agendamento criado com sucesso' 
                });
            }
        );
    });
});

// 🔥 ATUALIZAR AGENDAMENTO - SEM CONVERSÃO
app.put('/api/agendamentos/:id', (req, res) => {
    const { 
        cliente_id, 
        funcionario_id, 
        servico_id, 
        data_hora, 
        status, 
        observacoes,
        valor_comissao,
        percentual_comissao,
        forma_pagamento,
        bandeira_cartao,
        parcelas,
        data_pagamento
    } = req.body;
    
    console.log('📥 Atualizando agendamento ID:', req.params.id);
    console.log('📦 DATA_HORA RECEBIDA:', data_hora);
    
    // Primeiro, buscar o agendamento atual para saber o status anterior
    db.query('SELECT * FROM agendamentos WHERE id = ?', [req.params.id], (errSelect, results) => {
        if (errSelect) {
            console.error('❌ Erro ao buscar agendamento:', errSelect);
            res.status(500).json({ error: errSelect.message });
            return;
        }
        
        if (results.length === 0) {
            res.status(404).json({ error: 'Agendamento não encontrado' });
            return;
        }
        
        const agendamentoAtual = results[0];
        const statusAnterior = agendamentoAtual.status;
        
        console.log('📊 Status anterior:', statusAnterior);
        console.log('📊 Novo status:', status);
        
        // 🔥 NÃO CONVERTER - usar exatamente o que veio
        const dataHoraParaSalvar = data_hora;
        const dataFormatada = data_hora ? data_hora.split('T')[0] : null;
        
        console.log('📅 DATA_HORA PARA SALVAR:', dataHoraParaSalvar);
        console.log('📅 DATA PARA VENDA:', dataFormatada);
        
        // Buscar o preço do serviço
        db.query('SELECT preco FROM servicos WHERE id = ?', [servico_id], (errServ, resultServ) => {
            if (errServ) {
                console.error('Erro ao buscar serviço:', errServ);
                return res.status(500).json({ error: errServ.message });
            }
            
            const precoServico = resultServ[0]?.preco || 0;
            
            // Atualizar o agendamento
            db.query(
                `UPDATE agendamentos SET 
                cliente_id = ?, 
                funcionario_id = ?, 
                servico_id = ?, 
                data_hora = ?, 
                status = ?, 
                observacoes = ?,
                valor_comissao = ?,
                percentual_comissao = ?,
                forma_pagamento = ?,
                bandeira_cartao = ?,
                parcelas = ?,
                data_pagamento = ?
                WHERE id = ?`,
                [cliente_id, funcionario_id, servico_id, dataHoraParaSalvar, status, observacoes, 
                 valor_comissao, percentual_comissao, forma_pagamento, bandeira_cartao, 
                 parcelas || 1, data_pagamento, req.params.id],
                (err, result) => {
                    if (err) {
                        console.error('❌ Erro ao atualizar agendamento:', err);
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    
                    if (result.affectedRows === 0) {
                        res.status(404).json({ error: 'Agendamento não encontrado' });
                        return;
                    }
                    
                    console.log('✅ Agendamento atualizado com sucesso');
                    
                    // Lógica de vendas (igual ao POST)
                    if (status === 'concluido' && statusAnterior !== 'concluido') {
                        console.log('🟢 STATUS MUDOU PARA CONCLUÍDO - Inserindo venda...');
                        db.query(
                            `INSERT INTO vendas (funcionario_id, cliente_id, data_venda, valor_total, forma_pagamento) 
                             VALUES (?, ?, ?, ?, ?)`,
                            [funcionario_id, cliente_id, dataFormatada, precoServico, forma_pagamento || 'dinheiro'],
                            (errVenda) => {
                                if (errVenda) console.error('❌ Erro ao registrar venda:', errVenda);
                                else console.log('✅ Venda registrada');
                            }
                        );
                    } else if (statusAnterior === 'concluido' && status !== 'concluido') {
                        console.log('🟠 DEIXOU DE SER CONCLUÍDO - Removendo venda...');
                        db.query(
                            'DELETE FROM vendas WHERE funcionario_id = ? AND data_venda = ?',
                            [funcionario_id, dataFormatada],
                            (errVenda) => {
                                if (errVenda) console.error('❌ Erro ao remover venda:', errVenda);
                                else console.log('✅ Venda removida');
                            }
                        );
                    } else if (status === 'concluido' && statusAnterior === 'concluido') {
                        console.log('🔵 PERMANECE CONCLUÍDO - Atualizando venda...');
                        db.query(
                            'UPDATE vendas SET valor_total = ?, forma_pagamento = ? WHERE funcionario_id = ? AND data_venda = ?',
                            [precoServico, forma_pagamento, funcionario_id, dataFormatada],
                            (errVenda) => {
                                if (errVenda) console.error('❌ Erro ao atualizar venda:', errVenda);
                                else console.log('✅ Venda atualizada');
                            }
                        );
                    }
                    
                    res.json({ message: 'Agendamento atualizado com sucesso' });
                }
            );
        });
    });
});

// Excluir agendamento
app.delete('/api/agendamentos/:id', (req, res) => {
    console.log('📥 Excluindo agendamento ID:', req.params.id);
    
    db.query('SELECT * FROM agendamentos WHERE id = ?', [req.params.id], (err, results) => {
        if (err) {
            console.error('❌ Erro ao buscar agendamento:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (results.length === 0) {
            res.status(404).json({ error: 'Agendamento não encontrado' });
            return;
        }
        
        const agendamento = results[0];
        
        db.query('DELETE FROM agendamentos WHERE id = ?', [req.params.id], (errDelete, resultDelete) => {
            if (errDelete) {
                console.error('❌ Erro ao deletar agendamento:', errDelete);
                res.status(500).json({ error: errDelete.message });
                return;
            }
            
            if (agendamento.status === 'concluido') {
                // 🔥 CORREÇÃO: Verificar o tipo de data_hora
                let dataFormatada;
                
                if (agendamento.data_hora instanceof Date) {
                    // Se for objeto Date, formatar para YYYY-MM-DD
                    const ano = agendamento.data_hora.getFullYear();
                    const mes = String(agendamento.data_hora.getMonth() + 1).padStart(2, '0');
                    const dia = String(agendamento.data_hora.getDate()).padStart(2, '0');
                    dataFormatada = `${ano}-${mes}-${dia}`;
                    console.log('📅 Data do objeto Date:', dataFormatada);
                } else if (typeof agendamento.data_hora === 'string') {
                    // Se for string, extrair a data
                    dataFormatada = agendamento.data_hora.split('T')[0];
                    console.log('📅 Data da string:', dataFormatada);
                } else {
                    // Fallback
                    dataFormatada = new Date(agendamento.data_hora).toISOString().split('T')[0];
                    console.log('📅 Data convertida:', dataFormatada);
                }
                
                console.log('🗑️ Removendo venda para data:', dataFormatada);
                
                db.query(
                    'DELETE FROM vendas WHERE funcionario_id = ? AND data_venda = ?',
                    [agendamento.funcionario_id, dataFormatada],
                    (errVenda) => {
                        if (errVenda) {
                            console.error('❌ Erro ao remover venda:', errVenda);
                        } else {
                            console.log('✅ Venda removida com sucesso');
                        }
                    }
                );
            }
            
            res.json({ message: 'Agendamento excluído com sucesso' });
        });
    });
});

// ============================================
// ROTAS DE FINANCEIRO - COMPLETAS E CORRIGIDAS
// ============================================

// Listar vendas com filtro opcional por mês/ano (CORRIGIDO)
app.get('/api/financeiro/vendas', (req, res) => {
    console.log('\n=== 📊 ROTA /api/financeiro/vendas ACESSADA ===');
    console.log('📌 Query params recebidos:', req.query);
    
    const { mes, ano, funcionario_id } = req.query;
    
    // Construir query base
    let query = `
        SELECT v.*, f.nome as funcionario_nome
        FROM vendas v
        LEFT JOIN funcionarios f ON v.funcionario_id = f.id
        WHERE 1=1
    `;
    const params = [];
    
    // Adicionar filtro de mês/ano se fornecidos
    if (mes !== undefined && mes !== null && mes !== '' && 
        ano !== undefined && ano !== null && ano !== '') {
        
        // CORREÇÃO: NÃO converter o mês! O frontend já envia 1-12
        const mesNum = parseInt(mes);
        const anoNum = parseInt(ano);
        
        console.log('📅 Mês:', mesNum, 'Ano:', anoNum);
        
        query += ' AND MONTH(v.data_venda) = ? AND YEAR(v.data_venda) = ?';
        params.push(mesNum, anoNum);
    }
    
    // Adicionar filtro de funcionário se fornecido
    if (funcionario_id && funcionario_id !== 'undefined' && funcionario_id !== '') {
        query += ' AND v.funcionario_id = ?';
        params.push(parseInt(funcionario_id));
    }
    
    query += ' ORDER BY v.data_venda DESC';
    
    console.log('📝 Query:', query);
    console.log('📦 Params:', params);
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('❌ Erro na query:', err);
            console.error('❌ SQL:', err.sql);
            console.error('❌ Mensagem:', err.sqlMessage);
            
            res.status(500).json({ 
                error: 'Erro ao buscar vendas',
                details: err.message,
                sqlMessage: err.sqlMessage 
            });
            return;
        }
        
        console.log(`✅ Vendas encontradas: ${results.length}`);
        res.json(results);
    });
});

// Listar despesas com filtro opcional por mês/ano (CORRIGIDO)
app.get('/api/financeiro/despesas', (req, res) => {
    console.log('\n=== 📝 ROTA /api/financeiro/despesas ACESSADA ===');
    console.log('📌 Query params:', req.query);
    
    const { mes, ano } = req.query;
    
    let query = 'SELECT * FROM despesas WHERE 1=1';
    const params = [];
    
    if (mes !== undefined && mes !== null && mes !== '' && 
        ano !== undefined && ano !== null && ano !== '') {
        
        // CORREÇÃO: NÃO converter o mês
        const mesNum = parseInt(mes);
        const anoNum = parseInt(ano);
        
        query += ' AND MONTH(data) = ? AND YEAR(data) = ?';
        params.push(mesNum, anoNum);
    }
    
    query += ' ORDER BY data DESC';
    
    console.log('📝 Query:', query);
    console.log('📦 Params:', params);
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('❌ Erro ao listar despesas:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log(`✅ Despesas encontradas: ${results.length}`);
        res.json(results);
    });
});

// Adicionar despesa
app.post('/api/financeiro/despesas', (req, res) => {
    console.log('\n=== ➕ ROTA /api/financeiro/despesas (POST) ACESSADA ===');
    console.log('📦 Body:', req.body);
    
    const { descricao, categoria, data, valor, formaPagamento } = req.body;
    
    if (!descricao || !valor) {
        res.status(400).json({ error: 'Descrição e valor são obrigatórios' });
        return;
    }
    
    const dataDespesa = data || new Date().toISOString().split('T')[0];
    const valorNumerico = parseFloat(valor);
    
    db.query(
        'INSERT INTO despesas (descricao, categoria, data, valor, forma_pagamento) VALUES (?, ?, ?, ?, ?)',
        [descricao, categoria || 'Outros', dataDespesa, valorNumerico, formaPagamento || 'Dinheiro'],
        (err, result) => {
            if (err) {
                console.error('❌ Erro ao adicionar despesa:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log(`✅ Despesa adicionada com ID: ${result.insertId}`);
            res.status(201).json({ 
                id: result.insertId,
                message: 'Despesa adicionada com sucesso' 
            });
        }
    );
});

// Atualizar despesa
app.put('/api/financeiro/despesas/:id', (req, res) => {
    console.log('\n=== ✏️ ROTA /api/financeiro/despesas/:id (PUT) ACESSADA ===');
    console.log('📌 ID:', req.params.id);
    console.log('📦 Body:', req.body);
    
    const { descricao, categoria, data, valor, formaPagamento } = req.body;
    const id = req.params.id;
    
    db.query(
        'UPDATE despesas SET descricao = ?, categoria = ?, data = ?, valor = ?, forma_pagamento = ? WHERE id = ?',
        [descricao, categoria, data, parseFloat(valor), formaPagamento, id],
        (err, result) => {
            if (err) {
                console.error('❌ Erro ao atualizar despesa:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            if (result.affectedRows === 0) {
                res.status(404).json({ error: 'Despesa não encontrada' });
                return;
            }
            console.log(`✅ Despesa ${id} atualizada`);
            res.json({ message: 'Despesa atualizada com sucesso' });
        }
    );
});

// Remover despesa
app.delete('/api/financeiro/despesas/:id', (req, res) => {
    console.log('\n=== 🗑️ ROTA /api/financeiro/despesas/:id (DELETE) ACESSADA ===');
    console.log('📌 ID:', req.params.id);
    
    const id = req.params.id;
    
    db.query('DELETE FROM despesas WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('❌ Erro ao remover despesa:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Despesa não encontrada' });
            return;
        }
        console.log(`✅ Despesa ${id} removida`);
        res.json({ message: 'Despesa removida com sucesso' });
    });
});

// Resumo financeiro do mês (CORRIGIDO)
app.get('/api/financeiro/resumo', (req, res) => {
    console.log('\n=== 📈 ROTA /api/financeiro/resumo ACESSADA ===');
    console.log('📌 Query params:', req.query);
    
    const { mes, ano } = req.query;
    
    if (!mes || !ano) {
        res.status(400).json({ error: 'Mês e ano são obrigatórios' });
        return;
    }
    
    // CORREÇÃO: NÃO converter o mês
    const mesNum = parseInt(mes);
    const anoNum = parseInt(ano);
    
    console.log('📅 Buscando resumo para:', { mes: mesNum, ano: anoNum });
    
    // Buscar total de vendas
    db.query(
        'SELECT SUM(valor_total) as total FROM vendas WHERE MONTH(data_venda) = ? AND YEAR(data_venda) = ?',
        [mesNum, anoNum],
        (errVendas, resultVendas) => {
            if (errVendas) {
                console.error('❌ Erro ao somar vendas:', errVendas);
                res.status(500).json({ error: errVendas.message });
                return;
            }
            
            // Buscar total de despesas
            db.query(
                'SELECT SUM(valor) as total FROM despesas WHERE MONTH(data) = ? AND YEAR(data) = ?',
                [mesNum, anoNum],
                (errDespesas, resultDespesas) => {
                    if (errDespesas) {
                        console.error('❌ Erro ao somar despesas:', errDespesas);
                        res.status(500).json({ error: errDespesas.message });
                        return;
                    }
                    
                    const totalVendas = resultVendas[0]?.total || 0;
                    const totalDespesas = resultDespesas[0]?.total || 0;
                    
                    console.log('✅ Resumo calculado:', {
                        totalVendas,
                        totalDespesas,
                        lucro: totalVendas - totalDespesas
                    });
                    
                    res.json({
                        totalVendas,
                        totalDespesas,
                        totalComissoes: 0,
                        lucroBruto: totalVendas - totalDespesas,
                        lucroLiquido: totalVendas - totalDespesas
                    });
                }
            );
        }
    );
});

// ============================================
// ROTA DE COMISSÕES - CALCULADA COM BASE NOS AGENDAMENTOS CONCLUÍDOS
// ============================================

app.get('/api/financeiro/comissoes', (req, res) => {
    console.log('\n=== 💰 ROTA /api/financeiro/comissoes ACESSADA ===');
    console.log('📌 Query params:', req.query);
    
    const { mes, ano, funcionario_id } = req.query;
    
    if (!mes || !ano) {
        res.status(400).json({ error: 'Mês e ano são obrigatórios' });
        return;
    }
    
    const mesNum = parseInt(mes);
    const anoNum = parseInt(ano);
    
    let query = `
        SELECT 
            f.id as funcionario_id,
            f.nome as funcionario_nome,
            SUM(a.valor) as total_vendas,
            SUM(a.valor_comissao) as total_comissao
        FROM agendamentos a
        INNER JOIN funcionarios f ON a.funcionario_id = f.id
        WHERE a.status = 'concluido'
        AND MONTH(a.data_hora) = ? 
        AND YEAR(a.data_hora) = ?
    `;
    
    const params = [mesNum, anoNum];
    
    if (funcionario_id && funcionario_id !== 'undefined' && funcionario_id !== '') {
        query += ' AND a.funcionario_id = ?';
        params.push(parseInt(funcionario_id));
    }
    
    query += ' GROUP BY f.id, f.nome ORDER BY total_comissao DESC';
    
    console.log('📝 Query:', query);
    console.log('📦 Params:', params);
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('❌ Erro ao calcular comissões:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        const comissoes = results.map(row => ({
            funcionario_id: row.funcionario_id,
            funcionario_nome: row.funcionario_nome,
            totalVendas: parseFloat(row.total_vendas) || 0,
            comissao: parseFloat(row.total_comissao) || 0
        }));
        
        console.log(`✅ Comissões calculadas para ${comissoes.length} funcionários`);
        console.log('📊 Resultado:', JSON.stringify(comissoes, null, 2));
        res.json(comissoes);
    });
});

// ============================================
// ROTAS DE ESTOQUE - COMPLETAS E CORRIGIDAS
// ============================================

// PRIMEIRO: Rotas específicas (sem :id)
// ============================================

// ✅ ROTA PARA O DASHBOARD: Listar produtos com estoque baixo (DEVE VIR PRIMEIRO)
app.get('/api/estoque/baixo', (req, res) => {
    console.log('📊 Rota /api/estoque/baixo acessada');
    
    db.query(
        'SELECT * FROM produtos WHERE quantidade <= quantidade_minima AND ativo = true ORDER BY quantidade ASC',
        (err, results) => {
            if (err) {
                console.error('❌ Erro ao listar estoque baixo:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log(`✅ ${results.length} produtos com estoque baixo encontrados`);
            res.json(results);
        }
    );
});

// Resumo do estoque (para dashboard)
app.get('/api/estoque/resumo', (req, res) => {
    console.log('📊 Gerando resumo do estoque...');
    
    db.query(
        `SELECT 
            COUNT(*) as total_produtos,
            SUM(CASE WHEN quantidade <= quantidade_minima THEN 1 ELSE 0 END) as estoque_baixo,
            SUM(quantidade * preco_venda) as valor_total,
            COUNT(DISTINCT fornecedor) as total_fornecedores
         FROM produtos WHERE ativo = true`,
        (err, results) => {
            if (err) {
                console.error('❌ Erro ao obter resumo:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log('✅ Resumo do estoque gerado');
            res.json(results[0]);
        }
    );
});

// DEPOIS: Rotas genéricas
// ============================================

// Listar todos os produtos
app.get('/api/estoque', (req, res) => {
    console.log('📦 Listando todos os produtos...');
    db.query('SELECT * FROM produtos WHERE ativo = true ORDER BY nome', (err, results) => {
        if (err) {
            console.error('❌ Erro ao listar produtos:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log(`✅ ${results.length} produtos encontrados`);
        res.json(results);
    });
});

// POR ÚLTIMO: Rotas com parâmetro :id
// ============================================

// Buscar produto por ID
app.get('/api/estoque/:id', (req, res) => {
    const { id } = req.params;
    
    // Verificar se é um número válido (ignorar "baixo" e "resumo")
    if (isNaN(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }
    
    console.log(`🔍 Buscando produto ID: ${id}`);
    
    db.query('SELECT * FROM produtos WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('❌ Erro ao buscar produto:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ error: 'Produto não encontrado' });
            return;
        }
        res.json(results[0]);
    });
});

// Criar novo produto
app.post('/api/estoque', (req, res) => {
    console.log('\n=== ➕ CRIANDO NOVO PRODUTO ===');
    console.log('📦 Dados:', req.body);
    
    const {
        nome, categoria, quantidade, quantidade_minima,
        preco_custo, preco_venda, fornecedor, codigo_barras,
        localizacao, data_ultima_compra, data_validade, observacoes
    } = req.body;

    if (!nome || !categoria) {
        res.status(400).json({ error: 'Nome e categoria são obrigatórios' });
        return;
    }

    db.query(
        `INSERT INTO produtos 
        (nome, categoria, quantidade, quantidade_minima, preco_custo, preco_venda,
         fornecedor, codigo_barras, localizacao, data_ultima_compra, data_validade, observacoes, ativo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)`,
        [nome, categoria, quantidade || 0, quantidade_minima || 5,
         preco_custo, preco_venda, fornecedor, codigo_barras,
         localizacao, data_ultima_compra, data_validade, observacoes || ''],
        (err, result) => {
            if (err) {
                console.error('❌ Erro ao criar produto:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log(`✅ Produto criado com ID: ${result.insertId}`);
            res.status(201).json({
                id: result.insertId,
                message: 'Produto criado com sucesso'
            });
        }
    );
});

// Atualizar produto
app.put('/api/estoque/:id', (req, res) => {
    const { id } = req.params;
    
    if (isNaN(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }
    
    console.log(`\n=== ✏️ ATUALIZANDO PRODUTO ID: ${id} ===`);
    console.log('📦 Dados:', req.body);
    
    const {
        nome, categoria, quantidade, quantidade_minima,
        preco_custo, preco_venda, fornecedor, codigo_barras,
        localizacao, data_ultima_compra, data_validade, observacoes
    } = req.body;

    db.query(
        `UPDATE produtos SET 
         nome = ?, categoria = ?, quantidade = ?, quantidade_minima = ?,
         preco_custo = ?, preco_venda = ?, fornecedor = ?, codigo_barras = ?,
         localizacao = ?, data_ultima_compra = ?, data_validade = ?, observacoes = ?
         WHERE id = ?`,
        [nome, categoria, quantidade, quantidade_minima,
         preco_custo, preco_venda, fornecedor, codigo_barras,
         localizacao, data_ultima_compra, data_validade, observacoes, id],
        (err, result) => {
            if (err) {
                console.error('❌ Erro ao atualizar produto:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            if (result.affectedRows === 0) {
                res.status(404).json({ error: 'Produto não encontrado' });
                return;
            }
            console.log(`✅ Produto ${id} atualizado com sucesso`);
            res.json({ message: 'Produto atualizado com sucesso' });
        }
    );
});

// Excluir produto (soft delete)
app.delete('/api/estoque/:id', (req, res) => {
    const { id } = req.params;
    
    if (isNaN(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }
    
    console.log(`\n=== 🗑️ EXCLUINDO PRODUTO ID: ${id} ===`);
    
    db.query('UPDATE produtos SET ativo = false WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('❌ Erro ao excluir produto:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Produto não encontrado' });
            return;
        }
        console.log(`✅ Produto ${id} excluído com sucesso`);
        res.json({ message: 'Produto excluído com sucesso' });
    });
});

// Registrar movimentação
app.post('/api/estoque/movimentacao', (req, res) => {
    console.log('\n=== 📦 REGISTRANDO MOVIMENTAÇÃO ===');
    console.log('📦 Dados:', req.body);
    
    const { produto_id, tipo, quantidade, motivo, valor_unitario } = req.body;

    if (!produto_id || !tipo || !quantidade) {
        res.status(400).json({ error: 'Produto, tipo e quantidade são obrigatórios' });
        return;
    }

    // Iniciar transação
    db.beginTransaction(err => {
        if (err) {
            console.error('❌ Erro ao iniciar transação:', err);
            res.status(500).json({ error: err.message });
            return;
        }

        // Registrar movimentação
        db.query(
            `INSERT INTO movimentacoes_estoque 
             (produto_id, tipo, quantidade, motivo, valor_unitario) 
             VALUES (?, ?, ?, ?, ?)`,
            [produto_id, tipo, quantidade, motivo, valor_unitario],
            (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('❌ Erro ao registrar movimentação:', err);
                        res.status(500).json({ error: err.message });
                    });
                }

                // Atualizar quantidade do produto
                const operacao = tipo === 'entrada' ? '+' : '-';
                db.query(
                    `UPDATE produtos SET quantidade = quantidade ${operacao} ? WHERE id = ?`,
                    [quantidade, produto_id],
                    (err, updateResult) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error('❌ Erro ao atualizar quantidade:', err);
                                res.status(500).json({ error: err.message });
                            });
                        }

                        db.commit(err => {
                            if (err) {
                                return db.rollback(() => {
                                    console.error('❌ Erro ao commitar transação:', err);
                                    res.status(500).json({ error: err.message });
                                });
                            }
                            console.log(`✅ Movimentação registrada com ID: ${result.insertId}`);
                            res.status(201).json({
                                id: result.insertId,
                                message: 'Movimentação registrada com sucesso'
                            });
                        });
                    }
                );
            }
        );
    });
});

// Listar movimentações de um produto
app.get('/api/estoque/:id/movimentacoes', (req, res) => {
    const { id } = req.params;
    
    if (isNaN(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }
    
    console.log(`📋 Listando movimentações do produto ID: ${id}`);
    
    db.query(
        'SELECT * FROM movimentacoes_estoque WHERE produto_id = ? ORDER BY data_movimentacao DESC',
        [id],
        (err, results) => {
            if (err) {
                console.error('❌ Erro ao listar movimentações:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log(`✅ ${results.length} movimentações encontradas`);
            res.json(results);
        }
    );
});

// ============================================
// ROTA PARA VENDA DE PRODUTOS (INTEGRAÇÃO COM FINANCEIRO)
// ============================================

app.post('/api/estoque/vender', (req, res) => {
    console.log('\n=== 💰 VENDA DE PRODUTO ===');
    console.log('📦 Dados recebidos:', req.body);
    
    const { 
        produto_id, 
        produto_nome,
        quantidade, 
        valor_unitario,
        valor_total, 
        cliente_id, 
        forma_pagamento, 
        bandeira_cartao, 
        parcelas, 
        observacoes,
        data_venda
    } = req.body;
    
    if (!produto_id || !quantidade || !valor_total) {
        return res.status(400).json({ error: 'Produto, quantidade e valor total são obrigatórios' });
    }
    
    // Verificar se o produto tem estoque suficiente
    db.query('SELECT quantidade FROM produtos WHERE id = ? AND ativo = true', [produto_id], (err, produto) => {
        if (err) {
            console.error('❌ Erro ao buscar produto:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (produto.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        if (produto[0].quantidade < quantidade) {
            return res.status(400).json({ error: 'Estoque insuficiente' });
        }
        
        // Iniciar transação
        db.beginTransaction(err => {
            if (err) {
                console.error('❌ Erro ao iniciar transação:', err);
                return res.status(500).json({ error: err.message });
            }
            
            // 1. Registrar movimentação de saída do estoque
            db.query(
                `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, valor_unitario) 
                 VALUES (?, 'saida', ?, ?, ?)`,
                [produto_id, quantidade, `Venda de ${produto_nome}`, valor_unitario],
                (err, movResult) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('❌ Erro ao registrar movimentação:', err);
                            res.status(500).json({ error: err.message });
                        });
                    }
                    
                    // 2. Atualizar quantidade do produto
                    db.query(
                        'UPDATE produtos SET quantidade = quantidade - ? WHERE id = ?',
                        [quantidade, produto_id],
                        (err, updateResult) => {
                            if (err) {
                                return db.rollback(() => {
                                    console.error('❌ Erro ao atualizar quantidade:', err);
                                    res.status(500).json({ error: err.message });
                                });
                            }
                            
                            // 3. Usar a data fornecida ou a data atual
                            const dataVendaFinal = data_venda || new Date().toISOString().split('T')[0];
                            
                            // 4. Criar descrição detalhada da venda
                            const descricaoVenda = `${quantidade}x ${produto_nome} - R$ ${parseFloat(valor_unitario).toFixed(2)} cada`;
                            
                            // 5. Verificar se as colunas adicionais existem na tabela vendas
                            // Primeiro, vamos verificar a estrutura da tabela
                            db.query("SHOW COLUMNS FROM vendas LIKE 'tipo_venda'", (err, columnExists) => {
                                if (err) {
                                    console.log('⚠️ Erro ao verificar coluna, usando insert básico');
                                    
                                    // Fallback: insert básico sem as novas colunas
                                    db.query(
                                        `INSERT INTO vendas (funcionario_id, cliente_id, data_venda, valor_total, forma_pagamento) 
                                         VALUES (NULL, ?, ?, ?, ?)`,
                                        [cliente_id || null, dataVendaFinal, valor_total, forma_pagamento || 'dinheiro'],
                                        (err, vendaResult) => {
                                            if (err) {
                                                return db.rollback(() => {
                                                    console.error('❌ Erro ao registrar venda no financeiro:', err);
                                                    res.status(500).json({ error: err.message });
                                                });
                                            }
                                            
                                            // Commit da transação
                                            db.commit(err => {
                                                if (err) {
                                                    return db.rollback(() => {
                                                        console.error('❌ Erro ao commitar transação:', err);
                                                        res.status(500).json({ error: err.message });
                                                    });
                                                }
                                                
                                                console.log('✅ Venda registrada com sucesso (básico)!');
                                                res.status(201).json({
                                                    message: 'Venda registrada com sucesso',
                                                    movimentacao_id: movResult.insertId,
                                                    venda_id: vendaResult.insertId
                                                });
                                            });
                                        }
                                    );
                                } else {
                                    // Colunas existem, usar insert completo
                                    db.query(
                                        `INSERT INTO vendas 
                                         (funcionario_id, cliente_id, data_venda, valor_total, forma_pagamento, 
                                          tipo_venda, produto_id, quantidade, descricao_detalhada) 
                                         VALUES (NULL, ?, ?, ?, ?, 'produto', ?, ?, ?)`,
                                        [cliente_id || null, dataVendaFinal, valor_total, forma_pagamento || 'dinheiro', 
                                         produto_id, quantidade, descricaoVenda],
                                        (err, vendaResult) => {
                                            if (err) {
                                                return db.rollback(() => {
                                                    console.error('❌ Erro ao registrar venda no financeiro:', err);
                                                    res.status(500).json({ error: err.message });
                                                });
                                            }
                                            
                                            // Commit da transação
                                            db.commit(err => {
                                                if (err) {
                                                    return db.rollback(() => {
                                                        console.error('❌ Erro ao commitar transação:', err);
                                                        res.status(500).json({ error: err.message });
                                                    });
                                                }
                                                
                                                console.log('✅ Venda registrada com sucesso (completo)!');
                                                console.log('📦 Produto:', produto_nome);
                                                console.log('📅 Data:', dataVendaFinal);
                                                
                                                res.status(201).json({
                                                    message: 'Venda registrada com sucesso',
                                                    movimentacao_id: movResult.insertId,
                                                    venda_id: vendaResult.insertId,
                                                    produto: produto_nome,
                                                    quantidade: quantidade,
                                                    valor_total: valor_total,
                                                    data_venda: dataVendaFinal
                                                });
                                            });
                                        }
                                    );
                                }
                            });
                        }
                    );
                }
            );
        });
    });
});

// ============================================
// ROTAS DE CLIENTES
// ============================================

// Listar todos os clientes
app.get('/api/clientes', (req, res) => {
    db.query('SELECT * FROM clientes', (err, results) => {
        if (err) {
            console.error('Erro na consulta:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// ============================================
// ROTAS DO CHATBOT - COMPLETAS E CORRIGIDAS
// ============================================

// Status do bot
app.get('/api/bot/status', (req, res) => {
    console.log('🤖 Verificando status do bot');
    res.json({ 
        online: true,
        desde: new Date().toISOString(),
        versao: '1.0.0'
    });
});

// LISTAR SERVIÇOS
app.get('/api/bot/servicos', (req, res) => {
    console.log('📋 Buscando serviços para o bot...');
    db.query('SELECT id, nome, preco, duracao_minutos FROM servicos ORDER BY nome', (err, results) => {
        if (err) {
            console.error('❌ Erro ao buscar serviços:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log(`✅ ${results.length} serviços encontrados`);
        res.json(results);
    });
});

// LISTAR PROFISSIONAIS
app.get('/api/bot/profissionais', (req, res) => {
    console.log('👤 Buscando profissionais para o bot...');
    db.query('SELECT id, nome, especialidade FROM funcionarios WHERE ativo = true ORDER BY nome', (err, results) => {
        if (err) {
            console.error('❌ Erro ao buscar profissionais:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log(`✅ ${results.length} profissionais encontrados`);
        res.json(results);
    });
});

// VERIFICAR DISPONIBILIDADE COM PROFISSIONAIS
app.get('/api/bot/disponibilidade', (req, res) => {
    console.log('📅 Verificando disponibilidade para o bot...');
    const { data, servico_id } = req.query;
    
    if (!data || !servico_id) {
        return res.status(400).json({ error: 'Data e serviço são obrigatórios' });
    }
    
    db.query('SELECT id, nome, especialidade FROM funcionarios WHERE ativo = true ORDER BY nome', (err, todosProfissionais) => {
        if (err) {
            console.error('❌ Erro ao buscar profissionais:', err);
            return res.status(500).json({ error: err.message });
        }
        
        const totalProfissionais = todosProfissionais.length;
        const horariosDetalhados = [];
        const horariosDisponiveis = [];
        let horariosProcessados = 0;
        
        for (let hora = 9; hora <= 18; hora++) {
            const horario = `${hora.toString().padStart(2, '0')}:00`;
            
            db.query(
                `SELECT funcionario_id FROM agendamentos 
                 WHERE DATE(data_hora) = ? AND HOUR(data_hora) = ? 
                 AND status NOT IN ('cancelado', 'cancelada')`,
                [data, hora],
                (err, agendamentos) => {
                    if (err) {
                        console.error(`Erro na hora ${hora}:`, err);
                        return;
                    }
                    
                    const ocupadosIds = agendamentos.map(a => a.funcionario_id);
                    const disponiveis = todosProfissionais.filter(p => !ocupadosIds.includes(p.id));
                    
                    horariosDetalhados.push({
                        horario,
                        ocupados: ocupadosIds.length,
                        disponiveis: disponiveis.length,
                        profissionais_disponiveis: disponiveis.map(p => ({
                            id: p.id,
                            nome: p.nome,
                            especialidade: p.especialidade
                        }))
                    });
                    
                    if (disponiveis.length > 0) {
                        horariosDisponiveis.push(horario);
                    }
                    
                    horariosProcessados++;
                    
                    if (horariosProcessados === 10) {
                        horariosDetalhados.sort((a, b) => a.horario.localeCompare(b.horario));
                        res.json({
                            data,
                            servico_id,
                            total_profissionais: totalProfissionais,
                            horarios_disponiveis: horariosDisponiveis,
                            horarios_detalhados: horariosDetalhados
                        });
                    }
                }
            );
        }
    });
});

// VERIFICAR AGENDA REAL DO PROFISSIONAL (COM FILTRO DE HORÁRIOS OCUPADOS)
app.get('/api/bot/profissional/:id/agenda', (req, res) => {
    const { id } = req.params;
    
    console.log(`📅 Buscando agenda real do profissional ${id}`);
    
    db.query('SELECT nome FROM funcionarios WHERE id = ? AND ativo = true', [id], (err, profInfo) => {
        if (err || profInfo.length === 0) {
            return res.status(404).json({ error: 'Profissional não encontrado' });
        }
        
        const profissional = profInfo[0];
        
        // Buscar TODOS os agendamentos do profissional nos próximos 30 dias
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const fim = new Date(hoje);
        fim.setDate(fim.getDate() + 30);
        
        const hojeStr = hoje.toISOString().split('T')[0];
        const fimStr = fim.toISOString().split('T')[0];
        
        console.log(`📅 Período: ${hojeStr} até ${fimStr}`);
        
        db.query(
            `SELECT DATE(data_hora) as data, HOUR(data_hora) as hora, status
             FROM agendamentos 
             WHERE funcionario_id = ? 
             AND DATE(data_hora) >= ?
             AND DATE(data_hora) <= ?
             AND status NOT IN ('cancelado', 'cancelada')`,
            [id, hojeStr, fimStr],
            (err, agendamentos) => {
                if (err) {
                    console.error('❌ Erro ao buscar agendamentos:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                console.log(`📊 Agendamentos encontrados: ${agendamentos.length}`);
                
                // Mapear horários ocupados por dia
                const ocupados = {};
                agendamentos.forEach(ag => {
                    if (!ocupados[ag.data]) {
                        ocupados[ag.data] = [];
                    }
                    ocupados[ag.data].push(ag.hora);
                });
                
                console.log('📅 Horários ocupados:', JSON.stringify(ocupados, null, 2));
                
                // Gerar dias disponíveis para os próximos 14 dias
                const diasDisponiveis = [];
                const dataAtual = new Date(hoje);
                
                for (let i = 0; i < 14; i++) {
                    const dataStr = dataAtual.toISOString().split('T')[0];
                    const diaSemana = dataAtual.getDay();
                    const mes = dataAtual.getMonth() + 1;
                    const dia = dataAtual.getDate();
                    const ano = dataAtual.getFullYear();
                    
                    const dataFormatada = `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${ano}`;
                    
                    // Verificar se é dia de funcionamento (segunda a sábado)
                    if (diaSemana !== 0) {
                        const horariosDisponiveis = [];
                        const ocupadosHoje = ocupados[dataStr] || [];
                        
                        console.log(`📅 ${dataFormatada}: ocupados = [${ocupadosHoje.join(', ')}]`);
                        
                        // Horários de funcionamento: 9h às 18h
                        for (let hora = 9; hora <= 18; hora++) {
                            const horario = `${hora.toString().padStart(2, '0')}:00`;
                            if (!ocupadosHoje.includes(hora)) {
                                horariosDisponiveis.push(horario);
                            }
                        }
                        
                        if (horariosDisponiveis.length > 0) {
                            diasDisponiveis.push({
                                data: dataStr,
                                data_formatada: dataFormatada,
                                dia_semana: diaSemana,
                                horarios_disponiveis: horariosDisponiveis,
                                total_horarios: horariosDisponiveis.length
                            });
                        }
                    }
                    
                    dataAtual.setDate(dataAtual.getDate() + 1);
                }
                
                console.log(`✅ Dias com horários: ${diasDisponiveis.length}`);
                
                res.json({
                    profissional_id: id,
                    profissional_nome: profissional.nome,
                    dias_disponiveis: diasDisponiveis
                });
            }
        );
    });
});

// ============================================
// NOVAS ROTAS PARA O BOT INTELIGENTE
// ============================================

// BUSCAR CLIENTE POR TELEFONE OU NOME
app.get('/api/bot/clientes/buscar', (req, res) => {
    const { telefone, nome } = req.query;
    
    console.log('🔍 Buscando cliente:', { telefone, nome });
    
    let query = 'SELECT id, nome, telefone, email FROM clientes WHERE ';
    let params = [];
    
    if (telefone) {
        query += 'telefone LIKE ?';
        params.push(`%${telefone}%`);
    } else if (nome) {
        query += 'nome LIKE ?';
        params.push(`%${nome}%`);
    } else {
        return res.json([]);
    }
    
    query += ' LIMIT 5';
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('❌ Erro ao buscar cliente:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log(`✅ ${results.length} clientes encontrados`);
        res.json(results);
    });
});

// BUSCAR AGENDAMENTOS DO CLIENTE
app.get('/api/bot/clientes/:id/agendamentos', (req, res) => {
    const { id } = req.params;
    
    console.log(`📅 Buscando agendamentos do cliente ${id}`);
    
    db.query(
        `SELECT a.id, a.data_hora, a.status, 
                f.nome as profissional_nome,
                s.nome as servico_nome,
                s.preco as valor
         FROM agendamentos a
         LEFT JOIN funcionarios f ON a.funcionario_id = f.id
         LEFT JOIN servicos s ON a.servico_id = s.id
         WHERE a.cliente_id = ?
         ORDER BY a.data_hora DESC`,
        [id],
        (err, results) => {
            if (err) {
                console.error('❌ Erro ao buscar agendamentos:', err);
                return res.status(500).json({ error: err.message });
            }
            console.log(`✅ ${results.length} agendamentos encontrados`);
            res.json(results);
        }
    );
});

// CRIAR CLIENTE VIA BOT
app.post('/api/bot/clientes', (req, res) => {
    const { nome, telefone } = req.body;
    
    console.log('📝 Criando novo cliente:', { nome, telefone });
    
    if (!nome || !telefone) {
        return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
    }
    
    db.query(
        'INSERT INTO clientes (nome, telefone) VALUES (?, ?)',
        [nome, telefone],
        (err, result) => {
            if (err) {
                console.error('❌ Erro ao criar cliente:', err);
                return res.status(500).json({ error: err.message });
            }
            console.log(`✅ Cliente criado ID: ${result.insertId}`);
            res.json({ id: result.insertId, nome, telefone });
        }
    );
});

// CANCELAR AGENDAMENTO VIA BOT
app.put('/api/bot/agendamentos/:id/cancelar', (req, res) => {
    const { id } = req.params;
    
    console.log(`🗑️ Cancelando agendamento ID: ${id}`);
    
    db.query(
        'UPDATE agendamentos SET status = ? WHERE id = ?',
        ['cancelado', id],
        (err, result) => {
            if (err) {
                console.error('❌ Erro ao cancelar agendamento:', err);
                return res.status(500).json({ error: err.message });
            }
            console.log(`✅ Agendamento ${id} cancelado`);
            res.json({ success: true, message: 'Agendamento cancelado com sucesso' });
        }
    );
});

// CRIAR AGENDAMENTO COM ESCOLHA DE PROFISSIONAL (CORRIGIDO)
app.post('/api/bot/agendamentos', (req, res) => {
    console.log('\n=== 📝 CRIANDO AGENDAMENTO VIA BOT ===');
    console.log('📦 Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    const { nome_cliente, telefone_cliente, servico_id, data, horario, profissional_id } = req.body;
    
    if (!nome_cliente || !telefone_cliente || !servico_id || !data || !horario) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }
    
    // 🔥 VERIFICAR SE O HORÁRIO JÁ ESTÁ OCUPADO
    const dataHora = `${data} ${horario}:00`;
    const hora = horario.split(':')[0];
    
    db.query(
        `SELECT id FROM agendamentos 
         WHERE funcionario_id = ? 
         AND DATE(data_hora) = ? 
         AND HOUR(data_hora) = ? 
         AND status NOT IN ('cancelado', 'cancelada')`,
        [profissional_id, data, hora],
        (err, ocupado) => {
            if (err) {
                console.error('❌ Erro ao verificar disponibilidade:', err);
                return res.status(500).json({ error: 'Erro ao verificar disponibilidade' });
            }
            
            if (ocupado.length > 0) {
                console.log(`⚠️ Horário ${data} ${horario} já está ocupado!`);
                return res.status(400).json({ 
                    error: 'Horário não disponível',
                    message: 'Este horário já está reservado. Escolha outro horário.'
                });
            }
            
            // Continuar com a criação do agendamento...
            db.query('SELECT id, nome, preco FROM servicos WHERE id = ?', [servico_id], (err, servicoResult) => {
                if (err || servicoResult.length === 0) {
                    return res.status(404).json({ error: 'Serviço não encontrado' });
                }
                
                const servico = servicoResult[0];
                const preco = parseFloat(servico.preco);
                const valor_comissao = preco * 0.3;
                
                db.query('SELECT id FROM clientes WHERE telefone = ?', [telefone_cliente], (err, clienteResult) => {
                    if (err) return res.status(500).json({ error: 'Erro ao buscar cliente' });
                    
                    let cliente_id;
                    
                    if (clienteResult.length > 0) {
                        cliente_id = clienteResult[0].id;
                        criarAgendamento(cliente_id);
                    } else {
                        db.query(
                            'INSERT INTO clientes (nome, telefone) VALUES (?, ?)',
                            [nome_cliente, telefone_cliente],
                            (err, result) => {
                                if (err) return res.status(500).json({ error: 'Erro ao criar cliente' });
                                cliente_id = result.insertId;
                                criarAgendamento(cliente_id);
                            }
                        );
                    }
                    
                    function criarAgendamento(cliente_id) {
                        const query = `
                            INSERT INTO agendamentos 
                            (cliente_id, funcionario_id, servico_id, data_hora, status, valor, valor_comissao) 
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        `;
                        
                        db.query(
                            query,
                            [cliente_id, profissional_id, servico_id, dataHora, 'agendado', preco, valor_comissao],
                            (err, result) => {
                                if (err) {
                                    console.error('❌ Erro ao criar agendamento:', err);
                                    return res.status(500).json({ error: 'Erro ao criar agendamento' });
                                }
                                
                                console.log(`✅ Agendamento criado ID: ${result.insertId}`);
                                
                                res.json({ 
                                    success: true, 
                                    id: result.insertId,
                                    message: 'Agendamento criado com sucesso'
                                });
                            }
                        );
                    }
                });
            });
        }
    );
});

// INFO DO SALÃO
app.get('/api/bot/salao', (req, res) => {
    res.json({
        nome: process.env.SALAO_NOME || "Vailson's Hair & Makeup",
        endereco: process.env.SALAO_ENDERECO || "Asa Sul CLS 210 Bloco B Loja 18 - Brasília",
        telefone: process.env.SALAO_TELEFONE || "(61) 3244-4181",
        horario: "Segunda a Sexta: 9h às 19h | Sábado: 9h às 17h",
        instagram: "@vailsonhair"
    });
});

// ROTA DE TESTE
app.get('/api/bot/test', (req, res) => {
    res.json({ message: 'Bot API está funcionando!' });
});

// ============================================
// ROTAS DE SERVIÇOS
// ============================================

// Listar todos os serviços
app.get('/api/servicos', (req, res) => {
    db.query('SELECT * FROM servicos ORDER BY nome', (err, results) => {
        if (err) {
            console.error('Erro ao listar serviços:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Buscar serviço por ID
app.get('/api/servicos/:id', (req, res) => {
    db.query('SELECT * FROM servicos WHERE id = ?', [req.params.id], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ error: 'Serviço não encontrado' });
            return;
        }
        res.json(results[0]);
    });
});


// ============================================
// ROTAS DE SERVIÇOS - CRUD COMPLETO
// ============================================

// LISTAR todos os serviços
app.get('/api/servicos', (req, res) => {
    db.query('SELECT * FROM servicos ORDER BY nome', (err, results) => {
        if (err) {
            console.error('❌ Erro ao listar serviços:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('✅ Serviços listados:', results.length);
        res.json(results);
    });
});

// BUSCAR serviço por ID
app.get('/api/servicos/:id', (req, res) => {
    const { id } = req.params;
    
    db.query('SELECT * FROM servicos WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('❌ Erro ao buscar serviço:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ error: 'Serviço não encontrado' });
            return;
        }
        res.json(results[0]);
    });
});

// CRIAR novo serviço (a que está faltando!)
app.post('/api/servicos', (req, res) => {
    console.log('\n=== ➕ CRIAR NOVO SERVIÇO ===');
    console.log('📦 Dados recebidos:', req.body);
    
    const { nome, categoria, preco, duracao_minutos, comissao_percentual, descricao } = req.body;
    
    // Validações
    if (!nome || !categoria || !preco) {
        console.log('❌ Campos obrigatórios faltando');
        res.status(400).json({ error: 'Nome, categoria e preço são obrigatórios' });
        return;
    }
    
    const precoNum = parseFloat(preco);
    if (isNaN(precoNum) || precoNum <= 0) {
        res.status(400).json({ error: 'Preço deve ser um número válido maior que zero' });
        return;
    }
    
    const duracao = parseInt(duracao_minutos) || 30;
    const comissao = parseInt(comissao_percentual) || 30;
    
    db.query(
        `INSERT INTO servicos (nome, categoria, preco, duracao_minutos, comissao_percentual, descricao) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nome, categoria, precoNum, duracao, comissao, descricao || ''],
        (err, result) => {
            if (err) {
                console.error('❌ Erro ao criar serviço:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log('✅ Serviço criado com ID:', result.insertId);
            res.status(201).json({ 
                id: result.insertId,
                message: 'Serviço criado com sucesso' 
            });
        }
    );
});

// ATUALIZAR serviço completo
app.put('/api/servicos/:id', (req, res) => {
    console.log('\n=== ✏️ ATUALIZAR SERVIÇO ===');
    console.log('📌 ID:', req.params.id);
    console.log('📦 Dados:', req.body);
    
    const { id } = req.params;
    const { nome, categoria, preco, duracao_minutos, comissao_percentual, descricao } = req.body;
    
    if (!nome || !categoria || !preco) {
        res.status(400).json({ error: 'Nome, categoria e preço são obrigatórios' });
        return;
    }
    
    const precoNum = parseFloat(preco);
    const duracao = parseInt(duracao_minutos) || 30;
    const comissao = parseInt(comissao_percentual) || 30;
    
    db.query(
        `UPDATE servicos SET 
         nome = ?, 
         categoria = ?, 
         preco = ?, 
         duracao_minutos = ?, 
         comissao_percentual = ?, 
         descricao = ?
         WHERE id = ?`,
        [nome, categoria, precoNum, duracao, comissao, descricao || '', id],
        (err, result) => {
            if (err) {
                console.error('❌ Erro ao atualizar serviço:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            if (result.affectedRows === 0) {
                res.status(404).json({ error: 'Serviço não encontrado' });
                return;
            }
            console.log('✅ Serviço atualizado com sucesso');
            res.json({ message: 'Serviço atualizado com sucesso' });
        }
    );
});

// ATUALIZAR apenas comissão (você já tem essa)
app.put('/api/servicos/:id/comissao', (req, res) => {
    const { id } = req.params;
    const { comissao } = req.body;
    
    db.query(
        'UPDATE servicos SET comissao_percentual = ? WHERE id = ?',
        [comissao, id],
        (err, result) => {
            if (err) {
                console.error('Erro ao atualizar comissão:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            if (result.affectedRows === 0) {
                res.status(404).json({ error: 'Serviço não encontrado' });
                return;
            }
            res.json({ message: 'Comissão atualizada com sucesso' });
        }
    );
});

// ATUALIZAR comissão por categoria (você já tem essa)
app.put('/api/servicos/categoria/comissao', (req, res) => {
    const { categoria, comissao } = req.body;
    
    db.query(
        'UPDATE servicos SET comissao_percentual = ? WHERE categoria = ?',
        [comissao, categoria],
        (err, result) => {
            if (err) {
                console.error('Erro ao atualizar comissões por categoria:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ 
                message: `Comissão atualizada para ${result.affectedRows} serviços da categoria ${categoria}` 
            });
        }
    );
});

// REMOVER serviço (a que está faltando!)
app.delete('/api/servicos/:id', (req, res) => {
    console.log('\n=== 🗑️ REMOVER SERVIÇO ===');
    console.log('📌 ID:', req.params.id);
    
    const { id } = req.params;
    
    // Verificar se o serviço está sendo usado em agendamentos
    db.query('SELECT COUNT(*) as total FROM agendamentos WHERE servico_id = ?', [id], (errCount, resultCount) => {
        if (errCount) {
            console.error('❌ Erro ao verificar agendamentos:', errCount);
            res.status(500).json({ error: errCount.message });
            return;
        }
        
        const emUso = resultCount[0].total > 0;
        
        if (emUso) {
            console.log('⚠️ Serviço está em uso em agendamentos');
            res.status(400).json({ 
                error: 'Não é possível remover este serviço pois ele está vinculado a agendamentos existentes' 
            });
            return;
        }
        
        // Se não estiver em uso, pode remover
        db.query('DELETE FROM servicos WHERE id = ?', [id], (err, result) => {
            if (err) {
                console.error('❌ Erro ao remover serviço:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            if (result.affectedRows === 0) {
                res.status(404).json({ error: 'Serviço não encontrado' });
                return;
            }
            console.log('✅ Serviço removido com sucesso');
            res.json({ message: 'Serviço removido com sucesso' });
        });
    });
});

// ============================================
// ROTAS DE ADIANTAMENTOS DE FUNCIONÁRIOS
// ============================================

// Buscar adiantamentos de um funcionário
app.get('/api/funcionarios/:id/adiantamentos', (req, res) => {
  const { id } = req.params;
  const { mes, ano } = req.query;
  
  console.log(`📋 Buscando adiantamentos do funcionário ${id} para ${mes}/${ano}`);
  
  db.query(
    'SELECT * FROM adiantamentos WHERE funcionario_id = ? AND mes = ? AND ano = ? ORDER BY data DESC',
    [id, mes, ano],
    (err, results) => {
      if (err) {
        console.error('❌ Erro ao buscar adiantamentos:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(results);
    }
  );
});

// Registrar adiantamento
app.post('/api/funcionarios/:id/adiantamentos', (req, res) => {
  const { id } = req.params;
  const { mes, ano, valor, data, motivo, formaPagamento } = req.body;
  
  console.log(`💰 Registrando adiantamento para funcionário ${id}:`, req.body);
  
  db.query(
    `INSERT INTO adiantamentos 
     (funcionario_id, mes, ano, valor, data, motivo, forma_pagamento) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, mes, ano, valor, data, motivo, formaPagamento],
    (err, result) => {
      if (err) {
        console.error('❌ Erro ao registrar adiantamento:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.status(201).json({
        id: result.insertId,
        message: 'Adiantamento registrado com sucesso'
      });
    }
  );
});

// Remover adiantamento
app.delete('/api/funcionarios/:id/adiantamentos/:adiantamentoId', (req, res) => {
  const { id, adiantamentoId } = req.params;
  
  console.log(`🗑️ Removendo adiantamento ${adiantamentoId} do funcionário ${id}`);
  
  db.query(
    'DELETE FROM adiantamentos WHERE id = ? AND funcionario_id = ?',
    [adiantamentoId, id],
    (err, result) => {
      if (err) {
        console.error('❌ Erro ao remover adiantamento:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (result.affectedRows === 0) {
        res.status(404).json({ error: 'Adiantamento não encontrado' });
        return;
      }
      
      res.json({ message: 'Adiantamento removido com sucesso' });
    }
  );
});

// ============================================
// ROTAS DE PAGAMENTOS
// ============================================

// Registrar pagamento de um agendamento
app.post('/api/pagamentos', (req, res) => {
  const {
    agendamento_id,
    forma_pagamento,
    bandeira_cartao,
    parcelas,
    valor_total,
    valor_comissao,
    percentual_comissao,
    data_pagamento
  } = req.body;

  db.query(
    `INSERT INTO pagamentos 
    (agendamento_id, forma_pagamento, bandeira_cartao, parcelas, valor_total, valor_comissao, percentual_comissao, data_pagamento) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [agendamento_id, forma_pagamento, bandeira_cartao, parcelas, valor_total, valor_comissao, percentual_comissao, data_pagamento],
    (err, result) => {
      if (err) {
        console.error('Erro ao registrar pagamento:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ 
        id: result.insertId,
        message: 'Pagamento registrado com sucesso' 
      });
    }
  );
});

// Listar pagamentos por período
app.get('/api/pagamentos', (req, res) => {
  const { mes, ano, funcionario_id } = req.query;
  
  let query = `
    SELECT p.*, 
           a.cliente_id, 
           c.nome as cliente_nome,
           a.funcionario_id,
           f.nome as funcionario_nome,
           s.nome as servico_nome
    FROM pagamentos p
    JOIN agendamentos a ON p.agendamento_id = a.id
    LEFT JOIN clientes c ON a.cliente_id = c.id
    LEFT JOIN funcionarios f ON a.funcionario_id = f.id
    LEFT JOIN servicos s ON a.servico_id = s.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (mes !== undefined && ano !== undefined) {
    query += ' AND MONTH(p.data_pagamento) = ? AND YEAR(p.data_pagamento) = ?';
    params.push(parseInt(mes) + 1, ano);
  }
  
  if (funcionario_id) {
    query += ' AND a.funcionario_id = ?';
    params.push(funcionario_id);
  }
  
  query += ' ORDER BY p.data_pagamento DESC';
  
  db.query(query, params, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// ============================================
// ROTAS DE CONFIGURAÇÕES DE HORÁRIOS
// ============================================

// Buscar configurações de horários
app.get('/api/configuracoes/horarios', (req, res) => {
    console.log('\n=== 📋 ROTA DE BUSCA DE CONFIGURAÇÕES ACESSADA ===');
    
    // Verificar se a tabela existe
    db.query('SHOW TABLES LIKE "configuracoes"', (err, tableExists) => {
        if (err) {
            console.error('❌ Erro ao verificar tabela:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (tableExists.length === 0) {
            console.log('⚠️ Tabela configuracoes não existe, criando...');
            
            // Criar a tabela
            db.query(`
                CREATE TABLE IF NOT EXISTS configuracoes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    chave VARCHAR(100) NOT NULL UNIQUE,
                    valor JSON NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Erro ao criar tabela:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('✅ Tabela configuracoes criada!');
                
                // Retornar configurações padrão
                const defaultConfig = {
                    horarioInicio: '09:00',
                    horarioFim: '19:00',
                    intervaloMinutos: 30,
                    diasSemana: [1, 2, 3, 4, 5, 6],
                    slotsPorProfissional: true,
                    tempoMedioServico: 30,
                    antecedenciaMinima: 60,
                    janelaAgendamento: 30,
                    intervalos: []
                };
                return res.json(defaultConfig);
            });
        } else {
            // Tabela existe, buscar configurações
            db.query(
                'SELECT valor FROM configuracoes WHERE chave = ?',
                ['horarios'],
                (err, results) => {
                    if (err) {
                        console.error('❌ Erro no MySQL:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    if (results.length === 0) {
                        console.log('⚠️ Nenhuma configuração encontrada, usando padrão');
                        const defaultConfig = {
                            horarioInicio: '09:00',
                            horarioFim: '19:00',
                            intervaloMinutos: 30,
                            diasSemana: [1, 2, 3, 4, 5, 6],
                            slotsPorProfissional: true,
                            tempoMedioServico: 30,
                            antecedenciaMinima: 60,
                            janelaAgendamento: 30,
                            intervalos: []
                        };
                        res.json(defaultConfig);
                    } else {
                        try {
                            const config = JSON.parse(results[0].valor);
                            console.log('✅ Configurações carregadas:', config);
                            res.json(config);
                        } catch (e) {
                            console.error('❌ Erro ao parsear JSON:', e);
                            res.status(500).json({ error: 'Erro ao parsear configurações' });
                        }
                    }
                }
            );
        }
    });
});

// Salvar configurações de horários
app.post('/api/configuracoes/horarios', (req, res) => {
    console.log('\n=== 💾 ROTA DE CONFIGURAÇÕES ACESSADA ===');
    console.log('📦 Body recebido:', JSON.stringify(req.body, null, 2));
    
    const valorJSON = JSON.stringify(req.body);
    
    // Verificar se a tabela existe
    db.query('SHOW TABLES LIKE "configuracoes"', (err, tableExists) => {
        if (err) {
            console.error('❌ Erro ao verificar tabela:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (tableExists.length === 0) {
            console.log('⚠️ Tabela configuracoes não existe, criando...');
            
            // Criar a tabela
            db.query(`
                CREATE TABLE IF NOT EXISTS configuracoes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    chave VARCHAR(100) NOT NULL UNIQUE,
                    valor JSON NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Erro ao criar tabela:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('✅ Tabela configuracoes criada!');
                
                // Agora tentar salvar novamente
                salvarConfiguracao();
            });
        } else {
            salvarConfiguracao();
        }
        
        function salvarConfiguracao() {
            db.query(
                `INSERT INTO configuracoes (chave, valor) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE valor = ?`,
                ['horarios', valorJSON, valorJSON],
                (err, result) => {
                    if (err) {
                        console.error('❌ Erro no MySQL:', err);
                        console.error('❌ SQL:', err.sql);
                        console.error('❌ Mensagem:', err.sqlMessage);
                        return res.status(500).json({ 
                            error: 'Erro ao salvar configurações',
                            details: err.message,
                            sqlMessage: err.sqlMessage 
                        });
                    }
                    
                    console.log('✅ Resultado do MySQL:', result);
                    console.log('✅ Configurações salvas com sucesso!');
                    res.json({ 
                        success: true, 
                        message: 'Configurações salvas com sucesso' 
                    });
                }
            );
        }
    });
});

const botRoutes = require('./src/routes/botRoutes');
app.use('/api/bot', botRoutes)

// ============================================
// ROTAS DE USUÁRIOS
// ============================================

// Listar todos os usuários
app.get('/api/usuarios', (req, res) => {
    const query = `
        SELECT u.id, u.nome, u.email, u.login, u.nivel, u.ativo, 
               u.funcionario_id, u.avatar, u.cor,
               f.nome as funcionario_nome
        FROM usuarios u
        LEFT JOIN funcionarios f ON u.funcionario_id = f.id
        ORDER BY u.id
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ Erro:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Buscar usuário por ID
app.get('/api/usuarios/:id', (req, res) => {
    const query = `
        SELECT u.id, u.nome, u.email, u.login, u.nivel, u.ativo, 
               u.funcionario_id, u.avatar, u.cor
        FROM usuarios u
        WHERE u.id = ?
    `;
    
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            console.error('❌ Erro:', err);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.json(results[0]);
    });
});

// Criar novo usuário
app.post('/api/usuarios', (req, res) => {
    const { nome, email, login, senha, nivel, funcionarioId, avatar, cor } = req.body;
    
    if (!nome || !email || !login || !senha) {
        return res.status(400).json({ error: 'Nome, email, login e senha são obrigatórios' });
    }
    
    const query = `
        INSERT INTO usuarios (nome, email, login, senha, nivel, funcionario_id, avatar, cor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(query, [nome, email, login, senha, nivel || 'funcionario', funcionarioId || null, avatar, cor], (err, result) => {
        if (err) {
            console.error('❌ Erro:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: result.insertId, message: 'Usuário criado com sucesso' });
    });
});

// Atualizar usuário
app.put('/api/usuarios/:id', (req, res) => {
    const { nome, email, login, senha, nivel, funcionarioId, avatar, cor } = req.body;
    const { id } = req.params;
    
    let query = 'UPDATE usuarios SET nome = ?, email = ?, login = ?, nivel = ?, funcionario_id = ?, avatar = ?, cor = ?';
    let params = [nome, email, login, nivel, funcionarioId || null, avatar, cor];
    
    if (senha) {
        query += ', senha = ?';
        params.push(senha);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    db.query(query, params, (err, result) => {
        if (err) {
            console.error('❌ Erro:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Usuário atualizado com sucesso' });
    });
});

// Desativar usuário
app.put('/api/usuarios/:id/desativar', (req, res) => {
    db.query('UPDATE usuarios SET ativo = false WHERE id = ?', [req.params.id], (err) => {
        if (err) {
            console.error('❌ Erro:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Usuário desativado' });
    });
});

// Ativar usuário
app.put('/api/usuarios/:id/ativar', (req, res) => {
    db.query('UPDATE usuarios SET ativo = true WHERE id = ?', [req.params.id], (err) => {
        if (err) {
            console.error('❌ Erro:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Usuário ativado' });
    });
});

// Alterar senha
app.put('/api/usuarios/:id/senha', (req, res) => {
    const { senha_atual, nova_senha } = req.body;
    const { id } = req.params;
    
    db.query('SELECT senha FROM usuarios WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        
        if (results[0].senha !== senha_atual) {
            return res.status(400).json({ error: 'Senha atual incorreta' });
        }
        
        db.query('UPDATE usuarios SET senha = ? WHERE id = ?', [nova_senha, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Senha alterada com sucesso' });
        });
    });
});

// Login
app.post('/api/auth/login', (req, res) => {
    const { login, senha } = req.body;
    
    const query = `
        SELECT u.id, u.nome, u.email, u.login, u.nivel, u.ativo, u.funcionario_id,
               f.nome as funcionario_nome, f.especialidade
        FROM usuarios u
        LEFT JOIN funcionarios f ON u.funcionario_id = f.id
        WHERE u.login = ? AND u.senha = ? AND u.ativo = true
    `;
    
    db.query(query, [login, senha], (err, results) => {
        if (err) {
            console.error('❌ Erro:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ success: false, error: 'Login ou senha inválidos' });
        }
        
        const usuario = results[0];
        res.json({ success: true, usuario });
    });
});

// ============================================
// INICIAR SERVIDOR (ÚNICO LISTEN)
// ============================================

app.listen(port, () => {
    console.log(`✅ Servidor rodando em http://localhost:${port}`);
    
    // LISTAR TODAS AS ROTAS REGISTRADAS (AGORA FUNCIONA!)
    console.log('\n📋 ROTAS REGISTRADAS:');
    setTimeout(() => {
        if (app._router && app._router.stack) {
            app._router.stack.forEach(function(r){
                if (r.route && r.route.path){
                    console.log(`${Object.keys(r.route.methods).join(', ').toUpperCase()} ${r.route.path}`);
                }
            });
            console.log(''); // linha em branco
        }
    }, 100);
});
