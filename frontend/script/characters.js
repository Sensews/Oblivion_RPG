/**
 * JavaScript para gerenciar Personagens - Oblivion RPG
 */

class CharactersManager {
    constructor() {
        this.characters = [];
        this.campaigns = [];
        this.editingCharacterId = null;
        this.deletingCharacterId = null;
        this.userSession = null;
        this.currentView = 'grid'; // 'grid' ou 'list'
        this.init();
    }

    init() {
        this.loadUserSession();
        this.bindEvents();
        this.loadViewPreference();
        this.loadCampaigns();
        this.loadCharacters();
    }

    // ================================
    // GERENCIAMENTO DE SESSÃO
    // ================================

    loadUserSession() {
        // Buscar sessão já validada pelo route-protection
        let userSession = localStorage.getItem('oblivion_user_session');
        if (!userSession) {
            userSession = sessionStorage.getItem('oblivion_user_session');
        }
        
        if (userSession) {
            try {
                this.userSession = JSON.parse(userSession);
                console.log('Sessão do usuário carregada:', this.userSession);
            } catch (e) {
                console.error('Erro ao processar sessão:', e);
                // Se chegou até aqui, é porque o route-protection falhou
                window.location.href = 'login.html';
            }
        }
    }

    // ================================
    // EVENT LISTENERS
    // ================================

    bindEvents() {
        // Criar novo personagem - agora abre o modal completo
        const createBtn = document.getElementById('createCharacterBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.openCreateModal());
        }

        // Toggle de visualização
        const gridViewBtn = document.getElementById('gridViewBtn');
        const listViewBtn = document.getElementById('listViewBtn');
        
        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', () => this.setViewMode('grid'));
        }
        
        if (listViewBtn) {
            listViewBtn.addEventListener('click', () => this.setViewMode('list'));
        }

        // Modal de edição de personagem (simples)
        const characterModal = document.getElementById('characterModal');
        const characterBackdrop = document.getElementById('characterBackdrop');
        const closeCharacterModal = document.getElementById('closeCharacterModal');
        const cancelCharacter = document.getElementById('cancelCharacter');

        [characterBackdrop, closeCharacterModal, cancelCharacter].forEach(element => {
            if (element) {
                element.addEventListener('click', () => this.closeCharacterModal());
            }
        });

        // Form de personagem (edição)
        const characterForm = document.getElementById('characterForm');
        if (characterForm) {
            characterForm.addEventListener('submit', (e) => this.handleSaveCharacter(e));
        }

        // Modal de delete
        const deleteModal = document.getElementById('deleteModal');
        const deleteBackdrop = document.getElementById('deleteBackdrop');
        const cancelDelete = document.getElementById('cancelDelete');
        const confirmDelete = document.getElementById('confirmDelete');

        [deleteBackdrop, cancelDelete].forEach(element => {
            if (element) {
                element.addEventListener('click', () => this.closeDeleteModal());
            }
        });

