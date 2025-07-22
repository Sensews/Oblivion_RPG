/**
 * Sistema de Proteção de Rotas - Oblivion RPG
 * 
 * Este sistema verifica se o usuário tem permissão para acessar certas páginas
 * e redireciona automaticamente se necessário.
 */

class RouteProtection {
    constructor() {
        this.protectedPages = {
            // Páginas que exigem token específico
            'reset-password.html': {
                type: 'token_required',
                tokenParam: 'token',
                redirectTo: 'login.html',
                errorMessage: 'Token de recuperação inválido ou expirado'
            },
            
            // Páginas que exigem login (futuro)
            'dashboard.html': {
                type: 'login_required',
                redirectTo: 'login.html',
                errorMessage: 'Você precisa estar logado para acessar esta página'
            },
            
            'profile.html': {
                type: 'login_required',
                redirectTo: 'login.html',
                errorMessage: 'Você precisa estar logado para acessar esta página'
            },
            
            'game.html': {
                type: 'login_required',
                redirectTo: 'login.html',
                errorMessage: 'Você precisa estar logado para acessar o jogo'
            }
        };
        
        this.currentPage = this.getCurrentPageName();
        this.init();
    }
    
    init() {
        // Verificar proteção apenas se estivermos em uma página protegida
        if (this.isProtectedPage()) {
            this.checkAccess();
        }
    }
    
    getCurrentPageName() {
        const path = window.location.pathname;
        return path.substring(path.lastIndexOf('/') + 1);
    }
    
    isProtectedPage() {
        return this.protectedPages.hasOwnProperty(this.currentPage);
    }
    
    async checkAccess() {
        const pageConfig = this.protectedPages[this.currentPage];
        
        switch (pageConfig.type) {
            case 'token_required':
                await this.checkTokenAccess(pageConfig);
                break;
                
            case 'login_required':
                this.checkLoginAccess(pageConfig);
                break;
                
            default:
                console.warn('Tipo de proteção desconhecido:', pageConfig.type);
        }
    }
    
    async checkTokenAccess(pageConfig) {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get(pageConfig.tokenParam);
        
        // Verificar se o token existe na URL
        if (!token) {
            this.redirectWithError(pageConfig.redirectTo, 'Token de acesso não encontrado');
            return;
        }
        
        // Verificar formato do token (deve ser hexadecimal de 64 caracteres)
        if (!this.isValidTokenFormat(token)) {
            this.redirectWithError(pageConfig.redirectTo, 'Formato de token inválido');
            return;
        }
        
        // Validar token no servidor (apenas para reset-password)
        if (this.currentPage === 'reset-password.html') {
            const isValid = await this.validateResetToken(token);
            if (!isValid) {
                this.redirectWithError(pageConfig.redirectTo, pageConfig.errorMessage);
                return;
            }
        }
        
        // Token válido - permitir acesso
        this.logAccess('Token válido - acesso permitido');
    }
    
    checkLoginAccess(pageConfig) {
        // Verificar se o usuário está logado (verificar localStorage/sessionStorage)
        const userSession = this.getUserSession();
        
        if (!userSession || !this.isValidSession(userSession)) {
            this.redirectWithError(pageConfig.redirectTo, pageConfig.errorMessage);
            return;
        }
        
        // Sessão válida - permitir acesso
        this.logAccess('Sessão válida - acesso permitido');
    }
    
    isValidTokenFormat(token) {
        // Token deve ter exatamente 64 caracteres hexadecimais
        const tokenRegex = /^[a-f0-9]{64}$/;
        return tokenRegex.test(token);
    }
    
    async validateResetToken(token) {
        try {
            const response = await fetch('../../backend/validate-reset-token.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: token })
            });
            
            if (!response.ok) {
                return false;
            }
            
            const data = await response.json();
            return data.success === true;
            
        } catch (error) {
            console.error('Erro ao validar token:', error);
            return false;
        }
    }
    
    getUserSession() {
        // Verificar localStorage primeiro
        let session = localStorage.getItem('oblivion_user_session');
        
        // Se não encontrou, verificar sessionStorage
        if (!session) {
            session = sessionStorage.getItem('oblivion_user_session');
        }
        
        try {
            return session ? JSON.parse(session) : null;
        } catch (e) {
            console.warn('Sessão inválida encontrada, removendo...');
            this.clearSession();
            return null;
        }
    }
    
    isValidSession(session) {
        // Verificar se a sessão tem os campos obrigatórios
        if (!session || !session.user_id || !session.token || !session.expires_at) {
            return false;
        }
        
        // Verificar se a sessão não expirou
        const now = new Date().getTime();
        const expiresAt = new Date(session.expires_at).getTime();
        
        if (now >= expiresAt) {
            this.clearSession();
            return false;
        }
        
        return true;
    }
    
    clearSession() {
        localStorage.removeItem('oblivion_user_session');
        sessionStorage.removeItem('oblivion_user_session');
    }
    
    redirectWithError(redirectPage, errorMessage) {
        // Adicionar mensagem de erro à URL
        const errorParam = encodeURIComponent(errorMessage);
        const separator = redirectPage.includes('?') ? '&' : '?';
        const redirectUrl = `${redirectPage}${separator}error=${errorParam}`;
        
        this.logAccess(`Acesso negado: ${errorMessage} - Redirecionando para ${redirectPage}`);
        
        // Redirecionar após um pequeno delay para evitar loops
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 100);
    }
    
    logAccess(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] RouteProtection: ${message}`);
        
        // Opcional: enviar log para o servidor
        // this.sendAccessLog(message);
    }
    
    // Método para futuro uso - enviar logs de acesso para o servidor
    async sendAccessLog(message, level = 'info') {
        try {
            // Implementar quando houver endpoint de logs
            /*
            await fetch('/backend/log-access.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    page: this.currentPage,
                    message: message,
                    level: level,
                    timestamp: new Date().toISOString(),
                    user_agent: navigator.userAgent,
                    referrer: document.referrer
                })
            });
            */
        } catch (error) {
            console.warn('Erro ao enviar log de acesso:', error);
        }
    }
    
    // Método estático para verificação manual
    static async checkPageAccess(pageName, options = {}) {
        const protection = new RouteProtection();
        protection.currentPage = pageName;
        
        if (protection.isProtectedPage()) {
            await protection.checkAccess();
            return false; // Se chegou até aqui, pode ter redirecionado
        }
        
        return true; // Página não protegida ou acesso permitido
    }
    
    // Método para adicionar proteção dinamicamente
    static addProtection(pageName, config) {
        if (!window.routeProtection) {
            window.routeProtection = new RouteProtection();
        }
        
        window.routeProtection.protectedPages[pageName] = config;
    }
}

// Inicializar automaticamente quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Criar instância global para acesso em outras partes do código
    window.routeProtection = new RouteProtection();
});

// Exportar para uso como módulo se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RouteProtection;
}

// Adicionar ao window para acesso global
window.RouteProtection = RouteProtection;
