/**
 * JavaScript para ficha de NPC - Oblivion RPG
 */

class NpcSheet {
    constructor() {
        this.campaignId = null;
        this.npcId = null;
        this.userSession = null;
        this.isEditing = false;
        this.hasChanges = false;
        this.npcData = null;
        this.init();
    }

    init() {
        this.loadUserSession();
        this.getUrlParams();
        this.bindEvents();
        
        if (this.npcId) {
            this.loadNpcData();
        } else {
            this.initNewNpc();
        }
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
    // OBTER PARÂMETROS DA URL
    // ================================

    getUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        this.campaignId = urlParams.get('campaign');
        this.npcId = urlParams.get('npc');
        
        if (!this.campaignId) {
            this.showError('ID da campanha não fornecido na URL');
            setTimeout(() => {
                window.location.href = 'campaigns.html';
            }, 2000);
            return;
        }
        
        this.isEditing = !!this.npcId;
        this.updateNavigationLinks();
        this.updatePageTitle();
    }

    updateNavigationLinks() {
        const campaignLink = document.getElementById('campaignLink');
        const npcsLink = document.getElementById('npcsLink');
        
        if (campaignLink) {
            campaignLink.href = `campaign-view.html?id=${this.campaignId}`;
        }
        
        if (npcsLink) {
            npcsLink.href = `npcs-manager.html?campaign=${this.campaignId}`;
        }
    }

    updatePageTitle() {
        const title = this.isEditing ? 'Editar NPC' : 'Criar Novo NPC';
        document.title = `${title} - Oblivion RPG`;
        
        const navNpcName = document.getElementById('navNpcName');
        if (navNpcName) {
            navNpcName.textContent = title;
        }
    }

    // ================================
    // EVENT LISTENERS
    // ================================

