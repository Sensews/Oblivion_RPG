/**
 * JavaScript para a página de visualização de campanha - Oblivion RPG
 */

class CampaignView {
    constructor() {
        this.campaignId = null;
        this.campaignData = null;
        this.userSession = null;
        this.isLoading = false;
        this.init();
    }

    init() {
        this.loadUserSession();
        this.getCampaignIdFromUrl();
        this.bindEvents();
        this.loadCampaignData();
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
        this.campaignId = urlParams.get('id');
        
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
    }

    isValidId(id) {
        return id && /^[0-9]+$/.test(id) && parseInt(id) > 0;
    }

    // ================================
    // EVENT LISTENERS
    // ================================

    bindEvents() {
        // Botão de copiar código de convite
        const copyBtn = document.getElementById('copyInviteBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyInviteCode());
        }

        // Cards de funcionalidades
        const manageCharactersCard = document.getElementById('manageCharactersCard');
        const textEditorCard = document.getElementById('textEditorCard');
        const manageNpcsCard = document.getElementById('manageNpcsCard');
        const campaignSettingsCard = document.getElementById('campaignSettingsCard');

        if (manageCharactersCard) {
            manageCharactersCard.addEventListener('click', () => this.openCharactersManager());
        }

        if (textEditorCard) {
            textEditorCard.addEventListener('click', () => this.openTextEditor());
        }

        if (manageNpcsCard) {
            manageNpcsCard.addEventListener('click', () => this.openNpcsManager());
        }

        if (campaignSettingsCard) {
            campaignSettingsCard.addEventListener('click', () => this.openCampaignSettings());
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
    // CARREGAR DADOS DA CAMPANHA
    // ================================

    async loadCampaignData() {
        if (!this.campaignId || !this.userSession) return;

        this.showLoading(true);

        try {
            const url = `/Oblivion_RPG/backend/campaign-details.php?id=${this.campaignId}&user_id=${this.userSession.user_id}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Resposta inválida do servidor: ${text.substring(0, 100)}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.campaign) {
                throw new Error('Dados da campanha não encontrados na resposta');
            }

            this.campaignData = data.campaign;
            this.updatePageContent();
            this.loadStats();

        } catch (error) {
            this.showError('Erro ao carregar dados da campanha: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    updatePageContent() {
        if (!this.campaignData) return;

        // Atualizar título da página
        document.title = `${this.campaignData.nome} - Oblivion RPG`;
        
        // Atualizar elementos da página
        this.updateElement('campaignName', this.campaignData.nome);
        this.updateElement('campaignDescription', this.campaignData.descricao || 'Sem descrição disponível');
        this.updateElement('navCampaignName', this.campaignData.nome);
        this.updateElement('inviteCode', this.campaignData.codigo_convite);

        // Atualizar data de criação
        if (this.campaignData.criado_em) {
            const date = new Date(this.campaignData.criado_em);
            const formattedDate = date.toLocaleDateString('pt-BR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            this.updateElement('campaignDate', formattedDate);
        }

        // Atualizar imagem da campanha
        this.updateCampaignImage();
    }

    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            if (element.tagName === 'TITLE') {
                element.textContent = content;
            } else if (element.tagName === 'INPUT') {
                element.value = content;
            } else {
                element.textContent = content;
            }
        }
    }

    updateCampaignImage() {
        const img = document.getElementById('campaignImage');
        const placeholder = document.getElementById('campaignImagePlaceholder');
        
        if (this.campaignData.foto_url && this.campaignData.foto_url.trim()) {
            if (img && placeholder) {
                img.src = this.campaignData.foto_url;
                img.style.display = 'block';
                placeholder.style.display = 'none';
                
                // Tratar erro de carregamento da imagem
                img.onerror = () => {
                    img.style.display = 'none';
                    placeholder.style.display = 'flex';
                };
            }
        } else {
            if (img && placeholder) {
                img.style.display = 'none';
                placeholder.style.display = 'flex';
            }
        }
    }

    // ================================
    // CARREGAR ESTATÍSTICAS
    // ================================

    async loadStats() {
        if (!this.campaignId) return;

        try {
            // Carregar estatísticas da campanha
            const response = await fetch(`/Oblivion_RPG/backend/campaign-stats.php?campaign_id=${this.campaignId}`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (!data.error) {
                    this.updateElement('characterCount', data.characters || 0);
                    this.updateElement('documentCount', data.documents || 0);
                    this.updateElement('npcCount', data.npcs || 0);
                }
            }
        } catch (error) {
            console.warn('Erro ao carregar estatísticas:', error);
            // Não é um erro crítico, apenas log de aviso
        }
    }

    // ================================
    // FUNCIONALIDADES DOS CARDS
    // ================================

    openCharactersManager() {
        this.showNotification('Funcionalidade em desenvolvimento', 'info');
        // TODO: Implementar navegação para gerenciador de personagens
        // window.location.href = `characters-manager.html?campaign=${this.campaignId}`;
    }

    openTextEditor() {
        this.showNotification('Funcionalidade em desenvolvimento', 'info');
        // TODO: Implementar navegação para editor de texto
        // window.location.href = `text-editor.html?campaign=${this.campaignId}`;
    }

    openNpcsManager() {
        this.showNotification('Funcionalidade em desenvolvimento', 'info');
        // TODO: Implementar navegação para gerenciador de NPCs
        // window.location.href = `npcs-manager.html?campaign=${this.campaignId}`;
    }

    openCampaignSettings() {
        this.showNotification('Funcionalidade em desenvolvimento', 'info');
        // TODO: Implementar modal ou página de configurações da campanha
    }

    // ================================
    // COPIAR CÓDIGO DE CONVITE
    // ================================

    async copyInviteCode() {
        const inviteCode = document.getElementById('inviteCode');
        if (!inviteCode || !this.campaignData) return;

        try {
            await navigator.clipboard.writeText(this.campaignData.codigo_convite);
            this.showCopyNotification('Código copiado para a área de transferência!');
        } catch (error) {
            // Fallback para navegadores que não suportam clipboard API
            this.fallbackCopyText(this.campaignData.codigo_convite);
        }
    }

    fallbackCopyText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showCopyNotification('Código copiado para a área de transferência!');
        } catch (error) {
            console.error('Erro ao copiar:', error);
            this.showNotification('Erro ao copiar código', 'error');
        } finally {
            document.body.removeChild(textArea);
        }
    }

    // ================================
    // UTILITÁRIOS DE UI
    // ================================

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            if (show) {
                overlay.classList.add('show');
            } else {
                overlay.classList.remove('show');
            }
        }
        this.isLoading = show;
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
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        document.body.appendChild(notification);

        // Animar entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Remover após delay
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    showCopyNotification(message) {
        // Criar notificação específica para cópia
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.innerHTML = `
            <i class="fas fa-check"></i>
            <span>${this.escapeHtml(message)}</span>
        `;

        // Estilos específicos
        Object.assign(notification.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--accent-color)',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '8px',
            fontWeight: '600',
            zIndex: '10000',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            opacity: '0',
            visibility: 'hidden',
            transition: 'all 0.3s ease'
        });

        document.body.appendChild(notification);

        // Animar
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.visibility = 'visible';
        }, 10);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.visibility = 'hidden';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }

    getNotificationIcon(type) {
        const icons = {
            'info': 'fa-info-circle',
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-triangle',
            'warning': 'fa-exclamation-circle'
        };
        return icons[type] || icons['info'];
    }

    getNotificationColor(type) {
        const colors = {
            'info': '#3498db',
            'success': '#2ecc71',
            'error': '#e74c3c',
            'warning': '#f39c12'
        };
        return colors[type] || colors['info'];
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.campaignView = new CampaignView();
});

// Exportar para uso global
window.CampaignView = CampaignView;
