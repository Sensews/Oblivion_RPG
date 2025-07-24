/**
 * JavaScript para o Editor de Texto - Oblivion RPG
 */

class TextEditor {
    constructor() {
        this.campaignId = null;
        this.documentId = null;
        this.userSession = null;
        this.quill = null;
        this.isLoading = false;
        this.hasUnsavedChanges = false;
        this.autoSaveTimer = null;
        this.lastSaveTime = null;
        this.init();
    }

    init() {
        this.loadUserSession();
        this.getParamsFromUrl();
        this.initializeQuill();
        this.bindEvents();
        this.loadDocumentData();
        this.setupAutoSave();
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

    getAuthToken() {
        if (this.userSession) {
            // Enviar apenas os dados necessários para validação
            const sessionData = {
                user_id: this.userSession.user_id
            };
            return btoa(JSON.stringify(sessionData));
        }
        return null;
    }

    // ================================
    // PARÂMETROS DA URL
    // ================================

    getParamsFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        this.campaignId = urlParams.get('campaign');
        this.documentId = urlParams.get('document');
        
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

        // Configurar link de retorno à campanha
        const campaignLink = document.getElementById('campaignLink');
        if (campaignLink) {
            campaignLink.href = `campaign-view.html?id=${this.campaignId}`;
        }
    }

    isValidId(id) {
        return id && /^[0-9]+$/.test(id) && parseInt(id) > 0;
    }

    // ================================
    // INICIALIZAÇÃO DO QUILL
    // ================================

    initializeQuill() {
        const toolbarOptions = [
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            
            [{ 'header': 1 }, { 'header': 2 }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'script': 'sub'}, { 'script': 'super' }],
            [{ 'indent': '-1'}, { 'indent': '+1' }],
            [{ 'direction': 'rtl' }],

            [{ 'size': ['small', false, 'large', 'huge'] }],
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

            [{ 'color': [] }, { 'background': [] }],
            [{ 'font': [] }],
            [{ 'align': [] }],

            ['clean'],
            ['link']
        ];

        this.quill = new Quill('#editor', {
            theme: 'snow',
            modules: {
                toolbar: toolbarOptions
            },
            placeholder: 'Comece a escrever seu documento...'
        });

