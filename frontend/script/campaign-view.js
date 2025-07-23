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

        // Modal de personagens
        const closeCharactersModal = document.getElementById('closeCharactersModal');
        if (closeCharactersModal) {
            closeCharactersModal.addEventListener('click', () => this.closeCharactersModal());
        }

        // Fechar modal clicando fora
        const charactersModal = document.getElementById('charactersModal');
        if (charactersModal) {
            charactersModal.addEventListener('click', (e) => {
                if (e.target === charactersModal) {
                    this.closeCharactersModal();
                }
            });
        }

        // Modal de documentos
        const closeDocumentsModal = document.getElementById('closeDocumentsModal');
        if (closeDocumentsModal) {
            closeDocumentsModal.addEventListener('click', () => this.closeDocumentsModal());
        }

        // Fechar modal de documentos clicando fora
        const documentsModal = document.getElementById('documentsModal');
        if (documentsModal) {
            documentsModal.addEventListener('click', (e) => {
                if (e.target === documentsModal) {
                    this.closeDocumentsModal();
                }
            });
        }

        // Botão criar documento
        const createDocumentBtn = document.getElementById('createDocumentBtn');
        if (createDocumentBtn) {
            createDocumentBtn.addEventListener('click', () => {
                this.openDocumentEditor(); // Ir direto para o editor sem modal
            });
        }

        // Modal de criar documento
        const closeCreateDocument = document.getElementById('closeCreateDocument');
        const cancelCreateDocument = document.getElementById('cancelCreateDocument');
        const createDocumentBackdrop = document.getElementById('createDocumentBackdrop');
        const createDocumentForm = document.getElementById('createDocumentForm');

        if (closeCreateDocument) {
            closeCreateDocument.addEventListener('click', () => this.hideCreateDocumentModal());
        }

        if (cancelCreateDocument) {
            cancelCreateDocument.addEventListener('click', () => this.hideCreateDocumentModal());
        }

        if (createDocumentBackdrop) {
            createDocumentBackdrop.addEventListener('click', () => this.hideCreateDocumentModal());
        }

        if (createDocumentForm) {
            createDocumentForm.addEventListener('submit', (e) => this.handleCreateDocument(e));
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

    async openCharactersManager() {
        this.showCharactersModal();
        await this.loadCampaignCharacters();
    }

    async openTextEditor() {
        this.showDocumentsModal();
        await this.loadCampaignDocuments();
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
    // MODAL DE PERSONAGENS
    // ================================

    showCharactersModal() {
        const modal = document.getElementById('charactersModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    closeCharactersModal() {
        const modal = document.getElementById('charactersModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    async loadCampaignCharacters() {
        if (!this.campaignId) return;

        const loadingEl = document.getElementById('charactersLoading');
        const noCharactersEl = document.getElementById('noCharacters');
        const gridEl = document.getElementById('charactersGrid');

        // Mostrar loading
        if (loadingEl) loadingEl.style.display = 'block';
        if (noCharactersEl) noCharactersEl.style.display = 'none';
        if (gridEl) gridEl.style.display = 'none';

        try {
            const url = `/Oblivion_RPG/backend/characters-simple.php?campaign_id=${this.campaignId}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Erro ao carregar personagens');
            }

            // Esconder loading
            if (loadingEl) loadingEl.style.display = 'none';

            if (!data.characters || data.characters.length === 0) {
                // Mostrar estado vazio
                if (noCharactersEl) noCharactersEl.style.display = 'block';
            } else {
                // Mostrar personagens
                this.renderCharacters(data.characters);
                if (gridEl) gridEl.style.display = 'grid';
            }

        } catch (error) {
            console.error('Erro ao carregar personagens:', error);
            if (loadingEl) loadingEl.style.display = 'none';
            if (noCharactersEl) {
                noCharactersEl.style.display = 'block';
                const noCharactersTitle = noCharactersEl.querySelector('h3');
                const noCharactersText = noCharactersEl.querySelector('p');
                if (noCharactersTitle) noCharactersTitle.textContent = 'Erro ao carregar personagens';
                if (noCharactersText) noCharactersText.textContent = error.message;
            }
        }
    }

    renderCharacters(characters) {
        const gridEl = document.getElementById('charactersGrid');
        if (!gridEl) return;

        gridEl.innerHTML = '';

        characters.forEach(character => {
            const characterCard = this.createCharacterCard(character);
            gridEl.appendChild(characterCard);
        });
    }

    createCharacterCard(character) {
        const card = document.createElement('div');
        card.className = 'character-card';
        
        // Avatar do personagem
        const avatar = document.createElement('div');
        avatar.className = 'character-avatar';
        
        if (character.foto_url && character.foto_url.trim()) {
            const img = document.createElement('img');
            img.src = character.foto_url;
            img.alt = character.nome;
            img.onerror = () => {
                // Se a imagem falhar, mostrar placeholder
                avatar.innerHTML = `<div class="character-avatar-placeholder">${character.nome.charAt(0).toUpperCase()}</div>`;
            };
            avatar.appendChild(img);
        } else {
            // Placeholder com primeira letra do nome
            avatar.innerHTML = `<div class="character-avatar-placeholder">${character.nome.charAt(0).toUpperCase()}</div>`;
        }
        
        // Nome do personagem
        const name = document.createElement('h3');
        name.className = 'character-name';
        name.textContent = character.nome;
        
        // Nome do usuário
        const user = document.createElement('p');
        user.className = 'character-user';
        user.textContent = `Jogado por: ${character.usuario.nome}`;
        
        card.appendChild(avatar);
        card.appendChild(name);
        card.appendChild(user);
        
        return card;
    }

    // ================================
    // MODAL DE DOCUMENTOS
    // ================================

    showDocumentsModal() {
        const modal = document.getElementById('documentsModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    closeDocumentsModal() {
        const modal = document.getElementById('documentsModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    async loadCampaignDocuments() {
        if (!this.campaignId) return;

        const loadingEl = document.getElementById('documentsLoading');
        const noDocumentsEl = document.getElementById('noDocuments');
        const gridEl = document.getElementById('documentsGrid');

        // Mostrar loading
        if (loadingEl) loadingEl.style.display = 'block';
        if (noDocumentsEl) noDocumentsEl.style.display = 'none';
        if (gridEl) gridEl.style.display = 'none';

        try {
            const authToken = this.getAuthToken();
            
            const url = `/Oblivion_RPG/backend/editor-documents.php?campaign_id=${this.campaignId}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Erro ao carregar documentos');
            }

            // Esconder loading
            if (loadingEl) loadingEl.style.display = 'none';

            if (!data.documents || data.documents.length === 0) {
                // Mostrar estado vazio
                if (noDocumentsEl) noDocumentsEl.style.display = 'block';
            } else {
                // Mostrar documentos
                this.renderDocuments(data.documents);
                if (gridEl) gridEl.style.display = 'grid';
                
                // Atualizar contador de documentos
                this.updateDocumentCount(data.documents.length);
            }

        } catch (error) {
            console.error('Erro ao carregar documentos:', error);
            
            // Esconder loading
            if (loadingEl) loadingEl.style.display = 'none';
            
            this.showError(`Erro ao carregar documentos: ${error.message}`);
        }
    }

    renderDocuments(documents) {
        const gridEl = document.getElementById('documentsGrid');
        if (!gridEl) return;

        gridEl.innerHTML = '';

        documents.forEach(doc => {
            const card = this.createDocumentCard(doc);
            gridEl.appendChild(card);
        });
    }

    createDocumentCard(doc) {
        const card = document.createElement('div');
        card.className = 'character-card document-card';
        card.style.cursor = 'pointer';
        
        // Ícone do documento
        const icon = document.createElement('div');
        icon.className = 'character-avatar document-icon';
        icon.innerHTML = '<i class="fas fa-file-alt"></i>';
        
        // Título do documento
        const title = document.createElement('h3');
        title.className = 'character-name';
        title.textContent = doc.titulo;
        
        // Informações do documento
        const info = document.createElement('p');
        info.className = 'character-user document-info';
        info.innerHTML = `
            <span><i class="fas fa-clock"></i> ${doc.ultima_edicao_formatada}</span>
            <span><i class="fas fa-font"></i> ${this.formatFileSize(doc.tamanho_conteudo)}</span>
        `;
        
        // Botões de ação
        const actions = document.createElement('div');
        actions.className = 'document-actions';
        actions.innerHTML = `
            <button class="btn-edit" title="Editar">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-delete" title="Excluir">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        // Event listeners
        const editBtn = actions.querySelector('.btn-edit');
        const deleteBtn = actions.querySelector('.btn-delete');
        
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openDocumentEditor(doc.id);
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteDocument(doc.id, doc.titulo);
        });
        
        // Abrir documento ao clicar no card
        card.addEventListener('click', () => {
            this.openDocumentEditor(doc.id);
        });
        
        card.appendChild(icon);
        card.appendChild(title);
        card.appendChild(info);
        card.appendChild(actions);
        
        return card;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return 'Vazio';
        if (bytes < 1000) return `${bytes} chars`;
        if (bytes < 1000000) return `${(bytes / 1000).toFixed(1)}K chars`;
        return `${(bytes / 1000000).toFixed(1)}M chars`;
    }

    updateDocumentCount(count) {
        const countEl = document.getElementById('documentCount');
        if (countEl) {
            countEl.textContent = count;
        }
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

    async openDocumentEditor(documentId = null) {
        this.closeDocumentsModal();
        
        if (documentId) {
            // Editar documento existente
            window.location.href = `text-editor.html?campaign=${this.campaignId}&document=${documentId}`;
        } else {
            // Criar novo documento
            window.location.href = `text-editor.html?campaign=${this.campaignId}`;
        }
    }

    async deleteDocument(documentId, title) {
        const confirmed = confirm(`Tem certeza que deseja excluir o documento "${title}"?`);
        if (!confirmed) return;

        try {
            const authToken = this.getAuthToken();
            const response = await fetch(`/Oblivion_RPG/backend/editor-documents.php?id=${documentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Erro ao excluir documento');
            }

            this.showNotification('Documento excluído com sucesso', 'success');
            await this.loadCampaignDocuments(); // Recarregar lista

        } catch (error) {
            console.error('Erro ao excluir documento:', error);
            this.showError(`Erro ao excluir documento: ${error.message}`);
        }
    }

    // ================================
    // MODAL DE CRIAR DOCUMENTO
    // ================================

    showCreateDocumentModal() {
        const modal = document.getElementById('createDocumentModal');
        const titleInput = document.getElementById('newDocumentTitle');
        
        if (modal) {
            modal.style.display = 'flex';
            // Forçar reflow antes de adicionar a classe
            modal.offsetHeight;
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
        
        if (titleInput) {
            titleInput.value = '';
            setTimeout(() => titleInput.focus(), 100);
        }
    }

    hideCreateDocumentModal() {
        const modal = document.getElementById('createDocumentModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
            // Aguardar a transição antes de esconder
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }

    async handleCreateDocument(e) {
        e.preventDefault();
        
        const titleInput = document.getElementById('newDocumentTitle');
        const title = titleInput ? titleInput.value.trim() : '';
        
        if (!title) {
            this.showError('Por favor, digite um título para o documento');
            titleInput?.focus();
            return;
        }

        try {
            const authToken = this.getAuthToken();
            const response = await fetch('/Oblivion_RPG/backend/editor-documents.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    campaign_id: this.campaignId,
                    titulo: title,
                    conteudo: ''
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Erro ao criar documento');
            }

            // Fechar modal e abrir editor
            this.hideCreateDocumentModal();
            this.showNotification('Documento criado com sucesso', 'success');
            
            // Ir para o editor com o novo documento
            setTimeout(() => {
                window.location.href = `text-editor.html?campaign=${this.campaignId}&document=${data.document_id}`;
            }, 500);

        } catch (error) {
            console.error('Erro ao criar documento:', error);
            this.showError(`Erro ao criar documento: ${error.message}`);
        }
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
