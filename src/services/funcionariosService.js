import api from './api';

const funcionariosService = {
  // Listar todos os funcionários
  listar: async () => {
    try {
      const response = await api.get('/funcionarios');
      return response.data;
    } catch (error) {
      console.error('Erro ao listar funcionários:', error);
      throw error;
    }
  },

  // Buscar funcionário por ID
  buscarPorId: async (id) => {
    try {
      const response = await api.get(`/funcionarios/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar funcionário:', error);
      throw error;
    }
  },

  // Criar novo funcionário
  criar: async (funcionario) => {
    try {
      const response = await api.post('/funcionarios', funcionario);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar funcionário:', error);
      throw error;
    }
  },

  // Atualizar funcionário
  atualizar: async (id, funcionario) => {
    try {
      const response = await api.put(`/funcionarios/${id}`, funcionario);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar funcionário:', error);
      throw error;
    }
  },

  // Excluir funcionário
  excluir: async (id) => {
    try {
      const response = await api.delete(`/funcionarios/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao excluir funcionário:', error);
      throw error;
    }
  },

  // Atualizar ponto do funcionário
  atualizarPonto: async (id, ponto) => {
    try {
      const response = await api.put(`/funcionarios/${id}/ponto`, ponto);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar ponto:', error);
      throw error;
    }
  }
};

export default funcionariosService;