    bindEvents() {
        // Botão salvar no header
        const saveNpcBtn = document.getElementById('saveNpcBtn');
        if (saveNpcBtn) {
            saveNpcBtn.addEventListener('click', () => this.saveNpc());
        }

        // Botão salvar na ficha
        const saveSheetBtn = document.getElementById('saveSheetBtn');
        if (saveSheetBtn) {
            saveSheetBtn.addEventListener('click', () => this.saveNpc());
        }

        // Botão voltar
        const backToNpcsBtn = document.getElementById('backToNpcsBtn');
        if (backToNpcsBtn) {
            backToNpcsBtn.addEventListener('click', () => this.goBackToNpcs());
        }

        // Alterar avatar - clique na imagem
        const npcAvatar = document.getElementById('npcAvatar');
        const avatarInput = document.getElementById('avatarInput');
        
        if (npcAvatar) {
            npcAvatar.addEventListener('click', () => this.showImageChoiceModal());
        }

        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        // Modal de escolha de imagem
        const closeImageChoice = document.getElementById('closeImageChoice');
        const imageChoiceBackdrop = document.getElementById('imageChoiceBackdrop');
        const chooseUpload = document.getElementById('chooseUpload');
        const chooseUrl = document.getElementById('chooseUrl');

        if (closeImageChoice) {
            closeImageChoice.addEventListener('click', () => this.hideImageChoiceModal());
        }

        if (imageChoiceBackdrop) {
            imageChoiceBackdrop.addEventListener('click', () => this.hideImageChoiceModal());
        }

        if (chooseUpload) {
            chooseUpload.addEventListener('click', () => this.chooseFileUpload());
        }

        if (chooseUrl) {
            chooseUrl.addEventListener('click', () => this.chooseUrlInput());
        }

        // Input de URL da imagem
        const confirmImageUrl = document.getElementById('confirmImageUrl');
        const cancelImageUrl = document.getElementById('cancelImageUrl');
        
        if (confirmImageUrl) {
            confirmImageUrl.addEventListener('click', () => this.confirmImageUrl());
        }
        
        if (cancelImageUrl) {
            cancelImageUrl.addEventListener('click', () => this.cancelImageUrl());
        }

        // Botões de adicionar itens
        const addActionBtn = document.getElementById('addActionBtn');
        const addReactionBtn = document.getElementById('addReactionBtn');
        const addAbilityBtn = document.getElementById('addAbilityBtn');
        const addWeaknessBtn = document.getElementById('addWeaknessBtn');
        const addSaqueBtn = document.getElementById('addSaqueBtn');
        const addAnotacaoBtn = document.getElementById('addAnotacaoBtn');

        if (addActionBtn) {
            addActionBtn.addEventListener('click', () => this.addAction());
        }
        
        if (addReactionBtn) {
            addReactionBtn.addEventListener('click', () => this.addReaction());
        }
        
        if (addAbilityBtn) {
            addAbilityBtn.addEventListener('click', () => this.addAbility());
        }
        
        if (addWeaknessBtn) {
            addWeaknessBtn.addEventListener('click', () => this.addWeakness());
        }

        if (addSaqueBtn) {
            addSaqueBtn.addEventListener('click', () => this.addSaque());
        }

        if (addAnotacaoBtn) {
            addAnotacaoBtn.addEventListener('click', () => this.addAnotacao());
        }

        // Botão de reduzir defesa
        const reduceDefenseBtn = document.getElementById('reduceDefenseBtn');
        if (reduceDefenseBtn) {
            reduceDefenseBtn.addEventListener('click', () => this.reduceDefense());
        }

        // Botão de adicionar movimento
        const addMovementBtn = document.getElementById('addMovementBtn');
        if (addMovementBtn) {
            addMovementBtn.addEventListener('click', () => this.addMovement());
        }

        // Botão de reset movimento
        const resetMovementBtn = document.getElementById('resetMovementBtn');
        if (resetMovementBtn) {
            resetMovementBtn.addEventListener('click', () => this.resetMovement());
        }

        // Event listeners para atualizar barras dinâmicas
        const pvAtualInput = document.getElementById('pvAtual');
        const pvMaxInput = document.getElementById('pvMax');
        const defesaInput = document.getElementById('defesa');
        const defesaMaxInput = document.getElementById('defesaMax');
        const movimentoInput = document.getElementById('movimento');

        if (pvAtualInput) {
            pvAtualInput.addEventListener('input', () => this.updateHealthBar());
        }
        
        if (pvMaxInput) {
            pvMaxInput.addEventListener('input', () => this.updateHealthBar());
        }
        
        if (defesaInput) {
            defesaInput.addEventListener('input', () => this.updateDefenseBar());
        }
        
        if (defesaMaxInput) {
            defesaMaxInput.addEventListener('input', () => this.updateDefenseBar());
        }
        
        if (movimentoInput) {
            movimentoInput.addEventListener('input', () => this.updateMovementDisplay());
        }

        // Detectar mudanças nos campos
        this.bindChangeDetection();

        // Logo home
        const logoHome = document.getElementById('logoHome');
        if (logoHome) {
            logoHome.addEventListener('click', () => {
                window.location.href = 'dashboard.html';
            });
        }

        // Aviso antes de sair
        window.addEventListener('beforeunload', (e) => {
            if (this.hasChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    bindChangeDetection() {
        const sheet = document.getElementById('npcSheet');
        if (!sheet) return;

        sheet.addEventListener('input', () => {
            this.hasChanges = true;
            this.showSaveButton();
        });

        sheet.addEventListener('change', () => {
            this.hasChanges = true;
            this.showSaveButton();
        });
    }

    showSaveButton() {
        const saveBtn = document.getElementById('saveNpcBtn');
        if (saveBtn) {
            saveBtn.style.display = 'flex';
        }
    }

    hideSaveButton() {
        const saveBtn = document.getElementById('saveNpcBtn');
        if (saveBtn) {
            saveBtn.style.display = 'none';
        }
    }

    // ================================
    // CARREGAR DADOS DO NPC
    // ================================

    async loadNpcData() {
        if (!this.npcId) return;

        this.showLoading(true);

        try {
            const url = `/Oblivion_RPG/backend/npcs.php?npc_id=${this.npcId}&user_id=${this.userSession.user_id}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            let data;
            try {
                const responseText = await response.text();
                data = JSON.parse(responseText);
            } catch (parseError) {
                throw new Error('Resposta inválida do servidor. Verifique os logs do PHP.');
            }

            if (data.error) {
                throw new Error(data.error);
            }

            this.npcData = data.npc;
            this.populateForm();
            this.showSheet();

        } catch (error) {
            console.error('Erro ao carregar NPC:', error);
            this.showError('Erro ao carregar NPC: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    initNewNpc() {
        // Inicializar nova ficha em branco
        this.npcData = {
            nome_npc: '',
            imagem_url: null,
            pv_atual: 0,
            pv_max: 0,
            movimento: '',
            movimento_percorrido: 0,
            defesa: 0,
            defesa_max: 0,
            classe_conjuracao: 0,
            classe_manobra: 0,
            atributo_corpo: 0,
            atributo_mente: 0,
            atributo_alma: 0,
            acoes: [],
            reacoes: [],
            habilidades: [],
            pontos_fracos: []
        };
        
        this.populateForm();
        this.showSheet();
    }

    populateForm() {
        if (!this.npcData) return;

        // Dados básicos
        this.setFieldValue('npcName', this.npcData.nome_npc);
        this.setFieldValue('pvAtual', this.npcData.pv_atual);
        this.setFieldValue('pvMax', this.npcData.pv_max);
        this.setFieldValue('defesa', this.npcData.defesa);
        this.setFieldValue('defesaMax', this.npcData.defesa_max || this.npcData.defesa);
        this.setFieldValue('movimento', this.npcData.movimento);

        // Atributos
        this.setFieldValue('atributoCorpo', this.npcData.atributo_corpo);
        this.setFieldValue('atributoMente', this.npcData.atributo_mente);
        this.setFieldValue('atributoAlma', this.npcData.atributo_alma);
        this.setFieldValue('classeConjuracao', this.npcData.classe_conjuracao);
        this.setFieldValue('classeManobra', this.npcData.classe_manobra);

        // Imagem
        this.updateAvatar(this.npcData.imagem_url);

        // Atualizar displays dinâmicos
        this.updateHealthBar();
        this.updateDefenseBar();
        this.updateMovementDisplay();
        this.updateMovementProgress();

        // Listas
        this.populateActions(this.npcData.acoes || []);
        this.populateReactions(this.npcData.reacoes || []);
        this.populateAbilities(this.npcData.habilidades || []);
        this.populateWeaknesses(this.npcData.pontos_fracos || []);
        this.populateSaque(this.npcData.saque || []);
        this.populateAnotacoes(this.npcData.anotacoes || []);

        // Atualizar título da página
        if (this.npcData.nome_npc) {
            const navNpcName = document.getElementById('navNpcName');
            if (navNpcName) {
                navNpcName.textContent = this.npcData.nome_npc;
            }
        }
    }

    setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value || '';
        }
    }

    updateAvatar(imageUrl) {
        const img = document.getElementById('npcImage');
        const placeholder = document.getElementById('avatarPlaceholder');
        const avatar = document.getElementById('npcAvatar');
        
        if (imageUrl && imageUrl.trim()) {
            if (img && placeholder && avatar) {
                img.src = imageUrl;
                img.style.display = 'block';
                placeholder.style.display = 'none';
                avatar.title = 'Clique para alterar a imagem';
                avatar.classList.add('has-image');
                
                img.onerror = () => {
                    img.style.display = 'none';
                    placeholder.style.display = 'flex';
                    avatar.title = 'Clique para adicionar uma imagem';
                    avatar.classList.remove('has-image');
                };
            }
        } else {
            if (img && placeholder && avatar) {
                img.style.display = 'none';
                placeholder.style.display = 'flex';
                avatar.title = 'Clique para adicionar uma imagem';
                avatar.classList.remove('has-image');
            }
        }
    }

    // ================================
    // GERENCIAR IMAGEM
    // ================================

    showImageChoiceModal() {
        const modal = document.getElementById('imageChoiceModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    hideImageChoiceModal() {
        const modal = document.getElementById('imageChoiceModal');
        const uploadProgress = document.getElementById('uploadProgress');
        if (modal) {
            modal.style.display = 'none';
        }
        if (uploadProgress) {
            uploadProgress.style.display = 'none';
        }
    }

    chooseFileUpload() {
        const avatarInput = document.getElementById('avatarInput');
        if (avatarInput) {
            avatarInput.click();
        }
        this.hideImageChoiceModal();
    }

    chooseUrlInput() {
        this.hideImageChoiceModal();
        this.showImageUrlInput();
    }

    showImageUrlInput() {
        const urlInput = document.getElementById('imageUrlInput');
        if (urlInput) {
            urlInput.style.display = 'flex';
            const field = document.getElementById('imageUrlField');
            if (field) {
                field.focus();
            }
        }
    }

    confirmImageUrl() {
        const field = document.getElementById('imageUrlField');
        const urlInput = document.getElementById('imageUrlInput');
        
        if (field && urlInput) {
            const url = field.value.trim();
            if (url) {
                this.updateAvatar(url);
                this.hasChanges = true;
                this.showSaveButton();
            }
            
            field.value = '';
            urlInput.style.display = 'none';
        }
    }

    cancelImageUrl() {
        const field = document.getElementById('imageUrlField');
        const urlInput = document.getElementById('imageUrlInput');
        
        if (field && urlInput) {
            field.value = '';
            urlInput.style.display = 'none';
        }
    }

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validar arquivo
        if (!file.type.startsWith('image/')) {
            this.showError('Por favor, selecione um arquivo de imagem válido');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB
            this.showError('A imagem deve ter menos de 10MB');
            return;
        }

        // Mostrar modal com progresso
        this.showImageChoiceModal();
        const uploadProgress = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const uploadDetails = document.getElementById('uploadDetails');
        
        if (uploadProgress) {
            uploadProgress.style.display = 'block';
        }

        try {
            const formData = new FormData();
            formData.append('image', file);

            // Simular progresso inicial
            if (progressFill) {
                progressFill.style.width = '30%';
            }

            const response = await fetch('/Oblivion_RPG/backend/upload-image-db.php', {
                method: 'POST',
                body: formData
            });

            // Atualizar progresso
            if (progressFill) {
                progressFill.style.width = '70%';
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            let data;
            try {
                const responseText = await response.text();
                data = JSON.parse(responseText);
            } catch (parseError) {
                throw new Error('Resposta inválida do servidor de upload. Verifique os logs do PHP.');
            }

            if (data.error) {
                throw new Error(data.error);
            }

            // Finalizar progresso
            if (progressFill) {
                progressFill.style.width = '100%';
            }

            // Mostrar detalhes do upload
            if (uploadDetails && data.compression) {
                uploadDetails.innerHTML = `
                    <div>Tamanho original: ${this.formatFileSize(data.originalSize)}</div>
                    <div>Tamanho final: ${this.formatFileSize(data.finalSize)}</div>
                    <div>Compressão: ${data.compression}</div>
                    <div>Dimensões: ${data.dimensions.final.width}x${data.dimensions.final.height}px</div>
                `;
            }

            // Atualizar avatar
            this.updateAvatar(data.dataUri);
            this.hasChanges = true;
            this.showSaveButton();
            
            setTimeout(() => {
                this.hideImageChoiceModal();
                this.showNotification('Imagem carregada e comprimida com sucesso', 'success');
            }, 1500);

        } catch (error) {
            console.error('Erro ao fazer upload da imagem:', error);
            this.hideImageChoiceModal();
            this.showError('Erro ao fazer upload da imagem: ' + error.message);
        }

        // Limpar input
        event.target.value = '';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ================================
    // GERENCIAR LISTAS
    // ================================

    populateActions(actions) {
        const container = document.getElementById('actionsList');
        if (!container) return;

        container.innerHTML = '';
        actions.forEach(action => {
            const item = this.createActionItem(action);
            container.appendChild(item);
        });
    }

    populateReactions(reactions) {
        const container = document.getElementById('reactionsList');
        if (!container) return;

        container.innerHTML = '';
        reactions.forEach(reaction => {
            const item = this.createReactionItem(reaction);
            container.appendChild(item);
        });
    }

    populateAbilities(abilities) {
        const container = document.getElementById('abilitiesList');
        if (!container) return;

        container.innerHTML = '';
        abilities.forEach(ability => {
            const item = this.createAbilityItem(ability);
            container.appendChild(item);
        });
    }

    populateWeaknesses(weaknesses) {
        const container = document.getElementById('weaknessesList');
        if (!container) return;

        container.innerHTML = '';
        weaknesses.forEach(weakness => {
            const item = this.createWeaknessItem(weakness);
            container.appendChild(item);
        });
    }

    populateSaque(saque) {
        const container = document.getElementById('saqueList');
        if (!container) return;

        container.innerHTML = '';
        saque.forEach(item => {
            const saqueItem = this.createSaqueItem(item);
            container.appendChild(saqueItem);
        });
    }

    populateAnotacoes(anotacoes) {
        const container = document.getElementById('anotacoesList');
        if (!container) return;

        container.innerHTML = '';
        anotacoes.forEach(anotacao => {
            const anotacaoItem = this.createAnotacaoItem(anotacao);
            container.appendChild(anotacaoItem);
        });
    }

    addAction() {
        console.log('=== ADICIONANDO AÇÃO ===');
        const container = document.getElementById('actionsList');
        console.log('Container encontrado:', !!container);
        
        if (container) {
            const item = this.createActionItem();
            console.log('Item criado:', item);
            container.appendChild(item);
            console.log('Item adicionado ao container');
            
            // Verificar se o item foi realmente adicionado
            const itemsAfterAdd = container.querySelectorAll('.action-item');
            console.log('Itens .action-item no container após adicionar:', itemsAfterAdd.length);
            
            this.hasChanges = true;
            this.showSaveButton();
        } else {
            console.error('Container actionsList não encontrado!');
        }
    }

    addReaction() {
        const container = document.getElementById('reactionsList');
        if (container) {
            const item = this.createReactionItem();
            container.appendChild(item);
            this.hasChanges = true;
            this.showSaveButton();
        }
    }

    addAbility() {
        const container = document.getElementById('abilitiesList');
        if (container) {
            const item = this.createAbilityItem();
            container.appendChild(item);
            this.hasChanges = true;
            this.showSaveButton();
        }
    }

    addWeakness() {
        const container = document.getElementById('weaknessesList');
        if (container) {
            const item = this.createWeaknessItem();
            container.appendChild(item);
            this.hasChanges = true;
            this.showSaveButton();
        }
    }

    addSaque() {
        const container = document.getElementById('saqueList');
        if (container) {
            const item = this.createSaqueItem();
            container.appendChild(item);
            this.hasChanges = true;
            this.showSaveButton();
        }
    }

    addAnotacao() {
        const container = document.getElementById('anotacoesList');
        if (container) {
            const item = this.createAnotacaoItem();
            container.appendChild(item);
            this.hasChanges = true;
            this.showSaveButton();
        }
    }

    createActionItem(data = {}) {
        const template = document.getElementById('actionTemplate');
        const item = template.content.cloneNode(true);
        
        console.log('=== CRIANDO ACTION ITEM ===');
        console.log('Template encontrado:', !!template);
        console.log('Item clonado:', item);
        console.log('Classes do primeiro elemento:', item.firstElementChild?.className);
        
        const nameInput = item.querySelector('.item-name');
        const quantityInput = item.querySelector('.action-quantity');
        const effectInput = item.querySelector('.item-effect');
        const extraInput = item.querySelector('.item-extra');
        const removeBtn = item.querySelector('.btn-remove');

        console.log('Elementos encontrados no template:', {
            nameInput: !!nameInput,
            quantityInput: !!quantityInput,
            effectInput: !!effectInput,
            extraInput: !!extraInput,
            removeBtn: !!removeBtn
        });

        if (nameInput) nameInput.value = data.nome || '';
        if (quantityInput) quantityInput.value = data.quantidade_acoes || 1;
        if (effectInput) effectInput.value = data.efeito || '';
        if (extraInput) extraInput.value = data.extra || '';

        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.target.closest('.action-item').remove();
                this.hasChanges = true;
                this.showSaveButton();
            });
        }

        console.log('=== ACTION ITEM CRIADO ===');
        return item;
    }

    createReactionItem(data = {}) {
        const template = document.getElementById('reactionTemplate');
        const item = template.content.cloneNode(true);
        
        const nameInput = item.querySelector('.item-name');
        const quantityInput = item.querySelector('.reaction-quantity');
        const effectInput = item.querySelector('.item-effect');
        const extraInput = item.querySelector('.item-extra');
        const removeBtn = item.querySelector('.btn-remove');

        if (nameInput) nameInput.value = data.nome || '';
        if (quantityInput) quantityInput.value = data.quantidade_reacoes || 1;
        if (effectInput) effectInput.value = data.efeito || '';
        if (extraInput) extraInput.value = data.extra || '';

        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.target.closest('.reaction-item').remove();
                this.hasChanges = true;
                this.showSaveButton();
            });
        }

        return item;
    }

    createAbilityItem(data = {}) {
        const template = document.getElementById('abilityTemplate');
        const item = template.content.cloneNode(true);
        
        const nameInput = item.querySelector('.item-name');
        const effectInput = item.querySelector('.item-effect');
        const removeBtn = item.querySelector('.btn-remove');

        if (nameInput) nameInput.value = data.nome || '';
        if (effectInput) effectInput.value = data.efeito || '';

        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.target.closest('.ability-item').remove();
                this.hasChanges = true;
                this.showSaveButton();
            });
        }

        return item;
    }

    createWeaknessItem(data = {}) {
        const template = document.getElementById('weaknessTemplate');
        const item = template.content.cloneNode(true);
        
        const nameInput = item.querySelector('.item-name');
        const effectInput = item.querySelector('.item-effect');
        const removeBtn = item.querySelector('.btn-remove');

        if (nameInput) nameInput.value = data.nome || '';
        if (effectInput) effectInput.value = data.efeito || '';

        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.target.closest('.weakness-item').remove();
                this.hasChanges = true;
                this.showSaveButton();
            });
        }

        return item;
    }

    createSaqueItem(data = {}) {
        const template = document.getElementById('saqueTemplate');
        const item = template.content.cloneNode(true);
        
        const nameInput = item.querySelector('.item-name');
        const pesoInput = item.querySelector('.item-peso');
        const custoInput = item.querySelector('.item-custo');
        const descricaoInput = item.querySelector('.item-descricao');
        const removeBtn = item.querySelector('.btn-remove');

        if (nameInput) nameInput.value = data.nome_item || '';
        if (pesoInput) pesoInput.value = data.peso || '';
        if (custoInput) custoInput.value = data.custo || '';
        if (descricaoInput) descricaoInput.value = data.descricao || '';

        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.target.closest('.saque-item').remove();
                this.hasChanges = true;
                this.showSaveButton();
            });
        }

        return item;
    }

    createAnotacaoItem(data = {}) {
        const template = document.getElementById('anotacaoTemplate');
        const item = template.content.cloneNode(true);
        
        const textoInput = item.querySelector('.item-texto');
        const removeBtn = item.querySelector('.btn-remove');

        if (textoInput) textoInput.value = data.anotacoes || '';

        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.target.closest('.anotacao-item').remove();
                this.hasChanges = true;
                this.showSaveButton();
            });
        }

        return item;
    }

    // ================================
    // SALVAR NPC
    // ================================

    async saveNpc() {
        try {
            const npcData = this.collectFormData();
            
            // Debug temporário
            console.log('Dados coletados:', npcData);
            
            // Validação básica
            if (!npcData.nome_npc.trim()) {
                this.showError('Nome do NPC é obrigatório');
                return;
            }

            this.showLoadingOverlay(true);

            const method = this.isEditing ? 'PUT' : 'POST';
            const endpoint = '/Oblivion_RPG/backend/npcs.php';
            
            if (this.isEditing) {
                npcData.npc_id = this.npcId;
            } else {
                npcData.campanha_id = this.campaignId;
            }
            
            npcData.user_id = this.userSession.user_id;

            // Debug temporário
            console.log('Dados finais a serem enviados:', npcData);
            console.log('Método:', method);
            console.log('Endpoint:', endpoint);

            const response = await fetch(endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(npcData)
            });

            if (!response.ok) {
                // Tentar parsear o JSON para obter a mensagem de erro específica
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorText = await response.text();
                    if (errorText.trim().startsWith('{')) {
                        const errorData = JSON.parse(errorText);
                        errorMessage = errorData.error || errorMessage;
                    }
                } catch (parseError) {
                    // Usar erro genérico se não conseguir parsear
                }
                throw new Error(errorMessage);
            }

            let data;
            try {
                const responseText = await response.text();
                data = JSON.parse(responseText);
            } catch (parseError) {
                throw new Error('Resposta inválida do servidor. Verifique os logs do PHP.');
            }

            if (data.error) {
                throw new Error(data.error);
            }

            this.hasChanges = false;
            this.hideSaveButton();
            
            const message = this.isEditing ? 'NPC atualizado com sucesso' : 'NPC criado com sucesso';
            this.showNotification(message, 'success');

            // Se criando novo NPC, redirecionar para edição
            if (!this.isEditing && data.npc_id) {
                setTimeout(() => {
                    window.location.href = `npc-sheet.html?campaign=${this.campaignId}&npc=${data.npc_id}`;
                }, 1500);
            }

        } catch (error) {
            console.error('Erro ao salvar NPC:', error);
            this.showError('Erro ao salvar NPC: ' + error.message);
        } finally {
            this.showLoadingOverlay(false);
        }
    }

    collectFormData() {
        // Obter imagem atual (pode ser URL ou data URI)
        const img = document.getElementById('npcImage');
        const imageUrl = img && img.style.display !== 'none' ? img.src : null;

        const data = {
            nome_npc: this.getFieldValue('npcName'),
            imagem_url: imageUrl, // Pode ser URL ou data URI
            pv_atual: parseInt(this.getFieldValue('pvAtual')) || 0,
            pv_max: parseInt(this.getFieldValue('pvMax')) || 0,
            movimento: this.getFieldValue('movimento'),
            movimento_percorrido: this.npcData?.movimento_percorrido || 0,
            defesa: parseInt(this.getFieldValue('defesa')) || 0,
            defesa_max: parseInt(this.getFieldValue('defesaMax')) || parseInt(this.getFieldValue('defesa')) || 0,
            classe_conjuracao: parseInt(this.getFieldValue('classeConjuracao')) || 0,
            classe_manobra: parseInt(this.getFieldValue('classeManobra')) || 0,
            atributo_corpo: parseInt(this.getFieldValue('atributoCorpo')) || 0,
            atributo_mente: parseInt(this.getFieldValue('atributoMente')) || 0,
            atributo_alma: parseInt(this.getFieldValue('atributoAlma')) || 0,
            acoes: this.collectActions(),
            reacoes: this.collectReactions(),
            habilidades: this.collectAbilities(),
            pontos_fracos: this.collectWeaknesses(),
            saque: this.collectSaque(),
            anotacoes: this.collectAnotacoes()
        };

        // Log para debug
        console.log('Dados coletados para envio:', data);

        return data;
    }

    getFieldValue(fieldId) {
        const field = document.getElementById(fieldId);
        return field ? field.value.trim() : '';
    }

    collectActions() {
        const items = document.querySelectorAll('.action-item');
        const actions = [];

        console.log('=== COLETANDO AÇÕES ===');
        console.log('Itens .action-item encontrados:', items.length);
        
        if (items.length === 0) {
            console.log('Nenhum item de ação encontrado no DOM');
            console.log('Verificando se existem elementos na página:');
            const allActionElements = document.querySelectorAll('[class*="action"]');
            console.log('Elementos com "action" na classe:', allActionElements.length);
            allActionElements.forEach((el, i) => {
                console.log(`  ${i}: ${el.className}`);
            });
        }
        
        items.forEach((item, index) => {
            console.log(`=== Processando ação ${index} ===`);
            console.log('Item DOM:', item);
            
            const nomeElement = item.querySelector('.item-name');
            const quantidadeElement = item.querySelector('.action-quantity');
            const efeitoElement = item.querySelector('.item-effect');
            const extraElement = item.querySelector('.item-extra');
            
            console.log('Elementos encontrados:', {
                nomeElement: !!nomeElement,
                quantidadeElement: !!quantidadeElement,
                efeitoElement: !!efeitoElement,
                extraElement: !!extraElement
            });
            
            const nome = nomeElement?.value.trim();
            const quantidade = quantidadeElement?.value;
            const efeito = efeitoElement?.value;
            const extra = extraElement?.value;
            
            console.log(`Valores da ação ${index}:`, {
                nome,
                quantidade,
                efeito,
                extra
            });
            
            if (nome) {
                const actionData = {
                    nome: nome,
                    quantidade_acoes: parseInt(quantidade) || 1,
                    efeito: efeito?.trim() || null,
                    extra: extra?.trim() || null
                };
                actions.push(actionData);
                console.log(`Ação ${index} adicionada:`, actionData);
            } else {
                console.log(`Ação ${index} ignorada (nome vazio)`);
            }
        });

        console.log('=== RESULTADO FINAL ===');
        console.log('Total de ações coletadas:', actions.length);
        console.log('Ações:', actions);
        return actions;
    }

    collectReactions() {
        const items = document.querySelectorAll('.reaction-item');
        const reactions = [];

        items.forEach(item => {
            const nome = item.querySelector('.item-name')?.value.trim();
            if (nome) {
                reactions.push({
                    nome: nome,
                    quantidade_reacoes: parseInt(item.querySelector('.reaction-quantity')?.value) || 1,
                    efeito: item.querySelector('.item-effect')?.value.trim() || null,
                    extra: item.querySelector('.item-extra')?.value.trim() || null
                });
            }
        });

        return reactions;
    }

    collectAbilities() {
        const items = document.querySelectorAll('.ability-item');
        const abilities = [];

        items.forEach(item => {
            const nome = item.querySelector('.item-name')?.value.trim();
            if (nome) {
                abilities.push({
                    nome: nome,
                    efeito: item.querySelector('.item-effect')?.value.trim() || null
                });
            }
        });

        return abilities;
    }

    collectWeaknesses() {
        const items = document.querySelectorAll('.weakness-item');
        const weaknesses = [];

        items.forEach(item => {
            const nome = item.querySelector('.item-name')?.value.trim();
            if (nome) {
                weaknesses.push({
                    nome: nome,
                    efeito: item.querySelector('.item-effect')?.value.trim() || null
                });
            }
        });

        return weaknesses;
    }

    collectSaque() {
        const items = document.querySelectorAll('.saque-item');
        const saque = [];

        items.forEach(item => {
            const nome_item = item.querySelector('.item-name')?.value.trim();
            if (nome_item) {
                saque.push({
                    nome_item: nome_item,
                    peso: parseFloat(item.querySelector('.item-peso')?.value) || 0,
                    custo: parseFloat(item.querySelector('.item-custo')?.value) || 0,
                    descricao: item.querySelector('.item-descricao')?.value.trim() || null
                });
            }
        });

        return saque;
    }

    collectAnotacoes() {
        const items = document.querySelectorAll('.anotacao-item');
        const anotacoes = [];

        items.forEach(item => {
            const texto = item.querySelector('.item-texto')?.value.trim();
            if (texto) {
                anotacoes.push({
                    anotacoes: texto
                });
            }
        });

        return anotacoes;
    }

    // ================================
    // NAVEGAÇÃO
    // ================================

    goBackToNpcs() {
        if (this.hasChanges) {
            if (confirm('Você tem alterações não salvas. Deseja sair mesmo assim?')) {
                window.location.href = `npcs-manager.html?campaign=${this.campaignId}`;
            }
        } else {
            window.location.href = `npcs-manager.html?campaign=${this.campaignId}`;
        }
    }

    // ================================
    // UTILITÁRIOS DE UI
    // ================================

    showLoading(show) {
        const loadingEl = document.getElementById('npcLoading');
        const sheetEl = document.getElementById('npcSheet');

        if (show) {
            if (loadingEl) loadingEl.style.display = 'block';
            if (sheetEl) sheetEl.style.display = 'none';
        } else {
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }

    showSheet() {
        const loadingEl = document.getElementById('npcLoading');
        const sheetEl = document.getElementById('npcSheet');

        if (loadingEl) loadingEl.style.display = 'none';
        if (sheetEl) sheetEl.style.display = 'block';
    }

    showLoadingOverlay(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
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

    // ================================
    // FUNÇÕES PARA BARRAS DINÂMICAS
    // ================================

    updateHealthBar() {
        const pvAtual = parseInt(document.getElementById('pvAtual')?.value) || 0;
        const pvMax = parseInt(document.getElementById('pvMax')?.value) || 0;
        
        const healthDisplay = document.getElementById('healthDisplay');
        const healthFill = document.getElementById('healthFill');
        
        if (healthDisplay) {
            healthDisplay.textContent = `${pvAtual} / ${pvMax}`;
        }
        
        if (healthFill && pvMax > 0) {
            const percentage = Math.min((pvAtual / pvMax) * 100, 100);
            healthFill.style.width = `${percentage}%`;
            
            // Mudar cor baseado na porcentagem
            if (percentage > 60) {
                healthFill.style.background = 'linear-gradient(90deg, #28a745 0%, #5cb85c 50%, #28a745 100%)';
            } else if (percentage > 30) {
                healthFill.style.background = 'linear-gradient(90deg, #ffc107 0%, #ffeb3b 50%, #ffc107 100%)';
            } else {
                healthFill.style.background = 'linear-gradient(90deg, #dc3545 0%, #ff6b6b 50%, #dc3545 100%)';
            }
        }
    }

    updateDefenseBar() {
        const defesaAtual = parseInt(document.getElementById('defesa')?.value) || 0;
        const defesaMax = parseInt(document.getElementById('defesaMax')?.value) || defesaAtual;
        
        const defenseValue = document.getElementById('defenseValue');
        const defenseFill = document.getElementById('defenseFill');
        
        if (defenseValue) {
            defenseValue.textContent = defesaAtual;
        }
        
        if (defenseFill && defesaMax > 0) {
            const percentage = Math.min((defesaAtual / defesaMax) * 100, 100);
            defenseFill.style.width = `${percentage}%`;
            
            // Mudar cor baseado na porcentagem
            if (percentage > 70) {
                defenseFill.style.background = 'linear-gradient(90deg, #007bff 0%, #66b3ff 50%, #007bff 100%)';
            } else if (percentage > 40) {
                defenseFill.style.background = 'linear-gradient(90deg, #ffc107 0%, #ffeb3b 50%, #ffc107 100%)';
            } else {
                defenseFill.style.background = 'linear-gradient(90deg, #dc3545 0%, #ff6b6b 50%, #dc3545 100%)';
            }
        }
    }

    updateMovementDisplay() {
        const movimento = document.getElementById('movimento')?.value || '';
        const movementDisplay = document.getElementById('movementDisplay');
        
        if (movementDisplay) {
            movementDisplay.textContent = movimento || '--';
        }
        
        // Atualizar barra de progresso quando o movimento base mudar
        this.updateMovementProgress();
    }

    updateMovementProgress() {
        const movimentoPercorrido = this.npcData?.movimento_percorrido || 0;
        const movimentoBase = this.parseMovementValue(document.getElementById('movimento')?.value || '');
        
        const movementProgress = document.getElementById('movementProgress');
        const movementFill = document.getElementById('movementFill');
        
        if (movementProgress) {
            movementProgress.textContent = `${movimentoPercorrido}m / ${movimentoBase}m`;
        }
        
        if (movementFill && movimentoBase > 0) {
            const percentage = Math.min((movimentoPercorrido / movimentoBase) * 100, 100);
            movementFill.style.width = `${percentage}%`;
            
            // Mudar cor baseado na porcentagem
            if (percentage >= 100) {
                movementFill.style.background = 'linear-gradient(90deg, #dc3545 0%, #ff6b6b 50%, #dc3545 100%)';
            } else if (percentage > 75) {
                movementFill.style.background = 'linear-gradient(90deg, #ffc107 0%, #ffeb3b 50%, #ffc107 100%)';
            } else {
                movementFill.style.background = 'linear-gradient(90deg, #28a745 0%, #5cb85c 50%, #28a745 100%)';
            }
        }
    }

    parseMovementValue(movementString) {
        // Extrair número do texto de movimento (ex: "30m", "30 metros", "30 pés")
        const match = movementString.match(/(\d+)/);
        return match ? parseInt(match[1]) : 30; // Default 30m se não conseguir parsear
    }

    addMovement() {
        const movimentoBase = this.parseMovementValue(document.getElementById('movimento')?.value || '');
        const movimentoAtual = this.npcData?.movimento_percorrido || 0;
        
        if (movimentoAtual + 1.5 <= movimentoBase) {
            this.npcData.movimento_percorrido = Math.round((movimentoAtual + 1.5) * 10) / 10; // Arredondar para 1 casa decimal
            this.updateMovementProgress();
            this.markAsChanged();
            
            // Feedback visual
            this.showNotification(`Movimento +1,5m (${this.npcData.movimento_percorrido}m/${movimentoBase}m)`, 'success');
            
            // Animação no botão
            const btn = document.getElementById('addMovementBtn');
            if (btn) {
                btn.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    btn.style.transform = '';
                }, 150);
            }
        } else {
            const restante = movimentoBase - movimentoAtual;
            if (restante > 0) {
                this.showNotification(`Movimento insuficiente! Restam apenas ${restante}m`, 'warning');
            } else {
                this.showNotification('Movimento esgotado para este turno!', 'error');
            }
        }
    }

    resetMovement() {
        if (this.npcData) {
            this.npcData.movimento_percorrido = 0;
            this.updateMovementProgress();
            this.markAsChanged();
            this.showNotification('Movimento resetado para novo turno', 'info');
        }
    }

    reduceDefense() {
        const defesaInput = document.getElementById('defesa');
        if (defesaInput) {
            const currentDefense = parseInt(defesaInput.value) || 0;
            if (currentDefense > 0) {
                defesaInput.value = currentDefense - 1;
                this.updateDefenseBar();
                this.markAsChanged();
                
                // Mostrar feedback visual
                this.showNotification(`Defesa reduzida para ${currentDefense - 1}`, 'warning');
                
                // Animação no botão
                const btn = document.getElementById('reduceDefenseBtn');
                if (btn) {
                    btn.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        btn.style.transform = '';
                    }, 150);
                }
            } else {
                this.showNotification('A defesa já está em 0!', 'error');
            }
        }
    }

    markAsChanged() {
        this.hasChanges = true;
        this.showSaveButton();
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.npcSheet = new NpcSheet();
});

// Exportar para uso global
window.NpcSheet = NpcSheet;
