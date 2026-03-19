const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// ============================================
// ROTAS DO BOT - CORRIGIDAS
// ============================================

// TESTE
router.get('/test', (req, res) => {
    res.json({ message: 'Bot API está funcionando!' });
});

// SERVIÇOS - CORRIGIDO (usando duracao_minutos)
router.get('/servicos', (req, res) => {
    console.log('📋 Buscando serviços...');
    const query = 'SELECT id, nome, preco, duracao_minutos FROM servicos ORDER BY nome';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ Erro ao buscar serviços:', err);
            console.error('❌ SQL:', err.sql);
            console.error('❌ Mensagem:', err.sqlMessage);
            return res.status(500).json({ 
                error: 'Erro ao buscar serviços',
                details: err.message,
                sqlMessage: err.sqlMessage
            });
        }
        console.log(`✅ ${results.length} serviços encontrados`);
        res.json(results);
    });
});

// PROFISSIONAIS
router.get('/profissionais', (req, res) => {
    console.log('👤 Buscando profissionais...');
    const query = 'SELECT id, nome, especialidade FROM funcionarios WHERE ativo = 1 ORDER BY nome';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ Erro ao buscar profissionais:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log(`✅ ${results.length} profissionais encontrados`);
        res.json(results);
    });
});

// INFORMAÇÕES DO SALÃO
router.get('/salao', (req, res) => {
    res.json({
        nome: process.env.SALAO_NOME || "Vailson's Hair & Makeup",
        endereco: process.env.SALAO_ENDERECO || "Asa Sul CLS 210 Bloco B Loja 18 - Brasília",
        telefone: process.env.SALAO_TELEFONE || "(61) 3244-4181",
        horario: "Segunda a Sexta: 9h às 19h | Sábado: 9h às 17h"
    });
});

// DISPONIBILIDADE
router.get('/disponibilidade', (req, res) => {
    const { data, servico_id } = req.query;
    console.log(`📅 Verificando disponibilidade para ${data}, serviço ${servico_id}`);
    
    if (!data || !servico_id) {
        return res.status(400).json({ error: 'Data e serviço são obrigatórios' });
    }
    
    // Contar profissionais ativos
    db.query('SELECT COUNT(*) as total FROM funcionarios WHERE ativo = 1', (err, profResult) => {
        if (err) {
            console.error('❌ Erro ao contar profissionais:', err);
            return res.status(500).json({ error: err.message });
        }
        
        const totalProfissionais = profResult[0].total;
        
        // Gerar horários de 9h às 19h
        const horarios = [];
        const horariosPendentes = [];
        
        for (let hora = 9; hora <= 18; hora++) {
            const horario = `${hora.toString().padStart(2, '0')}:00`;
            
            horariosPendentes.push(new Promise((resolve) => {
                db.query(
                    `SELECT COUNT(*) as ocupados FROM agendamentos 
                     WHERE DATE(data_hora) = ? AND HOUR(data_hora) = ? 
                     AND status NOT IN ('cancelado', 'cancelada')`,
                    [data, hora],
                    (err, result) => {
                        if (err) {
                            console.error(`Erro na hora ${hora}:`, err);
                            resolve(null);
                        } else {
                            if (result[0].ocupados < totalProfissionais) {
                                resolve(horario);
                            } else {
                                resolve(null);
                            }
                        }
                    }
                );
            }));
        }
        
        Promise.all(horariosPendentes).then(disponiveis => {
            const horariosDisponiveis = disponiveis.filter(h => h !== null);
            console.log(`✅ Horários disponíveis:`, horariosDisponiveis);
            res.json({
                data,
                servico_id,
                profissionais_disponiveis: totalProfissionais,
                horarios_disponiveis: horariosDisponiveis
            });
        });
    });
});

