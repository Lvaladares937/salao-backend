import api from './api';

const agendamentosService = {
  // Listar todos os agendamentos
  listar: async () => {
    try {
      const response = await api.get('/agendamentos');
      return response.data;
    } catch (error) {
      console.error('Erro ao listar agendamentos:', error);
      throw error;
    }
  },

  // Buscar por ID
  buscarPorId: async (id) => {
    try {
      const response = await api.get(`/agendamentos/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar agendamento:', error);
      throw error;
    }
  },

  // Buscar por período
  buscarPorPeriodo: async (inicio, fim) => {
    try {
      const response = await api.get(`/agendamentos/periodo?inicio=${inicio}&fim=${fim}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar agendamentos por período:', error);
      throw error;
    }
  },

  // Criar novo agendamento
  criar: async (agendamento) => {
    try {
      console.log('📤 Enviando agendamento:', agendamento);
      const response = await api.post('/agendamentos', agendamento);
      console.log('✅ Resposta:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro detalhado:', error.response?.data || error.message);
      throw error;
    }
  },

  // Atualizar agendamento
  atualizar: async (id, agendamento) => {
    try {
      const response = await api.put(`/agendamentos/${id}`, agendamento);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      throw error;
    }
  },

  // Excluir agendamento
  excluir: async (id) => {
    try {
      const response = await api.delete(`/agendamentos/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      throw error;
    }
  }
};

export default agendamentosService;