/**
 * JavaScript para gerenciar Campanhas - Oblivion RPG
 */

class CampaignsManager {
    constructor() {
        this.campaigns = [];
        this.editingCampaignId = null;
        this.deletingCampaignId = null;
        this.userSession = null;
        this.init();
    }

    init() {
        this.loadUserSession();
        this.bindEvents();
        this.loadCampaigns();
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
        // Criar nova campanha
        const createBtn = document.getElementById('createCampaignBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.openCreateModal());
        }

        // Modal de campanha
        const campaignModal = document.getElementById('campaignModal');
        const campaignBackdrop = document.getElementById('campaignBackdrop');
        const closeCampaignModal = document.getElementById('closeCampaignModal');
        const cancelCampaign = document.getElementById('cancelCampaign');

        [campaignBackdrop, closeCampaignModal, cancelCampaign].forEach(element => {
            if (element) {
                element.addEventListener('click', () => this.closeCampaignModal());
            }
        });

        // Form de campanha
        const campaignForm = document.getElementById('campaignForm');
        if (campaignForm) {
            campaignForm.addEventListener('submit', (e) => this.handleSaveCampaign(e));
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
            confirmDelete.addEventListener('click', () => this.deleteCampaign());
        }
    }

    // ================================
    // GERENCIAMENTO DE CAMPANHAS
    // ================================

    async loadCampaigns() {
        if (!this.userSession) return;

        try {
            // Aqui você faria a chamada para o backend
            // Por enquanto, começamos com array vazio
            this.campaigns = [];

            this.renderCampaigns();
        } catch (error) {
            console.error('Erro ao carregar campanhas:', error);
            this.showNotification('Erro ao carregar campanhas', 'error');
        }
    }

    renderCampaigns() {
        const container = document.getElementById('existingCampaigns');
        if (!container) return;

        if (this.campaigns.length === 0) {
            container.innerHTML = '<p class="no-campaigns">Nenhuma campanha criada ainda.</p>';
            return;
        }

        container.innerHTML = this.campaigns.map(campaign => `
            <div class="campaign-card existing" data-id="${campaign.id}">
                <div class="campaign-image ${campaign.foto_url ? '' : 'no-image'}">
                    ${campaign.foto_url 
                        ? `<img src="${campaign.foto_url}" alt="${campaign.nome}" onerror="this.parentElement.innerHTML='<i class=\\"fas fa-image\\"></i>'">` 
                        : '<i class="fas fa-image"></i>'
                    }
                </div>
                <div class="campaign-info">
                    <h3 class="campaign-name">${this.escapeHtml(campaign.nome)}</h3>
                    <p class="campaign-description">${campaign.descricao ? this.escapeHtml(campaign.descricao) : 'Sem descrição'}</p>
                    <div class="campaign-actions">
                        <button class="btn-edit" onclick="campaignsManager.openEditModal(${campaign.id})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-delete" onclick="campaignsManager.openDeleteModal(${campaign.id})">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ================================
    // MODAIS
    // ================================

    openCreateModal() {
        this.editingCampaignId = null;
        this.resetForm();
        
        const modal = document.getElementById('campaignModal');
        const title = document.getElementById('campaignModalTitle');
        
        if (title) {
            title.innerHTML = '<i class="fas fa-plus"></i> Criar Nova Campanha';
        }
        
        if (modal) {
            modal.classList.add('show');
        }
    }

    openEditModal(campaignId) {
        const campaign = this.campaigns.find(c => c.id === campaignId);
        if (!campaign) return;

        this.editingCampaignId = campaignId;
        this.fillForm(campaign);
        
        const modal = document.getElementById('campaignModal');
        const title = document.getElementById('campaignModalTitle');
        
        if (title) {
            title.innerHTML = '<i class="fas fa-edit"></i> Editar Campanha';
        }
        
        if (modal) {
            modal.classList.add('show');
        }
    }

    closeCampaignModal() {
        const modal = document.getElementById('campaignModal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.resetForm();
        this.editingCampaignId = null;
    }

    openDeleteModal(campaignId) {
        const campaign = this.campaigns.find(c => c.id === campaignId);
        if (!campaign) return;

        this.deletingCampaignId = campaignId;
        
        const modal = document.getElementById('deleteModal');
        const nameElement = document.getElementById('deleteCampaignName');
        
        if (nameElement) {
            nameElement.textContent = campaign.nome;
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
        this.deletingCampaignId = null;
    }

    // ================================
    // FORMULÁRIO
    // ================================

    resetForm() {
        const form = document.getElementById('campaignForm');
        if (form) {
            form.reset();
        }
        
        const campaignId = document.getElementById('campaignId');
        if (campaignId) {
            campaignId.value = '';
        }
    }

    fillForm(campaign) {
        const fields = {
            'campaignId': campaign.id,
            'campaignName': campaign.nome,
            'campaignDescription': campaign.descricao || '',
            'campaignImage': campaign.foto_url || ''
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });
    }

    async handleSaveCampaign(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            nome: formData.get('nome'),
            descricao: formData.get('descricao') || null,
            foto_url: formData.get('foto_url') || null
        };

        // Validação básica
        if (!data.nome.trim()) {
            this.showNotification('Nome da campanha é obrigatório', 'error');
            return;
        }

        try {
            if (this.editingCampaignId) {
                await this.updateCampaign(this.editingCampaignId, data);
            } else {
                await this.createCampaign(data);
            }
            
            this.closeCampaignModal();
            this.loadCampaigns();
            
        } catch (error) {
            console.error('Erro ao salvar campanha:', error);
            this.showNotification('Erro ao salvar campanha', 'error');
        }
    }

    async createCampaign(data) {
        // Simular criação (aqui você faria a chamada para o backend)
        const newCampaign = {
            id: Date.now(), // ID temporário
            ...data,
            criado_em: new Date().toISOString().split('T')[0]
        };
        
        this.campaigns.push(newCampaign);
        this.showNotification('Campanha criada com sucesso!', 'success');
    }

    async updateCampaign(id, data) {
        // Simular atualização (aqui você faria a chamada para o backend)
        const index = this.campaigns.findIndex(c => c.id === id);
        if (index !== -1) {
            this.campaigns[index] = { ...this.campaigns[index], ...data };
            this.showNotification('Campanha atualizada com sucesso!', 'success');
        }
    }

    async deleteCampaign() {
        if (!this.deletingCampaignId) return;

        try {
            // Simular exclusão (aqui você faria a chamada para o backend)
            this.campaigns = this.campaigns.filter(c => c.id !== this.deletingCampaignId);
            
            this.closeDeleteModal();
            this.renderCampaigns();
            this.showNotification('Campanha excluída com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao excluir campanha:', error);
            this.showNotification('Erro ao excluir campanha', 'error');
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
    window.campaignsManager = new CampaignsManager();
});