// CRIAR AGENDAMENTO
router.post('/agendamentos', (req, res) => {
    console.log('📝 Criando agendamento via bot:', req.body);
    const { nome_cliente, telefone_cliente, servico_id, data, horario } = req.body;
    
    if (!nome_cliente || !telefone_cliente || !servico_id || !data || !horario) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }
    
    // Buscar preço do serviço
    db.query('SELECT preco FROM servicos WHERE id = ?', [servico_id], (err, servico) => {
        if (err || servico.length === 0) {
            console.error('❌ Erro ao buscar serviço:', err);
            return res.status(404).json({ error: 'Serviço não encontrado' });
        }
        
        const preco = servico[0].preco;
        const hora = horario.split(':')[0];
        const dataHora = `${data} ${horario}:00`;
        const valor_comissao = preco * 0.3; // 30% de comissão padrão
        
        // Buscar profissional disponível
        db.query(
            `SELECT id FROM funcionarios 
             WHERE ativo = 1 
             AND id NOT IN (
                 SELECT funcionario_id FROM agendamentos 
                 WHERE DATE(data_hora) = ? AND HOUR(data_hora) = ?
                 AND status NOT IN ('cancelado', 'cancelada')
             )
             LIMIT 1`,
            [data, hora],
            (err, profissionais) => {
                if (err) {
                    console.error('❌ Erro ao buscar profissional:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                if (profissionais.length === 0) {
                    return res.status(400).json({ error: 'Nenhum profissional disponível neste horário' });
                }
                
                const funcionario_id = profissionais[0].id;
                
                // Inserir agendamento
                db.query(
                    `INSERT INTO agendamentos 
                     (cliente_nome, cliente_telefone, servico_id, funcionario_id, data_hora, valor, valor_comissao, status, origem) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmado', 'whatsapp')`,
                    [nome_cliente, telefone_cliente, servico_id, funcionario_id, dataHora, preco, valor_comissao],
                    (err, result) => {
                        if (err) {
                            console.error('❌ Erro ao criar agendamento:', err);
                            return res.status(500).json({ error: err.message });
                        }
                        
                        console.log(`✅ Agendamento criado com ID: ${result.insertId}`);
                        
                        // Buscar dados completos para retornar
                        db.query(
                            `SELECT a.id, a.cliente_nome, a.data_hora,
                                    s.nome as servico_nome, s.preco,
                                    f.nome as profissional_nome
                             FROM agendamentos a
                             JOIN servicos s ON a.servico_id = s.id
                             JOIN funcionarios f ON a.funcionario_id = f.id
                             WHERE a.id = ?`,
                            [result.insertId],
                            (err, novoAgendamento) => {
                                if (err) {
                                    console.error('❌ Erro ao buscar agendamento criado:', err);
                                    return res.json({ 
                                        success: true, 
                                        message: 'Agendamento criado',
                                        id: result.insertId 
                                    });
                                }
                                
                                res.json({
                                    success: true,
                                    agendamento: novoAgendamento[0]
                                });
                            }
                        );
                    }
                );
            }
        );
    });
});

// STATUS DO BOT
router.get('/status', (req, res) => {
    res.json({ 
        online: true,
        desde: new Date().toISOString(),
        versao: '1.0.0'
    });
});

// CONFIGURAÇÕES
router.get('/configuracoes', (req, res) => {
    res.json({
        saudacao: "Olá! Seja bem-vindo ao Salão! 🌟",
        horarioInicio: "09:00",
        horarioFim: "19:00",
        diasAtendimento: [1, 2, 3, 4, 5, 6],
        mensagemForaHorario: "No momento estamos fora do horário de atendimento. Retornaremos amanhã! 😊",
        tempoRespostaAutomatica: 5,
        responderForaHorario: false,
        notificarNovoContato: true
    });
});

router.post('/configurar', (req, res) => {
    console.log('⚙️ Configurando bot:', req.body);
    res.json({ 
        success: true, 
        message: 'Configurações salvas com sucesso',
        config: req.body
    });
});

// CONVERSAS
router.get('/conversas', (req, res) => {
    res.json([
        {
            numero: '61999999999',
            data: new Date().toLocaleString('pt-BR'),
            ultimaMensagem: 'Olá, gostaria de agendar um corte',
            status: 'ativo'
        },
        {
            numero: '61888888888',
            data: new Date(Date.now() - 3600000).toLocaleString('pt-BR'),
            ultimaMensagem: 'Qual o valor da progressiva?',
            status: 'ativo'
        }
    ]);
});

// TESTAR MENSAGEM
router.post('/testar', (req, res) => {
    const { numero, mensagem } = req.body;
    console.log(`📱 Enviando mensagem de teste para ${numero}: ${mensagem}`);
    res.json({ 
        success: true, 
        message: 'Mensagem de teste enviada (simulação)',
        numero,
        mensagem: mensagem || 'Mensagem padrão'
    });
});

// QR CODE
router.get('/qrcode', (req, res) => {
    res.json({
        qrcode: 'SIMULADO_PARA_TESTE',
        expiraEm: 60
    });
});

module.exports = router;