        if (confirmDelete) {
            confirmDelete.addEventListener('click', () => this.deleteCharacter());
        }
    }

    // ================================
    // GERENCIAMENTO DE VISUALIZAÇÃO
    // ================================

    setViewMode(mode) {
        this.currentView = mode;
        
        // Atualizar botões
        const gridBtn = document.getElementById('gridViewBtn');
        const listBtn = document.getElementById('listViewBtn');
        
        if (gridBtn && listBtn) {
            gridBtn.classList.toggle('active', mode === 'grid');
            listBtn.classList.toggle('active', mode === 'list');
        }
        
        // Atualizar container
        const container = document.getElementById('existingCharacters');
        if (container) {
            container.className = mode === 'list' ? 'existing-characters-list' : 'existing-characters-grid';
        }
        
        // Salvar preferência
        localStorage.setItem('oblivion_characters_view', mode);
        
        // Re-renderizar personagens para aplicar o novo layout
        this.renderCharacters();
    }

    loadViewPreference() {
        const savedView = localStorage.getItem('oblivion_characters_view');
        if (savedView && ['grid', 'list'].includes(savedView)) {
            this.setViewMode(savedView);
        }
    }

    // ================================
    // GERENCIAMENTO DE CAMPANHAS
    // ================================

    async loadCampaigns() {
        try {
            // Aqui você faria uma chamada para o backend
            // Por enquanto, começamos com array vazio
            this.campaigns = [];

            this.populateCampaignSelect();
        } catch (error) {
            console.error('Erro ao carregar campanhas:', error);
        }
    }

    populateCampaignSelect() {
        const select = document.getElementById('characterCampaign');
        if (!select) return;

        // Limpar opções existentes (exceto a primeira)
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        // Adicionar campanhas
        this.campaigns.forEach(campaign => {
            const option = document.createElement('option');
            option.value = campaign.id;
            option.textContent = campaign.nome;
            select.appendChild(option);
        });
    }

    // ================================
    // GERENCIAMENTO DE PERSONAGENS
    // ================================

    async loadCharacters() {
        if (!this.userSession) return;

        try {
            const response = await window.makeBackendRequest('get-characters.php', {
                method: 'POST',
                body: JSON.stringify({
                    usuario_id: this.userSession.user_id
                })
            });

            const data = await response.json();

            if (data.success) {
                this.characters = data.characters || [];
            } else {
                throw new Error(data.error || 'Erro ao carregar personagens');
            }

            this.renderCharacters();
        } catch (error) {
            console.error('Erro ao carregar personagens:', error);
            this.showNotification('Erro ao carregar personagens', 'error');
        }
    }

    renderCharacters() {
        const container = document.getElementById('existingCharacters');
        console.log('Container encontrado:', container);
        console.log('Número de personagens:', this.characters.length);
        
        if (!container) {
            console.error('Container existingCharacters não encontrado!');
            return;
        }

        if (this.characters.length === 0) {
            container.innerHTML = '<p class="no-characters">Nenhum personagem criado ainda.</p>';
            console.log('Mensagem de nenhum personagem renderizada');
            return;
        }

        container.innerHTML = this.characters.map(character => `
            <div class="character-card existing" data-id="${character.id}">
                <div class="character-image ${character.foto_url ? '' : 'no-image'}">
                    ${character.foto_url 
                        ? `<img src="${character.foto_url}" alt="${character.nome}" data-character-id="${character.id}">` 
                        : '<i class="fas fa-user"></i>'
                    }
                </div>
                <div class="character-info">
                    <h3 class="character-name">${this.escapeHtml(character.nome)}</h3>
                    
                    <div class="character-stats">
                        <div class="stat-item">
                            <i class="fas fa-heart"></i>
                            <span>PV: ${character.pv_atual || 0}/${character.pv_max || 0}</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-bolt"></i>
                            <span>PE: ${character.pe_atual || 0}/${character.pe_max || 0}</span>
                        </div>
                    </div>
                    
                    <div class="character-campaign ${character.campanha_nome ? '' : 'no-campaign'}">
                        ${character.campanha_nome 
                            ? `<i class="fas fa-gamepad"></i> ${this.escapeHtml(character.campanha_nome)}`
                            : '<i class="fas fa-unlink"></i> Sem campanha'
                        }
                    </div>
                    
                    <div class="character-actions">
                        <button class="btn-edit" onclick="charactersManager.openEditModal(${character.id})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-delete" onclick="charactersManager.openDeleteModal(${character.id})">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Adicionar event listeners para tratar erros de imagem
        this.setupImageErrorHandling();
    }

    setupImageErrorHandling() {
        const images = document.querySelectorAll('.character-image img');
        images.forEach(img => {
            img.addEventListener('error', (e) => {
                const imageContainer = e.target.parentElement;
                if (imageContainer && imageContainer.classList.contains('character-image')) {
                    imageContainer.classList.add('no-image');
                    imageContainer.innerHTML = '<i class="fas fa-user"></i>';
                }
            });
            
            img.addEventListener('load', (e) => {
                e.target.style.opacity = '1';
            });
        });
    }

    // ================================
    // MODAIS
    // ================================

    openCreateModal() {
        // Abrir o modal de criação completo
        if (window.characterCreationModal) {
            window.characterCreationModal.openModal();
        } else {
            console.error('Modal de criação não encontrado');
        }
    }

    openEditModal(characterId) {
        const character = this.characters.find(c => c.id === characterId);
        if (!character) return;

        this.editingCharacterId = characterId;
        this.fillForm(character);
        
        const modal = document.getElementById('characterModal');
        const title = document.getElementById('characterModalTitle');
        
        if (title) {
            title.innerHTML = '<i class="fas fa-edit"></i> Editar Personagem';
        }
        
        if (modal) {
            modal.classList.add('show');
        }
    }

    closeCharacterModal() {
        const modal = document.getElementById('characterModal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.resetForm();
        this.editingCharacterId = null;
    }

    openDeleteModal(characterId) {
        const character = this.characters.find(c => c.id === characterId);
        if (!character) return;

        this.deletingCharacterId = characterId;
        
        const modal = document.getElementById('deleteModal');
        const nameElement = document.getElementById('deleteCharacterName');
        
        if (nameElement) {
            nameElement.textContent = character.nome;
        }
        
        if (modal) {
            modal.classList.add('show');
        }
    }

    closeDeleteModal() {
        const modal = document.getElementById('deleteModal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.deletingCharacterId = null;
    }

    // ================================
    // FORMULÁRIO
    // ================================

    resetForm() {
        const form = document.getElementById('characterForm');
        if (form) {
            form.reset();
        }
        
        const characterId = document.getElementById('characterId');
        if (characterId) {
            characterId.value = '';
        }
    }

    fillForm(character) {
        const fields = {
            'characterId': character.id,
            'characterName': character.nome,
            'characterImage': character.foto_url || '',
            'characterCampaign': character.campanha_id || ''
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });
    }

    async handleSaveCharacter(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            nome: formData.get('nome'),
            foto_url: formData.get('foto_url') || null,
            campanha_id: formData.get('campanha_id') || null
        };

        // Validação básica
        if (!data.nome.trim()) {
            this.showNotification('Nome do personagem é obrigatório', 'error');
            return;
        }

        try {
            if (this.editingCharacterId) {
                await this.updateCharacter(this.editingCharacterId, data);
            } else {
                await this.createCharacter(data);
            }
            
            this.closeCharacterModal();
            this.loadCharacters();
            
        } catch (error) {
            console.error('Erro ao salvar personagem:', error);
            this.showNotification('Erro ao salvar personagem', 'error');
        }
    }

    async createCharacter(data) {
        // Simular criação (aqui você faria a chamada para o backend)
        const campanha = data.campanha_id ? this.campaigns.find(c => c.id == data.campanha_id) : null;
        
        const newCharacter = {
            id: Date.now(), // ID temporário
            ...data,
            campanha_nome: campanha ? campanha.nome : null
        };
        
        this.characters.push(newCharacter);
        this.showNotification('Personagem criado com sucesso!', 'success');
    }

    async updateCharacter(id, data) {
        // Simular atualização (aqui você faria a chamada para o backend)
        const index = this.characters.findIndex(c => c.id === id);
        if (index !== -1) {
            const campanha = data.campanha_id ? this.campaigns.find(c => c.id == data.campanha_id) : null;
            
            this.characters[index] = { 
                ...this.characters[index], 
                ...data,
                campanha_nome: campanha ? campanha.nome : null
            };
            this.showNotification('Personagem atualizado com sucesso!', 'success');
        }
    }

    async deleteCharacter() {
        if (!this.deletingCharacterId) return;

        try {
            // Simular exclusão (aqui você faria a chamada para o backend)
            this.characters = this.characters.filter(c => c.id !== this.deletingCharacterId);
            
            this.closeDeleteModal();
            this.renderCharacters();
            this.showNotification('Personagem excluído com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao excluir personagem:', error);
            this.showNotification('Erro ao excluir personagem', 'error');
        }
    }

    // ================================
    // UTILITÁRIOS
    // ================================

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Implementação simples de notificação
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 10000;
            font-weight: 600;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.charactersManager = new CharactersManager();
    
    // Teste: forçar renderização após 1 segundo
    setTimeout(() => {
        console.log('Teste: Forçando renderização...');
        if (window.charactersManager) {
            window.charactersManager.renderCharacters();
        }
    }, 1000);
});
