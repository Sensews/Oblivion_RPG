/**
 * JavaScript para gerenciar Campanhas - Oblivion RPG
 */

class CampaignsManager {
    constructor() {
        this.campaigns = [];
        this.editingCampaignId = null;
        this.deletingCampaignId = null;
        this.userSession = null;
        this.uploadedImageData = null; // Para armazenar dados da imagem enviada
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
                
                // O user_id já existe na sessão, não precisa verificar outras propriedades
                if (this.userSession.user_id) {
                    console.log('ID do usuário detectado:', this.userSession.user_id);
                } else {
                    console.error('ID do usuário não encontrado na sessão:', this.userSession);
                    window.location.href = 'login.html';
                }
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

        // Upload de imagem
        const uploadBtn = document.getElementById('uploadImageBtn');
        const fileInput = document.getElementById('imageFileInput');
        const removeImageBtn = document.getElementById('removeImageBtn');

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', () => this.removeUploadedImage());
        }
    }

    // ================================
    // UPLOAD DE IMAGEM
    // ================================

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validar tipo do arquivo
        const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            this.showNotification('Tipo de arquivo não suportado. Use PNG, JPEG, GIF ou WebP.', 'error');
            return;
        }

        // Validar tamanho (5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('Arquivo muito grande. Máximo: 5MB', 'error');
            return;
        }

        try {
            this.showNotification('Processando imagem...', 'info');

            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('../../backend/upload-image.php', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }

            const text = await response.text();

            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                throw new Error('Resposta não é JSON válido: ' + text);
            }

            if (result.success) {
                this.uploadedImageData = result.data.base64;
                this.showImagePreview(result.data.base64);
                this.clearUrlInput();
                this.showNotification('Imagem carregada com sucesso!', 'success');
            } else {
                throw new Error(result.error || 'Erro ao processar imagem');
            }

        } catch (error) {
            this.showNotification('Erro ao enviar imagem: ' + error.message, 'error');
        }

        // Limpar input
        event.target.value = '';
    }

    showImagePreview(imageData) {
        const preview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');

        if (preview && previewImg) {
            previewImg.src = imageData;
            preview.style.display = 'block';
        }
    }

    removeUploadedImage() {
        this.uploadedImageData = null;
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.style.display = 'none';
        }
    }

    clearUrlInput() {
        const urlInput = document.getElementById('campaignImage');
        if (urlInput) {
            urlInput.value = '';
        }
    }

    // ================================
    // GERENCIAMENTO DE CAMPANHAS
    // ================================

    async loadCampaigns() {
        if (!this.userSession) {
            console.warn('Nenhuma sessão de usuário encontrada');
            return;
        }

        if (!this.userSession.user_id) {
            console.error('ID do usuário não está definido na sessão:', this.userSession);
            this.showNotification('Erro: ID do usuário não encontrado', 'error');
            return;
        }

        try {
            console.log('Carregando campanhas para user_id:', this.userSession.user_id);
            const response = await fetch(`../../backend/campaigns.php?user_id=${this.userSession.user_id}`);
            const data = await response.json();
            
            if (data.success) {
                this.campaigns = data.campaigns;
            } else {
                console.error('Erro ao carregar campanhas:', data.error);
                this.campaigns = [];
            }

            this.renderCampaigns();
        } catch (error) {
            console.error('Erro ao carregar campanhas:', error);
            this.showNotification('Erro ao carregar campanhas', 'error');
            this.campaigns = [];
            this.renderCampaigns();
        }
    }

    renderCampaigns() {
        const container = document.getElementById('existingCampaigns');
        if (!container) return;

        if (this.campaigns.length === 0) {
            container.innerHTML = '<p class="no-campaigns">Nenhuma campanha criada ainda.</p>';
            return;
        }

        // Limpar container
        container.innerHTML = '';

        // Criar cada card de campanha
        this.campaigns.forEach(campaign => {
            const campaignCard = this.createCampaignCard(campaign);
            container.appendChild(campaignCard);
        });
    }

    createCampaignCard(campaign) {
        // Criar elemento principal do card
        const cardDiv = document.createElement('div');
        cardDiv.className = 'campaign-card existing';
        cardDiv.setAttribute('data-id', campaign.id);

        // Criar container da imagem
        const imageDiv = document.createElement('div');
        imageDiv.className = `campaign-image ${campaign.foto_url ? '' : 'no-image'}`;

        if (campaign.foto_url) {
            // Criar elemento de imagem
            const img = document.createElement('img');
            img.src = campaign.foto_url;
            img.alt = campaign.nome;
            img.onerror = function() {
                this.style.display = 'none';
                this.parentElement.classList.add('no-image');
                this.parentElement.innerHTML = '<i class="fas fa-image"></i>';
            };
            imageDiv.appendChild(img);
        } else {
            // Criar ícone placeholder
            const icon = document.createElement('i');
            icon.className = 'fas fa-image';
            imageDiv.appendChild(icon);
        }

        // Criar container de informações
        const infoDiv = document.createElement('div');
        infoDiv.className = 'campaign-info';

        // Nome da campanha
        const nameH3 = document.createElement('h3');
        nameH3.className = 'campaign-name';
        nameH3.textContent = campaign.nome;

        // Descrição da campanha
        const descP = document.createElement('p');
        descP.className = 'campaign-description';
        descP.textContent = campaign.descricao || 'Sem descrição';

        // Container de ações
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'campaign-actions';

        // Botão editar
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit';
        editBtn.onclick = () => this.openEditModal(campaign.id);
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Editar';

        // Botão excluir
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.onclick = () => this.openDeleteModal(campaign.id);
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Excluir';

        // Montar a estrutura
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);

        infoDiv.appendChild(nameH3);
        infoDiv.appendChild(descP);
        infoDiv.appendChild(actionsDiv);

        cardDiv.appendChild(imageDiv);
        cardDiv.appendChild(infoDiv);

        return cardDiv;
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

        // Limpar imagem enviada
        this.removeUploadedImage();
        this.uploadedImageData = null;
    }

    fillForm(campaign) {
        const fields = {
            'campaignId': campaign.id,
            'campaignName': campaign.nome,
            'campaignDescription': campaign.descricao || ''
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });

        // Lidar com imagem
        if (campaign.foto_url) {
            if (campaign.foto_url.startsWith('data:image/')) {
                // É uma imagem base64 (enviada)
                this.uploadedImageData = campaign.foto_url;
                this.showImagePreview(campaign.foto_url);
            } else {
                // É uma URL
                const urlInput = document.getElementById('campaignImage');
                if (urlInput) {
                    urlInput.value = campaign.foto_url;
                }
            }
        }
    }

    async handleSaveCampaign(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            nome: formData.get('nome'),
            descricao: formData.get('descricao') || null,
            foto_url: null
        };

        // Usar imagem enviada ou URL
        if (this.uploadedImageData) {
            data.foto_url = this.uploadedImageData;
        } else {
            const urlInput = formData.get('foto_url');
            if (urlInput && urlInput.trim()) {
                data.foto_url = urlInput.trim();
            }
        }

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
        try {
            const response = await fetch('../../backend/campaigns.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...data,
                    mestre_id: this.userSession.user_id
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.campaigns.push(result.campaign);
                this.showNotification('Campanha criada com sucesso!', 'success');
            } else {
                throw new Error(result.error || 'Erro ao criar campanha');
            }
        } catch (error) {
            console.error('Erro ao criar campanha:', error);
            throw error;
        }
    }

    async updateCampaign(id, data) {
        try {
            const response = await fetch('../../backend/campaigns.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: id,
                    ...data,
                    mestre_id: this.userSession.user_id
                })
            });

            const result = await response.json();
            
            if (result.success) {
                const index = this.campaigns.findIndex(c => c.id === id);
                if (index !== -1) {
                    this.campaigns[index] = result.campaign;
                }
                this.showNotification('Campanha atualizada com sucesso!', 'success');
            } else {
                throw new Error(result.error || 'Erro ao atualizar campanha');
            }
        } catch (error) {
            console.error('Erro ao atualizar campanha:', error);
            throw error;
        }
    }

    async deleteCampaign() {
        if (!this.deletingCampaignId) return;

        try {
            const response = await fetch('../../backend/campaigns.php', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: this.deletingCampaignId,
                    mestre_id: this.userSession.user_id
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.campaigns = this.campaigns.filter(c => c.id !== this.deletingCampaignId);
                this.closeDeleteModal();
                this.renderCampaigns();
                this.showNotification('Campanha excluída com sucesso!', 'success');
            } else {
                throw new Error(result.error || 'Erro ao excluir campanha');
            }
            
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
