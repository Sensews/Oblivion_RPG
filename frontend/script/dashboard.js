/**
 * JavaScript para funcionalidades do Dashboard - Oblivion RPG
 */

class DashboardManager {
    constructor() {
        this.currentRole = 'jogador'; // Papel atual do usuário
        this.userSession = null;
        this.init();
    }

    init() {
        this.loadUserSession();
        this.initializeSettings();
        this.bindEvents();
        this.updateNavigation();
    }

    initializeSettings() {
        // Inicializar o SettingsManager se não estiver já inicializado
        if (!window.settingsManager) {
            window.settingsManager = new SettingsManager();
        }
        
        // Aplicar configurações
        window.settingsManager.applySettings();
    }

    // ================================
    // GERENCIAMENTO DE SESSÃO E PAPEL
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
                this.currentRole = this.userSession.user_type || 'jogador';
                console.log('Sessão do usuário carregada:', this.userSession);
            } catch (e) {
                console.error('Erro ao processar sessão:', e);
                // Se chegou até aqui, é porque o route-protection falhou
                window.location.href = 'login.html';
            }
        }
    }

    updateNavigation() {
        const dynamicNavItem = document.getElementById('dynamicNavItem');
        const dynamicNavLink = document.getElementById('dynamicNavLink');
        const dynamicNavIcon = document.getElementById('dynamicNavIcon');
        const dynamicNavText = document.getElementById('dynamicNavText');
        const roleToggleBtn = document.getElementById('roleToggleBtn');
        const currentRoleText = document.getElementById('currentRoleText');

        if (dynamicNavItem && dynamicNavLink && dynamicNavIcon && dynamicNavText) {
            // Mostrar item de navegação dinâmica
            dynamicNavItem.style.display = 'block';
            
            if (this.currentRole === 'mestre') {
                dynamicNavIcon.className = 'fas fa-gamepad';
                dynamicNavText.textContent = 'Gerenciar Campanhas';
                dynamicNavLink.setAttribute('data-page', 'campaigns');
            } else {
                dynamicNavIcon.className = 'fas fa-users';
                dynamicNavText.textContent = 'Gerenciar Personagens';
                dynamicNavLink.setAttribute('data-page', 'characters');
            }
        }

        // Atualizar texto do botão de alternância
        if (currentRoleText) {
            currentRoleText.textContent = this.currentRole === 'mestre' ? 'Mestre' : 'Jogador';
        }

        // Mostrar/esconder botão de alternância baseado na página atual
        if (roleToggleBtn) {
            const isDashboard = window.location.pathname.includes('dashboard.html') || window.location.pathname.endsWith('/');
            roleToggleBtn.style.display = isDashboard ? 'flex' : 'none';
        }
    }

    async toggleRole() {
        // Alternar entre mestre e jogador
        const newRole = this.currentRole === 'mestre' ? 'jogador' : 'mestre';
        
        try {
            // Aqui você pode adicionar uma chamada para o backend para atualizar o papel
            // Por enquanto, vamos apenas atualizar localmente
            
            this.currentRole = newRole;
            
            // Atualizar sessão local
            if (this.userSession) {
                this.userSession.user_type = newRole;
                const sessionKey = localStorage.getItem('oblivion_user_session') ? 'oblivion_user_session' : 'oblivion_user_session';
                if (localStorage.getItem('oblivion_user_session')) {
                    localStorage.setItem('oblivion_user_session', JSON.stringify(this.userSession));
                } else {
                    sessionStorage.setItem('oblivion_user_session', JSON.stringify(this.userSession));
                }
            }
            
            this.updateNavigation();
            this.showNotification(`Alterado para: ${newRole === 'mestre' ? 'Mestre' : 'Jogador'}`, 'success');
            
        } catch (error) {
            console.error('Erro ao alternar papel:', error);
            this.showNotification('Erro ao alternar papel', 'error');
        }
    }

    // ================================
    // EVENT LISTENERS
    // ================================

    bindEvents() {
        // Botão de logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Botão de alternar papel
        const roleToggleBtn = document.getElementById('roleToggleBtn');
        if (roleToggleBtn) {
            roleToggleBtn.addEventListener('click', () => this.toggleRole());
        }

        // Logo clicável para voltar ao dashboard
        const logoHome = document.getElementById('logoHome');
        if (logoHome) {
            logoHome.addEventListener('click', () => {
                window.location.href = 'dashboard.html';
            });
        }

        // Link de navegação dinâmica
        const dynamicNavLink = document.getElementById('dynamicNavLink');
        if (dynamicNavLink) {
            dynamicNavLink.addEventListener('click', (e) => {
                e.preventDefault();
                const page = dynamicNavLink.getAttribute('data-page');
                if (page) {
                    window.location.href = `${page}.html`;
                }
            });
        }
    }

    // ================================
    // SISTEMA DE LOGOUT
    // ================================

    handleLogout() {
        if (confirm('Tem certeza que deseja sair?')) {
            // Limpar todos os dados de sessão
            localStorage.removeItem('userSession');
            localStorage.removeItem('oblivion_user_session');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            sessionStorage.clear();
            
            // Redirecionar para login
            window.location.href = 'login.html';
        }
    }

    // ================================
    // SISTEMA DE NOTIFICAÇÕES
    // ================================

    showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Adicionar estilos se não existirem
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 100px;
                    right: 2rem;
                    background: var(--card-bg);
                    border: 2px solid var(--accent-color);
                    border-radius: 10px;
                    padding: 1rem 1.5rem;
                    color: var(--text-primary);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                    z-index: 3000;
                    transform: translateX(400px);
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    max-width: 350px;
                }
                .notification.show {
                    transform: translateX(0);
                }
                .notification-success {
                    border-color: #4ecdc4;
                }
                .notification-success i {
                    color: #4ecdc4;
                }
            `;
            document.head.appendChild(styles);
        }

        // Adicionar ao DOM
        document.body.appendChild(notification);

        // Mostrar notificação
        setTimeout(() => notification.classList.add('show'), 100);

        // Remover após 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard: Inicializando...');
    
    // A verificação de autenticação já foi feita no HTML
    // Inicializar o dashboard diretamente
    window.dashboardManager = new DashboardManager();
    console.log('Dashboard: Inicializado com sucesso');
});

// Exportar para uso global
window.DashboardManager = DashboardManager;
