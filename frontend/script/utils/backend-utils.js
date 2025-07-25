/**
 * Utilitários globais para o sistema Oblivion RPG
 */

// Função global para obter o caminho correto do backend
window.getBackendPath = function() {
    const path = window.location.pathname;
    
    // Debug log
    console.log('Current path:', path);
    
    // Se estamos em /frontend/pages/, precisamos voltar 2 níveis
    if (path.includes('/pages/')) {
        console.log('Using ../../backend/ path');
        return '../../backend/';
    }
    
    // Se estamos em /frontend/, precisamos voltar 1 nível  
    if (path.includes('/frontend/')) {
        console.log('Using ../backend/ path');
        return '../backend/';
    }
    
    // Caminho absoluto como fallback
    console.log('Using absolute path /Oblivion_RPG/backend/');
    return '/Oblivion_RPG/backend/';
};

// Função auxiliar para fazer requests ao backend
window.makeBackendRequest = async function(endpoint, options = {}) {
    const url = getBackendPath() + endpoint;
    console.log('Making request to:', url);
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options
    };
    
    try {
        const response = await fetch(url, defaultOptions);
        return response;
    } catch (error) {
        console.error('Backend request failed:', error);
        throw error;
    }
};
