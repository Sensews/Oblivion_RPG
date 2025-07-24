/**
 * JavaScript para gerenciamento de NPCs - Oblivion RPG
 */

class NpcsManager {
    constructor() {
        this.campaignId = null;
        this.userSession = null;
        this.npcs = [];
        this.currentView = 'grid'; // 'grid' or 'list'
        this.deletingNpcId = null;
        this.init();
    }

    init() {
        this.loadUserSession();
        this.getCampaignIdFromUrl();
        this.bindEvents();
        this.loadNpcs();
    }

    // ================================
    // GERENCIAMENTO DE SESSÃO
    // ================================

    loadUserSession() {
        let userSession = localStorage.getItem('oblivion_user_session');
        if (!userSession) {
            userSession = sessionStorage.getItem('oblivion_user_session');
        }
        
        if (userSession) {
            try {
                this.userSession = JSON.parse(userSession);
            } catch (e) {
                console.error('Erro ao parsear sessão:', e);
                this.redirectToLogin();
            }
        } else {
            this.redirectToLogin();
        }
    }

    redirectToLogin() {
        window.location.href = 'login.html';
    }

    // ================================
    // OBTER ID DA CAMPANHA DA URL
    // ================================

    getCampaignIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        this.campaignId = urlParams.get('campaign');
        
        if (!this.campaignId) {
            this.showError('ID da campanha não fornecido na URL');
            setTimeout(() => {
                window.location.href = 'campaigns.html';
            }, 2000);
            return;
        }
        
        if (!this.isValidId(this.campaignId)) {
            this.showError('ID da campanha inválido');
            setTimeout(() => {
                window.location.href = 'campaigns.html';
            }, 2000);
            return;
        }