        // Detectar mudanças
        this.quill.on('text-change', () => {
            this.hasUnsavedChanges = true;
            this.updateStatus('Documento modificado');
            this.scheduleAutoSave();
        });
    }

    // ================================
    // EVENT LISTENERS
    // ================================

    bindEvents() {
        // Botões de ação
        const backBtn = document.getElementById('backBtn');
        const saveBtn = document.getElementById('saveBtn');
        const saveAndExitBtn = document.getElementById('saveAndExitBtn');

        if (backBtn) {
            backBtn.addEventListener('click', () => this.handleBack());
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveDocument());
        }

        if (saveAndExitBtn) {
            saveAndExitBtn.addEventListener('click', () => this.saveAndExit());
        }

        // Título do documento
        const titleInput = document.getElementById('documentTitle');
        if (titleInput) {
            titleInput.addEventListener('input', () => {
                this.hasUnsavedChanges = true;
                this.updateStatus('Documento modificado');
                this.scheduleAutoSave();
            });
        }

        // Atalhos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 's') {
                    e.preventDefault();
                    this.saveDocument();
                }
            }
        });

        // Aviso antes de sair se houver mudanças não salvas
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
                return e.returnValue;
            }
        });

        // Logo home
        const logoHome = document.getElementById('logoHome');
        if (logoHome) {
            logoHome.addEventListener('click', () => {
                if (this.hasUnsavedChanges) {
                    const confirmed = confirm('Você tem alterações não salvas. Deseja salvar antes de sair?');
                    if (confirmed) {
                        this.saveAndExit('dashboard.html');
                        return;
                    }
                }
                window.location.href = 'dashboard.html';
            });
        }
    }

    // ================================
    // CARREGAMENTO DE DADOS
    // ================================

    async loadDocumentData() {
        if (!this.documentId) {
            // Novo documento
            this.updateStatus('Novo documento');
            this.hideDocumentInfo();
            return;
        }

        this.showLoading(true);

        try {
            const authToken = this.getAuthToken();
            const response = await fetch(`/Oblivion_RPG/backend/get-document.php?id=${this.documentId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Erro ao carregar documento');
            }

            // Preencher dados do documento
            this.populateDocument(data.document);
            this.updateStatus('Documento carregado');
            this.hasUnsavedChanges = false;

        } catch (error) {
            console.error('Erro ao carregar documento:', error);
            this.showError(`Erro ao carregar documento: ${error.message}`);
            
            // Redirecionar de volta após erro
            setTimeout(() => {
                window.location.href = `campaign-view.html?id=${this.campaignId}`;
            }, 3000);
        } finally {
            this.showLoading(false);
        }
    }

    populateDocument(doc) {
        // Título
        const titleInput = document.getElementById('documentTitle');
        if (titleInput) {
            titleInput.value = doc.titulo || '';
        }

        // Conteúdo
        if (doc.conteudo) {
            this.quill.root.innerHTML = doc.conteudo;
        }

        // Informações do documento
        this.showDocumentInfo(doc);

        // Atualizar nome da campanha na nav
        const navCampaignName = document.getElementById('navCampaignName');
        if (navCampaignName && doc.campanha_nome) {
            navCampaignName.textContent = doc.campanha_nome;
        }
    }

    showDocumentInfo(doc) {
        const infoEl = document.getElementById('documentInfo');
        const lastModifiedEl = document.getElementById('lastModified');
        const createdAtEl = document.getElementById('createdAt');

        if (infoEl && lastModifiedEl && createdAtEl) {
            lastModifiedEl.textContent = `Última modificação: ${doc.ultima_edicao_formatada}`;
            createdAtEl.textContent = `Criado em: ${doc.criado_em_formatado}`;
            infoEl.style.display = 'flex';
        }
    }

    hideDocumentInfo() {
        const infoEl = document.getElementById('documentInfo');
        if (infoEl) {
            infoEl.style.display = 'none';
        }
    }

    // ================================
    // SALVAMENTO
    // ================================

    async saveDocument() {
        const titleInput = document.getElementById('documentTitle');
        const title = titleInput ? titleInput.value.trim() : '';
        
        if (!title) {
            this.showError('Por favor, digite um título para o documento');
            titleInput?.focus();
            return false;
        }

        const content = this.quill.root.innerHTML;

        this.showLoading(true);
        this.updateStatus('Salvando...');

        try {
            const authToken = this.getAuthToken();
            const url = '/Oblivion_RPG/backend/editor-documents.php';
            const method = this.documentId ? 'PUT' : 'POST';
            
            const payload = {
                titulo: title,
                conteudo: content
            };

            if (this.documentId) {
                payload.id = this.documentId;
            } else {
                payload.campaign_id = this.campaignId;
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Erro ao salvar documento');
            }

            // Se é um novo documento, salvar o ID
            if (!this.documentId && data.document_id) {
                this.documentId = data.document_id;
                // Atualizar URL
                const newUrl = `${window.location.pathname}?campaign=${this.campaignId}&document=${this.documentId}`;
                window.history.replaceState({}, '', newUrl);
            }

            this.hasUnsavedChanges = false;
            this.lastSaveTime = new Date();
            this.updateStatus('Documento salvo');
            this.showAutoSaveStatus('Salvo automaticamente');
            
            return true;

        } catch (error) {
            console.error('Erro ao salvar documento:', error);
            this.showError(`Erro ao salvar: ${error.message}`);
            this.updateStatus('Erro ao salvar');
            return false;
        } finally {
            this.showLoading(false);
        }
    }

    async saveAndExit(redirectUrl = null) {
        const saved = await this.saveDocument();
        if (saved) {
            const url = redirectUrl || `campaign-view.html?id=${this.campaignId}`;
            window.location.href = url;
        }
    }

    // ================================
    // AUTO-SAVE
    // ================================

    setupAutoSave() {
        // Auto-save a cada 30 segundos se houver mudanças
        setInterval(() => {
            if (this.hasUnsavedChanges && !this.isLoading) {
                this.autoSave();
            }
        }, 30000);
    }

    scheduleAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }

        // Auto-save após 5 segundos de inatividade
        this.autoSaveTimer = setTimeout(() => {
            if (this.hasUnsavedChanges && !this.isLoading) {
                this.autoSave();
            }
        }, 5000);
    }

    async autoSave() {
        const titleInput = document.getElementById('documentTitle');
        const title = titleInput ? titleInput.value.trim() : '';
        
        // Só fazer auto-save se tiver título
        if (!title) return;

        const originalStatus = document.getElementById('documentStatus').textContent;
        this.updateStatus('Salvando automaticamente...');
        this.showAutoSaveStatus('Salvando...', true);

        try {
            const success = await this.saveDocument();
            if (success) {
                this.showAutoSaveStatus('Salvo automaticamente');
            }
        } catch (error) {
            console.error('Erro no auto-save:', error);
            this.updateStatus(originalStatus);
        }
    }

    // ================================
    // NAVEGAÇÃO
    // ================================

    handleBack() {
        if (this.hasUnsavedChanges) {
            const confirmed = confirm('Você tem alterações não salvas. Deseja salvar antes de sair?');
            if (confirmed) {
                this.saveAndExit();
                return;
            }
        }
        
        window.location.href = `campaign-view.html?id=${this.campaignId}`;
    }

    // ================================
    // UI UTILITIES
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

    updateStatus(message) {
        const statusEl = document.getElementById('documentStatus');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    showAutoSaveStatus(message, isLoading = false) {
        const statusEl = document.getElementById('autoSaveStatus');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.classList.add('show');
            
            if (isLoading) {
                statusEl.classList.add('auto-saving');
            } else {
                statusEl.classList.remove('auto-saving');
            }

            // Esconder após 3 segundos se não estiver carregando
            if (!isLoading) {
                setTimeout(() => {
                    statusEl.classList.remove('show');
                }, 3000);
            }
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${this.getNotificationIcon(type)}"></i>
            <span>${this.escapeHtml(message)}</span>
        `;
        
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

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    getNotificationColor(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        return colors[type] || colors.info;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new TextEditor();
});
