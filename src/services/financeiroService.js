import api from './api';

const financeiroService = {
  // Listar vendas
  listarVendas: async (mes, ano) => {
    try {
      const response = await api.get(`/financeiro/vendas?mes=${mes}&ano=${ano}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao listar vendas:', error);
      throw error;
    }
  },

  // Listar despesas
  listarDespesas: async (mes, ano) => {
    try {
      const response = await api.get(`/financeiro/despesas?mes=${mes}&ano=${ano}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao listar despesas:', error);
      throw error;
    }
  },

  // Adicionar despesa
  adicionarDespesa: async (despesa) => {
    try {
      const response = await api.post('/financeiro/despesas', despesa);
      return response.data;
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
      throw error;
    }
  },

  // Remover despesa
  removerDespesa: async (id) => {
    try {
      const response = await api.delete(`/financeiro/despesas/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao remover despesa:', error);
      throw error;
    }
  }
};

export default financeiroService;