        // Atualizar links de navegação
        this.updateNavigationLinks();
    }

    isValidId(id) {
        return id && /^[0-9]+$/.test(id) && parseInt(id) > 0;
    }

    updateNavigationLinks() {
        const campaignLink = document.getElementById('campaignLink');
        if (campaignLink) {
            campaignLink.href = `campaign-view.html?id=${this.campaignId}`;
        }
    }

    // ================================
    // EVENT LISTENERS
    // ================================

    bindEvents() {
        // Botão criar NPC
        const createNpcBtn = document.getElementById('createNpcBtn');
        const createFirstNpcBtn = document.getElementById('createFirstNpcBtn');
        
        if (createNpcBtn) {
            createNpcBtn.addEventListener('click', () => this.createNewNpc());
        }
        
        if (createFirstNpcBtn) {
            createFirstNpcBtn.addEventListener('click', () => this.createNewNpc());
        }

        // Controles de visualização
        const gridViewBtn = document.getElementById('gridViewBtn');
        const listViewBtn = document.getElementById('listViewBtn');

        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', () => this.setView('grid'));
        }

        if (listViewBtn) {
            listViewBtn.addEventListener('click', () => this.setView('list'));
        }

        // Modal de delete
        const deleteModal = document.getElementById('deleteModal');
        const deleteBackdrop = document.getElementById('deleteBackdrop');
        const cancelDelete = document.getElementById('cancelDelete');
        const confirmDelete = document.getElementById('confirmDelete');

        if (deleteBackdrop) {
            deleteBackdrop.addEventListener('click', () => this.closeDeleteModal());
        }

        if (cancelDelete) {
            cancelDelete.addEventListener('click', () => this.closeDeleteModal());
        }

        if (confirmDelete) {
            confirmDelete.addEventListener('click', () => this.confirmDeleteNpc());
        }

        // Logo home
        const logoHome = document.getElementById('logoHome');
        if (logoHome) {
            logoHome.addEventListener('click', () => {
                window.location.href = 'dashboard.html';
            });
        }
    }

    // ================================
    // CONTROLES DE VISUALIZAÇÃO
    // ================================

    setView(viewType) {
        this.currentView = viewType;
        
        // Atualizar botões
        const gridBtn = document.getElementById('gridViewBtn');
        const listBtn = document.getElementById('listViewBtn');
        
        if (gridBtn && listBtn) {
            gridBtn.classList.toggle('active', viewType === 'grid');
            listBtn.classList.toggle('active', viewType === 'list');
        }
        
        // Atualizar grid
        const npcsGrid = document.getElementById('npcsGrid');
        if (npcsGrid) {
            npcsGrid.classList.toggle('list-view', viewType === 'list');
        }
        
        // Re-renderizar NPCs
        this.renderNpcs();
    }

    // ================================
    // CARREGAR E RENDERIZAR NPCS
    // ================================

    async loadNpcs() {
        if (!this.campaignId || !this.userSession) return;

        this.showLoading(true);

        try {
            const url = `/Oblivion_RPG/backend/npcs.php?campaign_id=${this.campaignId}&user_id=${this.userSession.user_id}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            this.npcs = data.npcs || [];
            this.renderNpcs();

        } catch (error) {
            console.error('Erro ao carregar NPCs:', error);
            this.showError('Erro ao carregar NPCs: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    renderNpcs() {
        const loadingEl = document.getElementById('npcsLoading');
        const noNpcsEl = document.getElementById('noNpcs');
        const gridEl = document.getElementById('npcsGrid');

        // Esconder loading
        if (loadingEl) loadingEl.style.display = 'none';

        if (this.npcs.length === 0) {
            // Mostrar estado vazio
            if (noNpcsEl) noNpcsEl.style.display = 'block';
            if (gridEl) gridEl.style.display = 'none';
        } else {
            // Mostrar NPCs
            if (noNpcsEl) noNpcsEl.style.display = 'none';
            if (gridEl) {
                gridEl.style.display = 'grid';
                gridEl.innerHTML = '';
                
                this.npcs.forEach(npc => {
                    const npcCard = this.createNpcCard(npc);
                    gridEl.appendChild(npcCard);
                });
            }
        }
    }

    createNpcCard(npc) {
        const card = document.createElement('div');
        card.className = `npc-card ${this.currentView === 'list' ? 'list-view' : ''}`;
        card.setAttribute('data-npc-id', npc.id);

        // Avatar
        const avatar = document.createElement('div');
        avatar.className = 'npc-avatar';
        
        if (npc.imagem_url && npc.imagem_url.trim()) {
            const img = document.createElement('img');
            img.src = npc.imagem_url;
            img.alt = npc.nome_npc;
            img.onerror = function() {
                this.style.display = 'none';
                this.parentElement.innerHTML = '<div class="avatar-placeholder"><i class="fas fa-mask"></i></div>';
            };
            avatar.appendChild(img);
        } else {
            avatar.innerHTML = '<div class="avatar-placeholder"><i class="fas fa-mask"></i></div>';
        }

        // Informações
        const info = document.createElement('div');
        info.className = 'npc-info';
        
        const name = document.createElement('h3');
        name.className = 'npc-name';
        name.textContent = npc.nome_npc;
        
        // Stats
        const stats = document.createElement('div');
        stats.className = 'npc-stats';
        stats.innerHTML = `
            <div class="stat-item">
                <i class="fas fa-heart"></i>
                <span>${npc.pv_atual || 0}/${npc.pv_max || 0}</span>
            </div>
            <div class="stat-item">
                <i class="fas fa-shield-alt"></i>
                <span>${npc.defesa || 0}</span>
            </div>
        `;
        
        // Barra de vida
        const healthBar = document.createElement('div');
        healthBar.className = 'health-bar';
        
        const currentHP = parseInt(npc.pv_atual) || 0;
        const maxHP = parseInt(npc.pv_max) || 1;
        const healthPercent = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));
        
        let healthClass = 'high';
        if (healthPercent <= 25) healthClass = 'low';
        else if (healthPercent <= 50) healthClass = 'medium';
        
        healthBar.innerHTML = `
            <div class="health-bar-label">
                <span>Vida</span>
                <span>${currentHP}/${maxHP}</span>
            </div>
            <div class="health-progress">
                <div class="health-fill ${healthClass}" style="width: ${healthPercent}%"></div>
            </div>
        `;

        // Ações
        const actions = document.createElement('div');
        actions.className = 'npc-actions';
        actions.innerHTML = `
            <button class="action-btn edit-btn" title="Editar Ficha">
                <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete-btn" title="Excluir NPC">
                <i class="fas fa-trash"></i>
            </button>
        `;

        // Event listeners
        const editBtn = actions.querySelector('.edit-btn');
        const deleteBtn = actions.querySelector('.delete-btn');

        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editNpc(npc.id);
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openDeleteModal(npc.id, npc.nome_npc);
        });

        // Clique no card para editar
        card.addEventListener('click', () => {
            this.editNpc(npc.id);
        });

        // Montar card
        info.appendChild(name);
        info.appendChild(stats);
        info.appendChild(healthBar);

        card.appendChild(avatar);
        card.appendChild(info);
        card.appendChild(actions);

        return card;
    }

    // ================================
    // AÇÕES DOS NPCS
    // ================================

    createNewNpc() {
        // Navegar para página de criação
        window.location.href = `npc-sheet.html?campaign=${this.campaignId}`;
    }

    editNpc(npcId) {
        // Navegar para página de edição
        window.location.href = `npc-sheet.html?campaign=${this.campaignId}&npc=${npcId}`;
    }

    openDeleteModal(npcId, npcName) {
        this.deletingNpcId = npcId;
        
        const modal = document.getElementById('deleteModal');
        const nameEl = document.getElementById('deleteNpcName');
        
        if (nameEl) {
            nameEl.textContent = npcName;
        }
        
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    closeDeleteModal() {
        this.deletingNpcId = null;
        
        const modal = document.getElementById('deleteModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    async confirmDeleteNpc() {
        if (!this.deletingNpcId) return;

        try {
            const response = await fetch('/Oblivion_RPG/backend/npcs.php', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    npc_id: this.deletingNpcId,
                    user_id: this.userSession.user_id
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            this.showNotification('NPC excluído com sucesso', 'success');
            this.closeDeleteModal();
            this.loadNpcs(); // Recarregar lista

        } catch (error) {
            console.error('Erro ao excluir NPC:', error);
            this.showError('Erro ao excluir NPC: ' + error.message);
        }
    }

    // ================================
    // UTILITÁRIOS DE UI
    // ================================

    showLoading(show) {
        const loadingEl = document.getElementById('npcsLoading');
        const gridEl = document.getElementById('npcsGrid');
        const noNpcsEl = document.getElementById('noNpcs');

        if (show) {
            if (loadingEl) loadingEl.style.display = 'block';
            if (gridEl) gridEl.style.display = 'none';
            if (noNpcsEl) noNpcsEl.style.display = 'none';
        } else {
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Criar notificação temporária
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${this.getNotificationIcon(type)}"></i>
            <span>${this.escapeHtml(message)}</span>
        `;
        
        // Estilos inline para a notificação
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: this.getNotificationColor(type),
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            fontWeight: '600',
            zIndex: '10000',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            maxWidth: '400px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            animation: 'slideInRight 0.3s ease'
        });

        document.body.appendChild(notification);

        // Remover após 5 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    getNotificationColor(type) {
        const colors = {
            'success': '#2ecc71',
            'error': '#e74c3c',
            'warning': '#f39c12',
            'info': '#3498db'
        };
        return colors[type] || colors.info;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.npcsManager = new NpcsManager();
});

// Exportar para uso global
window.NpcsManager = NpcsManager;

// Adicionar animações CSS dinamicamente
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
