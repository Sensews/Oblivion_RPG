/**
 * Gerenciador do Modal de Criação de Personagem - Oblivion RPG
 */

class CharacterCreationModal {
    constructor() {
        this.currentStep = 1;
        this.maxSteps = 7;
        this.tempSecondaryLegacy = null;
        this.creationData = {
            origins: [],
            legacies: [],
            paths: {},
            reactions: [],
            selectedOrigin: null,
            selectedLegacy: null,
            selectedSecondaryLegacy: null,
            selectedPath: null,
            selectedSecondaryPath: null,
            selectedReaction: null,
            isHalfRace: false,
            attributes: {
                fisico: 0,
                vitalidade: 0,
                tecnica: 0,
                intelecto: 0,
                presenca: 0,
                vivencia: 0
            },
            pointsUsed: 0,
            maxPoints: 4
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadCreationData();
    }

    bindEvents() {
        // Modal events
        const modal = document.getElementById('characterCreationModal');
        const closeBtn = document.getElementById('closeCharacterCreationModal');
        const cancelBtn = document.getElementById('cancelCharacterCreation');
        
        // Fechar modal ao clicar no backdrop (área escura)
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
        
        // Fechar modal com botões
        [closeBtn, cancelBtn].forEach(element => {
            if (element) {
                element.addEventListener('click', () => this.closeModal());
            }
        });

        // Navigation buttons
        const prevBtn = document.getElementById('previousStep');
        const nextBtn = document.getElementById('nextStep');
        const createBtn = document.getElementById('createCharacter');

        if (prevBtn) prevBtn.addEventListener('click', () => this.previousStep());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextStep());
        if (createBtn) createBtn.addEventListener('click', () => this.createCharacter());

        // Image upload
        const imagePreview = document.getElementById('imagePreview');
        const imageFile = document.getElementById('characterImageFile');

        if (imagePreview) {
            imagePreview.addEventListener('click', () => imageFile?.click());
        }

        if (imageFile) {
            imageFile.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        // Campaign code validation
        const campaignCodeInput = document.getElementById('characterCampaignCode');
        if (campaignCodeInput) {
            let validationTimeout;
            campaignCodeInput.addEventListener('input', (e) => {
                clearTimeout(validationTimeout);
                validationTimeout = setTimeout(() => {
                    this.validateCampaignCode(e.target.value);
                }, 500); // Debounce de 500ms
            });
        }

        // Origin search functionality
        const originSearchInput = document.getElementById('originSearch');
        const clearOriginSearch = document.getElementById('clearOriginSearch');
        
        if (originSearchInput) {
            let searchTimeout;
            originSearchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filterOrigins(e.target.value);
                }, 300); // Debounce de 300ms
                
                // Show/hide clear button
                const clearBtn = document.getElementById('clearOriginSearch');
                if (clearBtn) {
                    clearBtn.style.display = e.target.value ? 'flex' : 'none';
                }
            });
        }
        
        if (clearOriginSearch) {
            clearOriginSearch.addEventListener('click', () => {
                originSearchInput.value = '';
                clearOriginSearch.style.display = 'none';
                this.filterOrigins('');
                originSearchInput.focus();
            });
        }

        // Legacy search functionality
        const legacySearchInput = document.getElementById('legacySearch');
        const clearLegacySearch = document.getElementById('clearLegacySearch');
        
        if (legacySearchInput) {
            let searchTimeout;
            legacySearchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filterLegacies(e.target.value);
                }, 300); // Debounce de 300ms
                
                // Show/hide clear button
                const clearBtn = document.getElementById('clearLegacySearch');
                if (clearBtn) {
                    clearBtn.style.display = e.target.value ? 'flex' : 'none';
                }
            });
        }
        
        if (clearLegacySearch) {
            clearLegacySearch.addEventListener('click', () => {
                legacySearchInput.value = '';
                clearLegacySearch.style.display = 'none';
                this.filterLegacies('');
                legacySearchInput.focus();
            });
        }

        // Half-race toggle functionality
        const halfRaceToggle = document.getElementById('halfRaceToggle');
        if (halfRaceToggle) {
            halfRaceToggle.addEventListener('change', (e) => {
                this.toggleHalfRace(e.target.checked);
            });
        }

        // Secondary legacy search functionality
        const secondaryLegacySearch = document.getElementById('secondaryLegacySearch');
        const clearSecondaryLegacySearch = document.getElementById('clearSecondaryLegacySearch');
        
        if (secondaryLegacySearch) {
            let searchTimeout;
            secondaryLegacySearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filterSecondaryLegacies(e.target.value);
                }, 300);
                
                const clearBtn = document.getElementById('clearSecondaryLegacySearch');
                if (clearBtn) {
                    clearBtn.style.display = e.target.value ? 'flex' : 'none';
                }
            });
        }
        
        if (clearSecondaryLegacySearch) {
            clearSecondaryLegacySearch.addEventListener('click', () => {
                secondaryLegacySearch.value = '';
                clearSecondaryLegacySearch.style.display = 'none';
                this.filterSecondaryLegacies('');
                secondaryLegacySearch.focus();
            });
        }

        // Attribute controls
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('attr-btn')) {
                const attr = e.target.dataset.attr;
                const action = e.target.dataset.action;
                this.handleAttributeChange(attr, action);
            }
        });

        // Attribute randomize and reset
        const randomizeBtn = document.getElementById('randomizeAttributes');
        const resetBtn = document.getElementById('resetAttributes');
        
        if (randomizeBtn) {
            randomizeBtn.addEventListener('click', () => this.randomizeAttributes());
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetAttributes());
        }

        // Form submission
        const form = document.getElementById('characterCreationForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createCharacter();
            });
        }
    }

    async loadCreationData() {
        try {
            const response = await window.makeBackendRequest('get-character-creation-data.php');
            const data = await response.json();

            if (data.success) {
                this.creationData.origins = data.data.origens;
                this.creationData.legacies = data.data.legados;
                this.creationData.paths = data.data.caminhos;
                this.creationData.reactions = data.data.reacoes;
            } else {
                throw new Error(data.error || 'Erro ao carregar dados');
            }
        } catch (error) {
            console.error('Erro ao carregar dados de criação:', error);
            this.showNotification('Erro ao carregar dados de criação', 'error');
        }
    }

    openModal() {
        const modal = document.getElementById('characterCreationModal');
        if (modal) {
            modal.classList.add('show');
            this.resetModal();
        }
    }

    closeModal() {
        const modal = document.getElementById('characterCreationModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    resetModal() {
        this.currentStep = 1;
        this.updateStepDisplay();
        this.resetForm();
        this.resetAttributes();
    }

    resetForm() {
        const form = document.getElementById('characterCreationForm');
        if (form) form.reset();
        
        // Reset image preview
        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview) {
            imagePreview.innerHTML = '<i class="fas fa-user"></i><span>Clique para adicionar imagem</span>';
        }
        
        // Reset campaign validation
        const campaignValidation = document.getElementById('campaignValidation');
        if (campaignValidation) {
            campaignValidation.style.display = 'none';
        }
        
        // Reset origin search
        const originSearch = document.getElementById('originSearch');
        const clearOriginSearch = document.getElementById('clearOriginSearch');
        if (originSearch) {
            originSearch.value = '';
        }
        if (clearOriginSearch) {
            clearOriginSearch.style.display = 'none';
        }
        
        // Reset legacy search
        const legacySearch = document.getElementById('legacySearch');
        const clearLegacySearch = document.getElementById('clearLegacySearch');
        if (legacySearch) {
            legacySearch.value = '';
        }
        if (clearLegacySearch) {
            clearLegacySearch.style.display = 'none';
        }
        
        // Reset half-race toggle
        const halfRaceToggle = document.getElementById('halfRaceToggle');
        const secondarySection = document.getElementById('secondaryLegacySection');
        const secondaryPathSection = document.getElementById('secondaryPathSection');
        if (halfRaceToggle) {
            halfRaceToggle.checked = false;
        }
        if (secondarySection) {
            secondarySection.style.display = 'none';
        }
        if (secondaryPathSection) {
            secondaryPathSection.style.display = 'none';
        }
        
        // Clear selections
        this.creationData.selectedOrigin = null;
        this.creationData.selectedLegacy = null;
        this.creationData.selectedSecondaryLegacy = null;
        this.creationData.selectedPath = null;
        this.creationData.selectedSecondaryPath = null;
        this.creationData.selectedReaction = null;
        this.creationData.isHalfRace = false;
        
        // Reset attributes
        this.resetAttributes();
    }

    resetAttributes() {
        Object.keys(this.creationData.attributes).forEach(attr => {
            this.creationData.attributes[attr] = 0;
        });
        this.creationData.pointsUsed = 0;
        this.updateAttributeDisplay();
    }

    updateStepDisplay() {
        // Hide all steps
        for (let i = 1; i <= this.maxSteps; i++) {
            const step = document.getElementById(`step${i}`);
            if (step) step.classList.remove('active');
        }

        // Show current step
        const currentStepEl = document.getElementById(`step${this.currentStep}`);
        if (currentStepEl) currentStepEl.classList.add('active');

        // Update navigation buttons
        const prevBtn = document.getElementById('previousStep');
        const nextBtn = document.getElementById('nextStep');
        const createBtn = document.getElementById('createCharacter');

        if (prevBtn) prevBtn.style.display = this.currentStep > 1 ? 'flex' : 'none';
        if (nextBtn) nextBtn.style.display = this.currentStep < this.maxSteps ? 'flex' : 'none';
        if (createBtn) createBtn.style.display = this.currentStep === this.maxSteps ? 'flex' : 'none';

        // Load step content
        this.loadStepContent();
    }

    loadStepContent() {
        switch (this.currentStep) {
            case 2:
                this.loadOrigins();
                break;
            case 3:
                this.loadLegacies();
                break;
            case 4:
                this.loadPaths();
                break;
            case 6:
                this.loadReactions();
                this.setupMaestryValidation();
                break;
            case 7:
                this.generateSummary();
                break;
        }
    }

    loadOrigins() {
        const container = document.getElementById('originsList');
        if (!container) return;

        this.renderOrigins(this.creationData.origins);
    }

    renderOrigins(origins) {
        const container = document.getElementById('originsList');
        if (!container) return;

        if (origins.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h4>Nenhuma origem encontrada</h4>
                    <p>Tente ajustar os termos da sua busca</p>
                </div>
            `;
            return;
        }

        container.innerHTML = origins.map(origin => `
            <div class="selection-item" data-id="${origin.id}" onclick="characterCreationModal.selectOrigin(${origin.id})">
                <h4>${origin.nome}</h4>
                <p>${origin.descricao_origem.substring(0, 100)}...</p>
            </div>
        `).join('');
    }

    filterOrigins(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            this.renderOrigins(this.creationData.origins);
            return;
        }

        const term = searchTerm.toLowerCase().trim();
        const filteredOrigins = this.creationData.origins.filter(origin => {
            return origin.nome.toLowerCase().includes(term) || 
                   origin.descricao_origem.toLowerCase().includes(term);
        });

        // Highlight search terms
        const highlightedOrigins = filteredOrigins.map(origin => ({
            ...origin,
            nome: this.highlightSearchTerm(origin.nome, term),
            descricao_origem: origin.descricao_origem // Não destacar na descrição para manter legibilidade
        }));

        this.renderOriginsWithHighlight(highlightedOrigins);
    }

    highlightSearchTerm(text, term) {
        if (!term) return text;
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }

    renderOriginsWithHighlight(origins) {
        const container = document.getElementById('originsList');
        if (!container) return;

        if (origins.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h4>Nenhuma origem encontrada</h4>
                    <p>Tente ajustar os termos da sua busca</p>
                </div>
            `;
            return;
        }

        container.innerHTML = origins.map(origin => `
            <div class="selection-item" data-id="${origin.id}" onclick="characterCreationModal.selectOrigin(${origin.id})">
                <h4>${origin.nome}</h4>
                <p>${origin.descricao_origem.substring(0, 100)}...</p>
            </div>
        `).join('');
    }

    filterLegacies(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            this.renderLegacies(this.creationData.legacies);
            this.renderSecondaryLegacies(this.creationData.legacies);
            return;
        }

        const term = searchTerm.toLowerCase().trim();
        const filteredLegacies = this.creationData.legacies.filter(legacy => {
            return legacy.nome.toLowerCase().includes(term) || 
                   legacy.descricao.toLowerCase().includes(term);
        });

        // Highlight search terms
        const highlightedLegacies = filteredLegacies.map(legacy => ({
            ...legacy,
            nome: this.highlightSearchTerm(legacy.nome, term),
            descricao: legacy.descricao // Não destacar na descrição para manter legibilidade
        }));

        this.renderLegaciesWithHighlight(highlightedLegacies);
        this.renderSecondaryLegaciesWithHighlight(highlightedLegacies);
    }

    renderLegacies(legacies) {
        const container = document.getElementById('legacyList');
        if (!container) return;

        if (legacies.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h4>Nenhum legado encontrado</h4>
                    <p>Tente ajustar os termos da sua busca</p>
                </div>
            `;
            return;
        }

        container.innerHTML = legacies.map(legacy => `
            <div class="selection-item" data-id="${legacy.id}" onclick="characterCreationModal.selectLegacy(${legacy.id})">
                <h4>${legacy.nome}</h4>
                <p>${legacy.descricao.substring(0, 100)}...</p>
            </div>
        `).join('');
    }

    renderLegaciesWithHighlight(legacies) {
        const container = document.getElementById('legacyList');
        if (!container) return;

        if (legacies.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h4>Nenhum legado encontrado</h4>
                    <p>Tente ajustar os termos da sua busca</p>
                </div>
            `;
            return;
        }

        container.innerHTML = legacies.map(legacy => `
            <div class="selection-item" data-id="${legacy.id}" onclick="characterCreationModal.selectLegacy(${legacy.id})">
                <h4>${legacy.nome}</h4>
                <p>${legacy.descricao.substring(0, 100)}...</p>
            </div>
        `).join('');
    }

    renderSecondaryLegaciesWithHighlight(legacies) {
        // Este método foi substituído pelo sistema de modal
        // Mantido para compatibilidade, mas não usado
    }

    toggleHalfRace(isHalfRace) {
        this.creationData.isHalfRace = isHalfRace;
        
        const secondarySection = document.getElementById('secondaryLegacySection');
        const isHalfRaceInput = document.getElementById('isHalfRace');
        
        if (secondarySection) {
            if (isHalfRace) {
                secondarySection.style.display = 'block';
                // Carrega os legados disponíveis para o segundo legado
                this.loadSecondaryLegacies();
            } else {
                secondarySection.style.display = 'none';
            }
        }
        
        if (isHalfRaceInput) {
            isHalfRaceInput.value = isHalfRace ? '1' : '0';
        }
        
        // Atualiza os detalhes do legado principal para mostrar/ocultar modificadores de mestiço
        if (this.creationData.selectedLegacy) {
            this.showLegacyDetails();
        }
        
        // Atualiza os detalhes do caminho principal para mostrar/ocultar modificadores de mestiço
        if (this.creationData.selectedPath) {
            this.showPathDetails();
        }
        
        // Atualiza a seção de caminhos se estivermos na etapa de caminhos
        if (this.currentStep === 4) {
            this.loadPaths();
        }
        
        // Reset secondary legacy selection when toggling off
        if (!isHalfRace) {
            this.creationData.selectedSecondaryLegacy = null;
            this.creationData.selectedSecondaryPath = null;
            const secondaryInput = document.getElementById('selectedSecondaryLegacy');
            const secondaryPathInput = document.getElementById('selectedSecondaryPath');
            if (secondaryInput) secondaryInput.value = '';
            if (secondaryPathInput) secondaryPathInput.value = '';
        }
    }

    loadSecondaryLegacies() {
        this.renderSecondaryLegacies(this.creationData.legacies);
    }

    filterSecondaryLegacies(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            this.renderSecondaryLegacies(this.creationData.legacies);
            return;
        }

        const term = searchTerm.toLowerCase().trim();
        const filteredLegacies = this.creationData.legacies.filter(legacy => {
            return legacy.nome.toLowerCase().includes(term) || 
                   legacy.descricao.toLowerCase().includes(term);
        });

        this.renderSecondaryLegacies(filteredLegacies, term);
    }

    renderSecondaryLegacies(legacies, searchTerm = '') {
        const container = document.getElementById('secondaryLegacyList');
        if (!container) return;

        // Filtrar legados que não sejam o legado principal selecionado
        const availableLegacies = legacies.filter(legacy => 
            !this.creationData.selectedLegacy || legacy.id !== this.creationData.selectedLegacy.id
        );

        if (availableLegacies.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-info-circle"></i>
                    <h4>Nenhum legado disponível</h4>
                    <p>Todos os legados estão sendo filtrados ou já selecionados</p>
                </div>
            `;
            return;
        }

        container.innerHTML = availableLegacies.map(legacy => {
            const nome = searchTerm ? this.highlightSearchTerm(legacy.nome, searchTerm) : legacy.nome;
            return `
                <div class="selection-item" data-id="${legacy.id}" onclick="characterCreationModal.selectSecondaryLegacy(${legacy.id})">
                    <h4>${nome}</h4>
                    <p>${legacy.descricao.substring(0, 100)}...</p>
                </div>
            `;
        }).join('');
    }

    selectSecondaryLegacy(legacyId) {
        this.creationData.selectedSecondaryLegacy = this.creationData.legacies.find(l => l.id == legacyId);
        
        // Update visual selection
        document.querySelectorAll('#secondaryLegacyList .selection-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`#secondaryLegacyList .selection-item[data-id="${legacyId}"]`)?.classList.add('selected');

        // Update details
        this.showSecondaryLegacyDetails();
        
        // Update hidden input
        const input = document.getElementById('selectedSecondaryLegacy');
        if (input) input.value = legacyId;

        // Reset secondary path selection
        this.creationData.selectedSecondaryPath = null;
        const secondaryPathInput = document.getElementById('selectedSecondaryPath');
        if (secondaryPathInput) secondaryPathInput.value = '';
        
        // Se estivermos na etapa de caminhos, recarrega os caminhos
        if (this.currentStep === 4) {
            this.loadPaths();
        }
    }

    showSecondaryLegacyDetails() {
        const container = document.getElementById('secondaryLegacyDetails');
        const legacy = this.creationData.selectedSecondaryLegacy;
        
        if (!container || !legacy) return;

        container.innerHTML = `
            <div class="detail-section">
                <h4>${legacy.nome} <span class="legacy-subtitle">(Segundo Legado)</span></h4>
                <p>${legacy.descricao}</p>
                <div class="mestizo-warning-details">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p><strong>Mestiço:</strong> Caminhos deste legado terão custo +1 e a última habilidade indisponível.</p>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Características (não aplicadas)</h4>
                <div class="stats-grid">
                    <div class="stat-item"><strong>Deslocamento:</strong> ${legacy.deslocamento}</div>
                    <div class="stat-item"><strong>Defesa:</strong> ${legacy.calculo_defesa}</div>
                    <div class="stat-item"><strong>Alerta:</strong> ${legacy.calculo_alerta}</div>
                    <div class="stat-item"><strong>Carga:</strong> ${legacy.calculo_carga}</div>
                </div>
                <p class="secondary-note">Apenas o legado principal fornece características base.</p>
            </div>
        `;
    }

    selectOrigin(originId) {
        this.creationData.selectedOrigin = this.creationData.origins.find(o => o.id == originId);
        
        // Update visual selection
        document.querySelectorAll('#originsList .selection-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`#originsList .selection-item[data-id="${originId}"]`)?.classList.add('selected');

        // Update details
        this.showOriginDetails();
        
        // Update hidden input
        const input = document.getElementById('selectedOrigin');
        if (input) input.value = originId;
    }

    showOriginDetails() {
        const container = document.getElementById('originDetails');
        const origin = this.creationData.selectedOrigin;
        
        if (!container || !origin) return;

        container.innerHTML = `
            <div class="detail-section">
                <h4>${origin.nome}</h4>
                <p>${origin.descricao_origem}</p>
            </div>
            
            <div class="detail-section">
                <h4>Valores Iniciais</h4>
                <div class="stats-grid">
                    <div class="stat-item"><strong>PV:</strong> ${origin.pv_inicial} (${origin.dados_pv})</div>
                    <div class="stat-item"><strong>PE:</strong> ${origin.pe_inicial} (${origin.dados_pe})</div>
                    <div class="stat-item"><strong>Atributo:</strong> ${origin.atributo_inicial}</div>
                    <div class="stat-item"><strong>Ocupação:</strong> ${origin.ocupacao_inicial || 'Nenhuma'}</div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>${origin.habilidade_nome}</h4>
                <p>${origin.habilidade_descricao}</p>
            </div>
            
            <div class="detail-section">
                <h4>Equipamento Inicial</h4>
                <p>${origin.equipamento_inicial}</p>
            </div>
        `;
    }

    loadLegacies() {
        const container = document.getElementById('legacyList');
        if (!container) return;

        this.renderLegacies(this.creationData.legacies);
    }

    selectLegacy(legacyId) {
        this.creationData.selectedLegacy = this.creationData.legacies.find(l => l.id == legacyId);
        
        // Update visual selection
        document.querySelectorAll('#legacyList .selection-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`#legacyList .selection-item[data-id="${legacyId}"]`)?.classList.add('selected');

        // Update details
        this.showLegacyDetails();
        
        // Update hidden input
        const input = document.getElementById('selectedLegacy');
        if (input) input.value = legacyId;

        // Reset path selection when legacy changes
        this.creationData.selectedPath = null;
        
        // Se mestiço está ativo, recarrega os legados secundários disponíveis
        if (this.creationData.isHalfRace) {
            this.loadSecondaryLegacies();
        }
    }

    showLegacyDetails() {
        const container = document.getElementById('legacyDetails');
        const legacy = this.creationData.selectedLegacy;
        
        if (!container || !legacy) return;

        const legacyTitle = this.creationData.isHalfRace 
            ? `${legacy.nome} <span class="legacy-subtitle">(Primeiro Legado - Mestiço)</span>`
            : legacy.nome;

        container.innerHTML = `
            <div class="detail-section">
                <h4>${legacyTitle}</h4>
                <p>${legacy.descricao}</p>
                ${this.creationData.isHalfRace ? `
                    <div class="mestizo-warning-details">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p><strong>Mestiço:</strong> Caminhos deste legado terão custo +1 e a última habilidade indisponível.</p>
                    </div>
                ` : ''}
            </div>
            
            <div class="detail-section">
                <h4>Características</h4>
                <div class="stats-grid">
                    <div class="stat-item"><strong>Deslocamento:</strong> ${legacy.deslocamento}</div>
                    <div class="stat-item"><strong>Defesa:</strong> ${legacy.calculo_defesa}</div>
                    <div class="stat-item"><strong>Alerta:</strong> ${legacy.calculo_alerta}</div>
                    <div class="stat-item"><strong>Carga:</strong> ${legacy.calculo_carga}</div>
                </div>
            </div>
        `;
    }

    loadPaths() {
        const primaryContainer = document.getElementById('pathList');
        const secondarySection = document.getElementById('secondaryPathSection');
        
        if (!primaryContainer || !this.creationData.selectedLegacy) {
            if (primaryContainer) primaryContainer.innerHTML = '<p class="placeholder-text">Selecione um legado primeiro</p>';
            return;
        }

        // Carrega caminhos do legado principal
        const legacyId = this.creationData.selectedLegacy.id;
        const paths = this.creationData.paths[legacyId] || [];
        this.renderPrimaryPaths(paths);

        // Se é mestiço e tem segundo legado, carrega caminhos secundários
        if (this.creationData.isHalfRace && this.creationData.selectedSecondaryLegacy) {
            if (secondarySection) {
                secondarySection.style.display = 'block';
                this.loadSecondaryPaths();
            }
        } else {
            if (secondarySection) {
                secondarySection.style.display = 'none';
            }
        }
    }

    renderPrimaryPaths(paths) {
        const container = document.getElementById('pathList');
        if (!container) return;

        if (paths.length === 0) {
            container.innerHTML = '<p class="placeholder-text">Nenhum caminho disponível para este legado</p>';
            return;
        }

        const mestizoBadge = this.creationData.isHalfRace 
            ? '<span class="mestizo-path-badge">Custos +1, última hab. bloqueada</span>'
            : '';

        container.innerHTML = paths.map(path => `
            <div class="selection-item ${this.creationData.isHalfRace ? 'mestizo-affected' : ''}" data-id="${path.id}" onclick="characterCreationModal.selectPath(${path.id})">
                <h4>${path.nome_caminho}</h4>
                <p>Ver habilidades disponíveis</p>
                ${mestizoBadge}
            </div>
        `).join('');
    }

    loadSecondaryPaths() {
        if (!this.creationData.selectedSecondaryLegacy) return;
        
        const secondaryLegacyId = this.creationData.selectedSecondaryLegacy.id;
        const secondaryPaths = this.creationData.paths[secondaryLegacyId] || [];
        this.renderSecondaryPaths(secondaryPaths);
    }

    renderSecondaryPaths(paths) {
        const container = document.getElementById('secondaryPathList');
        if (!container) return;

        if (paths.length === 0) {
            container.innerHTML = '<p class="placeholder-text">Nenhum caminho disponível para este legado</p>';
            return;
        }

        container.innerHTML = paths.map(path => `
            <div class="selection-item mestizo-affected" data-id="${path.id}" onclick="characterCreationModal.selectSecondaryPath(${path.id})">
                <h4>${path.nome_caminho}</h4>
                <p>Ver habilidades disponíveis</p>
                <span class="mestizo-path-badge">Custos +1, última hab. bloqueada</span>
            </div>
        `).join('');
    }

    selectPath(pathId) {
        const legacyId = this.creationData.selectedLegacy?.id;
        const paths = this.creationData.paths[legacyId] || [];
        this.creationData.selectedPath = paths.find(p => p.id == pathId);
        
        // Update visual selection
        document.querySelectorAll('#pathList .selection-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`#pathList .selection-item[data-id="${pathId}"]`)?.classList.add('selected');

        // Update details
        this.showPathDetails();
        
        // Update hidden input
        const input = document.getElementById('selectedPath');
        if (input) input.value = pathId;
    }

    selectSecondaryPath(pathId) {
        const secondaryLegacyId = this.creationData.selectedSecondaryLegacy?.id;
        const paths = this.creationData.paths[secondaryLegacyId] || [];
        this.creationData.selectedSecondaryPath = paths.find(p => p.id == pathId);
        
        // Update visual selection
        document.querySelectorAll('#secondaryPathList .selection-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`#secondaryPathList .selection-item[data-id="${pathId}"]`)?.classList.add('selected');

        // Update details
        this.showSecondaryPathDetails();
        
        // Update hidden input
        const input = document.getElementById('selectedSecondaryPath');
        if (input) input.value = pathId;
    }

    showPathDetails() {
        const container = document.getElementById('pathDetails');
        const path = this.creationData.selectedPath;
        
        if (!container || !path) return;

        let abilities = '';
        for (let i = 1; i <= 5; i++) {
            const abilityName = path[`habilidade_nome_${i}`];
            const abilityDesc = path[`descricao_${i}`];
            const abilityCost = path[`custo_${i}`];
            
            if (abilityName && abilityDesc) {
                const isLastAbility = i === 5;
                const isMestizo = this.creationData.isHalfRace;
                
                if (isMestizo && isLastAbility) {
                    abilities += `
                        <div class="detail-section ability-disabled">
                            <h4>${abilityName} ${abilityCost ? `(Custo: ${abilityCost})` : ''}</h4>
                            <p>${abilityDesc}</p>
                            <div class="ability-disabled-note">
                                <i class="fas fa-ban"></i>
                                Indisponível para mestiços
                            </div>
                        </div>
                    `;
                } else if (isMestizo) {
                    const modifiedCost = abilityCost ? abilityCost + 1 : 1;
                    abilities += `
                        <div class="detail-section">
                            <h4>
                                ${abilityName} 
                                ${abilityCost ? `(Custo: ${abilityCost})` : ''}
                                <span class="ability-cost-modified">Mestiço: ${modifiedCost}</span>
                            </h4>
                            <p>${abilityDesc}</p>
                        </div>
                    `;
                } else {
                    abilities += `
                        <div class="detail-section">
                            <h4>${abilityName} ${abilityCost ? `(Custo: ${abilityCost})` : ''}</h4>
                            <p>${abilityDesc}</p>
                        </div>
                    `;
                }
            }
        }

        const pathTitle = this.creationData.isHalfRace 
            ? `${path.nome_caminho} <span class="path-subtitle">(Primeiro Legado - Mestiço)</span>`
            : path.nome_caminho;

        container.innerHTML = `
            <div class="detail-section">
                <h4>${pathTitle}</h4>
                <p>Habilidades do caminho:</p>
                ${this.creationData.isHalfRace ? `
                    <div class="mestizo-warning-details">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p><strong>Mestiço:</strong> Custos +1 e última habilidade indisponível.</p>
                    </div>
                ` : ''}
            </div>
            ${abilities}
        `;
    }

    showSecondaryPathDetails() {
        const container = document.getElementById('secondaryPathDetails');
        const path = this.creationData.selectedSecondaryPath;
        
        if (!container || !path) return;

        let abilities = '';
        for (let i = 1; i <= 5; i++) {
            const abilityName = path[`habilidade_nome_${i}`];
            const abilityDesc = path[`descricao_${i}`];
            const abilityCost = path[`custo_${i}`];
            
            if (abilityName && abilityDesc) {
                const isLastAbility = i === 5;
                const modifiedCost = abilityCost ? abilityCost + 1 : 1;
                
                if (isLastAbility) {
                    abilities += `
                        <div class="detail-section ability-disabled">
                            <h4>${abilityName} ${abilityCost ? `(Custo: ${abilityCost})` : ''}</h4>
                            <p>${abilityDesc}</p>
                            <div class="ability-disabled-note">
                                <i class="fas fa-ban"></i>
                                Indisponível para mestiços
                            </div>
                        </div>
                    `;
                } else {
                    abilities += `
                        <div class="detail-section">
                            <h4>
                                ${abilityName} 
                                ${abilityCost ? `(Custo: ${abilityCost})` : ''}
                                <span class="ability-cost-modified">Mestiço: ${modifiedCost}</span>
                            </h4>
                            <p>${abilityDesc}</p>
                        </div>
                    `;
                }
            }
        }

        container.innerHTML = `
            <div class="detail-section">
                <h4>${path.nome_caminho} <span class="path-subtitle">(Segundo Legado - Mestiço)</span></h4>
                <div class="mestizo-warning-details">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p><strong>Mestiço:</strong> Custos +1 e última habilidade indisponível.</p>
                </div>
                <p>Habilidades do caminho:</p>
            </div>
            ${abilities}
        `;
    }

    handleAttributeChange(attr, action) {
        const currentValue = this.creationData.attributes[attr];
        let newValue = currentValue;
        let oldPointsUsed = this.creationData.pointsUsed;

        // Calcular pontos disponíveis (base + bônus de negativo)
        const negativeCount = Object.values(this.creationData.attributes).filter(v => v < 0).length;
        const maxPoints = this.creationData.maxPoints + negativeCount;

        if (action === 'increase') {
            if (this.creationData.pointsUsed < maxPoints) {
                newValue = currentValue + 1;
                this.creationData.pointsUsed++;
            }
        } else if (action === 'decrease') {
            if (currentValue > -1) { // Permite até -1
                newValue = currentValue - 1;
                
                // Se estava positivo e vai para 0 ou negativo, libera um ponto
                if (currentValue > 0) {
                    this.creationData.pointsUsed--;
                }
                // Se vai para negativo, ganha ponto extra no pool
                // (será recalculado no updateAttributeDisplay)
            }
        }

        this.creationData.attributes[attr] = newValue;
        this.updateAttributeDisplay();
    }

    updateAttributeDisplay() {
        // Recalcular pontos baseado no estado atual
        let totalPositive = 0;
        const negativeCount = Object.values(this.creationData.attributes).filter(v => v < 0).length;
        
        Object.keys(this.creationData.attributes).forEach(attr => {
            const value = this.creationData.attributes[attr];
            if (value > 0) {
                totalPositive += value;
            }
            
            const valueElement = document.getElementById(`${attr}-value`);
            const inputElement = document.getElementById(attr);
            
            if (valueElement) {
                // Mostrar bônus da origem se aplicável
                const originBonus = this.getOriginBonusForAttribute(attr);
                let displayValue = value;
                let displayText = value.toString();
                
                if (originBonus > 0) {
                    displayText = `${value} (+${originBonus})`;
                    valueElement.classList.add('has-origin-bonus');
                } else {
                    valueElement.classList.remove('has-origin-bonus');
                }
                
                valueElement.textContent = displayText;
                
                // Color coding
                if (value < 0) {
                    valueElement.style.color = '#dc3545';
                    valueElement.classList.add('negative');
                } else if (value > 0) {
                    valueElement.style.color = 'var(--accent-color)';
                    valueElement.classList.remove('negative');
                } else {
                    valueElement.style.color = 'var(--text-secondary)';
                    valueElement.classList.remove('negative');
                }
            }
            
            if (inputElement) {
                inputElement.value = value;
            }
        });

        // Atualizar pontos usados baseado no total positivo
        this.creationData.pointsUsed = totalPositive;
        
        // Calcular pontos disponíveis (base + bônus de negativo)
        const maxPoints = this.creationData.maxPoints + negativeCount;
        const remaining = maxPoints - this.creationData.pointsUsed;

        // Update counters
        const pointsElement = document.getElementById('pointsRemaining');
        const pointsUsedElement = document.getElementById('pointsUsed');
        const negativeBonusElement = document.getElementById('negativeBonus');
        
        if (pointsElement) {
            pointsElement.textContent = remaining;
            pointsElement.style.color = remaining < 0 ? '#dc3545' : 'var(--accent-color)';
        }
        
        if (pointsUsedElement) {
            pointsUsedElement.textContent = this.creationData.pointsUsed;
        }
        
        if (negativeBonusElement) {
            if (negativeCount > 0) {
                negativeBonusElement.style.display = 'block';
            } else {
                negativeBonusElement.style.display = 'none';
            }
        }

        // Update attribute buttons state
        this.updateAttributeButtons();
        
        // Show origin bonus if applicable
        this.showOriginBonus();
    }

    getOriginBonusForAttribute(attr) {
        const origin = this.creationData.selectedOrigin;
        if (!origin || !origin.atributo_inicial) return 0;
        
        // Mapear o texto do banco para os atributos
        const atributoText = origin.atributo_inicial.toLowerCase();
        const atributoMap = {
            'físico': 'fisico',
            'fisico': 'fisico',
            'vitalidade': 'vitalidade',
            'técnica': 'tecnica',
            'tecnica': 'tecnica',
            'intelecto': 'intelecto',
            'presença': 'presenca',
            'presenca': 'presenca',
            'vivência': 'vivencia',
            'vivencia': 'vivencia'
        };
        
        // Procurar por cada atributo no texto
        for (const [key, value] of Object.entries(atributoMap)) {
            if (atributoText.includes(key) && value === attr) {
                return 1; // Normalmente é +1
            }
        }
        
        return 0;
    }

    updateAttributeButtons() {
        const negativeCount = Object.values(this.creationData.attributes).filter(v => v < 0).length;
        const maxPoints = this.creationData.maxPoints + negativeCount;
        
        Object.keys(this.creationData.attributes).forEach(attr => {
            const increaseBtn = document.querySelector(`[data-attr="${attr}"][data-action="increase"]`);
            const decreaseBtn = document.querySelector(`[data-attr="${attr}"][data-action="decrease"]`);
            
            if (increaseBtn) {
                increaseBtn.disabled = this.creationData.pointsUsed >= maxPoints;
            }
            
            if (decreaseBtn) {
                const currentValue = this.creationData.attributes[attr];
                // Pode diminuir se: valor > -1 E (já tem negativo OU pode criar o primeiro negativo)
                const canDecrease = currentValue > -1 && (negativeCount > 0 || negativeCount === 0);
                decreaseBtn.disabled = !canDecrease;
            }
        });
    }

    randomizeAttributes() {
        // Resetar todos os atributos primeiro
        this.resetAttributes();
        
        const attributes = Object.keys(this.creationData.attributes);
        let totalPoints = this.creationData.maxPoints;
        
        // Decidir aleatoriamente se vai ter um atributo negativo (50% de chance)
        const hasNegative = Math.random() < 0.5;
        
        if (hasNegative) {
            // Escolher um atributo aleatório para ser negativo
            const negativeAttr = attributes[Math.floor(Math.random() * attributes.length)];
            this.creationData.attributes[negativeAttr] = -1;
            totalPoints += 1; // Ganha ponto extra
        }
        
        // Distribuir os pontos restantes aleatoriamente
        while (totalPoints > 0) {
            const randomAttr = attributes[Math.floor(Math.random() * attributes.length)];
            
            // Não pode colocar pontos positivos em atributo negativo
            if (this.creationData.attributes[randomAttr] >= 0) {
                this.creationData.attributes[randomAttr]++;
                totalPoints--;
            }
        }
        
        this.updateAttributeDisplay();
        this.showNotification('Atributos randomizados!', 'success');
    }

    resetAttributes() {
        // Resetar todos os atributos para 0
        Object.keys(this.creationData.attributes).forEach(attr => {
            this.creationData.attributes[attr] = 0;
        });
        
        this.creationData.pointsUsed = 0;
        this.updateAttributeDisplay();
    }

    showOriginBonus() {
        const origin = this.creationData.selectedOrigin;
        const bonusElement = document.getElementById('originBonus');
        const attrElement = document.getElementById('originBonusAttr');
        
        if (origin && bonusElement && attrElement) {
            if (origin.atributo_inicial) {
                bonusElement.style.display = 'block';
                
                // Extrair o nome do atributo do texto do banco
                const atributoText = origin.atributo_inicial.toLowerCase();
                let atributoNome = 'Desconhecido';
                
                if (atributoText.includes('físico') || atributoText.includes('fisico')) {
                    atributoNome = 'Físico';
                } else if (atributoText.includes('vitalidade')) {
                    atributoNome = 'Vitalidade';
                } else if (atributoText.includes('técnica') || atributoText.includes('tecnica')) {
                    atributoNome = 'Técnica';
                } else if (atributoText.includes('intelecto')) {
                    atributoNome = 'Intelecto';
                } else if (atributoText.includes('presença') || atributoText.includes('presenca')) {
                    atributoNome = 'Presença';
                } else if (atributoText.includes('vivência') || atributoText.includes('vivencia')) {
                    atributoNome = 'Vivência';
                }
                
                attrElement.textContent = `+1 ${atributoNome}`;
            } else {
                bonusElement.style.display = 'none';
            }
        }
    }

    setupMaestryValidation() {
        // Validação em tempo real dos campos de maestria
        const campos = ['maestriaNome', 'maestriaNivel', 'maestriaDano', 'maestriaAlvo'];
        
        campos.forEach(campoId => {
            const campo = document.getElementById(campoId);
            if (campo) {
                campo.addEventListener('input', () => {
                    this.validateMaestryForm();
                });
                campo.addEventListener('change', () => {
                    this.validateMaestryForm();
                });
            }
        });
    }

    validateMaestryForm() {
        const nome = document.getElementById('maestriaNome')?.value.trim();
        const nivel = document.getElementById('maestriaNivel')?.value;
        const dano = document.getElementById('maestriaDano')?.value.trim();
        const alvo = document.getElementById('maestriaAlvo')?.value;

        const isValid = nome && nivel && dano && alvo;
        
        // Armazenar dados da maestria no creationData
        if (isValid) {
            this.creationData.maestriaCustom = {
                nome,
                nivel,
                bonus: dano, // O campo "dano" se torna o "bonus" no banco
                alvo_primario: alvo
            };
        } else {
            this.creationData.maestriaCustom = null;
        }

        return isValid;
    }

    getMaestryData() {
        const maestria = this.creationData.maestriaCustom;
        if (!maestria) return null;

        return {
            nome: maestria.nome,
            nivel: maestria.nivel,
            bonus: maestria.bonus,
            alvo_primario: maestria.alvo_primario
        };
    }

    loadReactions() {
        const container = document.getElementById('reactionsList');
        if (!container) return;

        container.innerHTML = this.creationData.reactions.map(reaction => `
            <div class="reaction-item" data-id="${reaction.id}" onclick="characterCreationModal.selectReaction(${reaction.id})">
                <h5>${reaction.nome}</h5>
                <p>${reaction.efeito}</p>
            </div>
        `).join('');
    }

    selectReaction(reactionId) {
        this.creationData.selectedReaction = this.creationData.reactions.find(r => r.id == reactionId);
        
        // Update visual selection
        document.querySelectorAll('.reaction-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`.reaction-item[data-id="${reactionId}"]`)?.classList.add('selected');
        
        // Update hidden input
        const input = document.getElementById('selectedReaction');
        if (input) input.value = reactionId;
    }

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showNotification('Por favor, selecione apenas arquivos de imagem', 'error');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('A imagem deve ter no máximo 5MB', 'error');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('crop_square', 'true');
            formData.append('max_size', '400');

            const response = await fetch(window.getBackendPath() + 'upload-image.php', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                // Update preview
                const preview = document.getElementById('imagePreview');
                if (preview) {
                    preview.innerHTML = `<img src="${data.data.base64}" alt="Preview">`;
                }

                // Update hidden input
                const input = document.getElementById('characterImageData');
                if (input) {
                    input.value = data.data.base64;
                }

                this.showNotification('Imagem carregada com sucesso!', 'success');
            } else {
                throw new Error(data.error || 'Erro ao fazer upload da imagem');
            }
        } catch (error) {
            console.error('Erro no upload:', error);
            this.showNotification('Erro ao fazer upload da imagem', 'error');
        }
    }

    generateSummary() {
        const container = document.getElementById('characterSummary');
        if (!container) return;

        const name = document.getElementById('characterName')?.value || 'Sem nome';
        const origin = this.creationData.selectedOrigin;
        const legacy = this.creationData.selectedLegacy;
        const secondaryLegacy = this.creationData.selectedSecondaryLegacy;
        const path = this.creationData.selectedPath;
        const secondaryPath = this.creationData.selectedSecondaryPath;
        const reaction = this.creationData.selectedReaction;
        const mastery = this.creationData.maestriaCustom?.nome || 'Não definida';
        const isHalfRace = this.creationData.isHalfRace;

        container.innerHTML = `
            <div class="summary-section">
                <h4>Informações Básicas</h4>
                <div class="summary-grid">
                    <div class="summary-item">
                        <strong>Nome:</strong>
                        ${name}
                    </div>
                    <div class="summary-item">
                        <strong>Origem:</strong>
                        ${origin?.nome || 'Não selecionada'}
                    </div>
                    <div class="summary-item">
                        <strong>Legado:</strong>
                        ${legacy?.nome || 'Não selecionado'}
                        ${isHalfRace ? ' (Principal)' : ''}
                    </div>
                    ${isHalfRace && secondaryLegacy ? `
                        <div class="summary-item">
                            <strong>Segundo Legado:</strong>
                            ${secondaryLegacy.nome} (Mestiço)
                        </div>
                    ` : ''}
                    <div class="summary-item">
                        <strong>Caminho:</strong>
                        ${path?.nome_caminho || 'Não selecionado'}
                    </div>
                    ${isHalfRace && secondaryPath ? `
                        <div class="summary-item">
                            <strong>Segundo Caminho:</strong>
                            ${secondaryPath.nome_caminho} (Custo +1)
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="summary-section">
                <h4>Atributos</h4>
                <div class="summary-grid">
                    ${Object.entries(this.creationData.attributes).map(([attr, value]) => `
                        <div class="summary-item">
                            <strong>${attr.charAt(0).toUpperCase() + attr.slice(1)}:</strong>
                            ${value >= 0 ? '+' : ''}${value}
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="summary-section">
                <h4>Habilidades e Equipamentos</h4>
                <div class="summary-grid">
                    <div class="summary-item">
                        <strong>Maestria:</strong>
                        ${this.creationData.maestriaCustom ? `
                            ${this.creationData.maestriaCustom.nome} (${this.creationData.maestriaCustom.nivel})
                            <br><small>Dano: ${this.creationData.maestriaCustom.bonus}</small>
                            <br><small>Alvo: ${this.creationData.maestriaCustom.alvo_primario}</small>
                        ` : 'Não definida'}
                    </div>
                    <div class="summary-item">
                        <strong>Reação:</strong>
                        ${reaction?.nome || 'Não selecionada'}
                    </div>
                </div>
            </div>

            ${origin ? `
                <div class="summary-section">
                    <h4>Valores Iniciais (Origem)</h4>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <strong>PV Inicial:</strong>
                            ${origin.pv_inicial}
                        </div>
                        <div class="summary-item">
                            <strong>PE Inicial:</strong>
                            ${origin.pe_inicial}
                        </div>
                        <div class="summary-item">
                            <strong>Bônus de Atributo:</strong>
                            ${origin.atributo_inicial}
                        </div>
                        <div class="summary-item">
                            <strong>Ocupação:</strong>
                            ${origin.ocupacao_inicial || 'Nenhuma'}
                        </div>
                    </div>
                </div>
            ` : ''}
        `;
    }

    async validateCampaignCode(codigo) {
        const validationDiv = document.getElementById('campaignValidation');
        const hiddenInput = document.getElementById('characterCampaign');
        
        if (!codigo || codigo.trim() === '') {
            validationDiv.style.display = 'none';
            hiddenInput.value = '';
            return;
        }
        
        validationDiv.style.display = 'block';
        validationDiv.className = 'campaign-validation loading';
        validationDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando código...';
        
        try {
            const response = await window.makeBackendRequest('validate-campaign.php', {
                method: 'POST',
                body: JSON.stringify({ codigo_convite: codigo.trim() })
            });
            
            const data = await response.json();
            
            if (data.success) {
                validationDiv.className = 'campaign-validation success';
                validationDiv.innerHTML = `
                    <div class="campaign-info">
                        <div class="campaign-name">
                            <i class="fas fa-check-circle"></i> ${data.data.nome}
                        </div>
                        <div class="campaign-master">
                            Mestre: ${data.data.mestre_nome}
                        </div>
                        ${data.data.descricao ? `<div class="campaign-description">${data.data.descricao}</div>` : ''}
                    </div>
                `;
                hiddenInput.value = data.data.id;
            } else {
                validationDiv.className = 'campaign-validation error';
                validationDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${data.error}`;
                hiddenInput.value = '';
            }
        } catch (error) {
            console.error('Erro ao validar código de campanha:', error);
            validationDiv.className = 'campaign-validation error';
            validationDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Erro ao verificar código';
            hiddenInput.value = '';
        }
    }

    validateStep() {
        switch (this.currentStep) {
            case 1:
                const name = document.getElementById('characterName')?.value?.trim();
                if (!name) {
                    this.showNotification('Por favor, digite o nome do personagem', 'error');
                    return false;
                }
                break;
            case 2:
                if (!this.creationData.selectedOrigin) {
                    this.showNotification('Por favor, selecione uma origem', 'error');
                    return false;
                }
                break;
            case 3:
                if (!this.creationData.selectedLegacy) {
                    this.showNotification('Por favor, selecione um legado principal', 'error');
                    return false;
                }
                if (this.creationData.isHalfRace && !this.creationData.selectedSecondaryLegacy) {
                    this.showNotification('Por favor, selecione um segundo legado para mestiço', 'error');
                    return false;
                }
                break;
            case 4:
                if (!this.creationData.selectedPath) {
                    this.showNotification('Por favor, selecione um caminho principal', 'error');
                    return false;
                }
                if (this.creationData.isHalfRace && !this.creationData.selectedSecondaryPath) {
                    this.showNotification('Por favor, selecione um caminho secundário para mestiço', 'error');
                    return false;
                }
                break;
            case 5:
                const negativeCount = Object.values(this.creationData.attributes).filter(v => v < 0).length;
                const maxPoints = this.creationData.maxPoints + negativeCount;
                const remaining = maxPoints - this.creationData.pointsUsed;
                
                if (remaining !== 0) {
                    if (remaining > 0) {
                        this.showNotification(`Você ainda tem ${remaining} ponto(s) para distribuir`, 'error');
                    } else {
                        this.showNotification(`Você excedeu em ${Math.abs(remaining)} ponto(s)`, 'error');
                    }
                    return false;
                }
                
                // Validar soma total dos atributos
                const totalSum = Object.values(this.creationData.attributes).reduce((sum, val) => sum + val, 0);
                if (totalSum !== 4) {
                    this.showNotification(`A soma dos atributos deve ser 4, atual: ${totalSum}`, 'error');
                    return false;
                }
                break;
            case 6:
                const mastery = this.validateMaestryForm();
                const reaction = this.creationData.selectedReaction;
                if (!mastery || !reaction) {
                    this.showNotification('Por favor, selecione uma maestria e uma reação', 'error');
                    return false;
                }
                break;
        }
        return true;
    }

    nextStep() {
        if (!this.validateStep()) return;
        
        if (this.currentStep < this.maxSteps) {
            this.currentStep++;
            this.updateStepDisplay();
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    }

    async createCharacter() {
        if (!this.validateStep()) return;

        try {
            const userSession = this.getUserSession();
            if (!userSession) {
                throw new Error('Sessão do usuário não encontrada');
            }

            const formData = {
                usuario_id: userSession.user_id,
                nome: document.getElementById('characterName').value.trim(),
                foto_url: document.getElementById('characterImageData').value || null,
                campanha_id: document.getElementById('characterCampaign').value || null,
                origem_id: parseInt(this.creationData.selectedOrigin.id),
                legado_id: parseInt(this.creationData.selectedLegacy.id),
                caminho_legado_id: parseInt(this.creationData.selectedPath.id),
                reacao_id: parseInt(this.creationData.selectedReaction.id),
                maestria_equipamento: this.getMaestryData(),
                atributos: this.creationData.attributes
            };

            // Add secondary legacy and path for mestizo
            if (this.creationData.isHalfRace && this.creationData.selectedSecondaryLegacy) {
                formData.legado_secundario_id = parseInt(this.creationData.selectedSecondaryLegacy.id);
                if (this.creationData.selectedSecondaryPath) {
                    formData['legado__caminho_id'] = parseInt(this.creationData.selectedSecondaryPath.id);
                }
            }

            const response = await fetch(getBackendPath() + 'create-character.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Personagem criado com sucesso!', 'success');
                this.closeModal();
                
                // Reload characters list
                if (window.charactersManager) {
                    window.charactersManager.loadCharacters();
                }
            } else {
                throw new Error(data.error || 'Erro ao criar personagem');
            }
        } catch (error) {
            console.error('Erro ao criar personagem:', error);
            this.showNotification('Erro ao criar personagem: ' + error.message, 'error');
        }
    }

    getUserSession() {
        let session = localStorage.getItem('oblivion_user_session');
        if (!session) {
            session = sessionStorage.getItem('oblivion_user_session');
        }
        
        try {
            return session ? JSON.parse(session) : null;
        } catch (e) {
            return null;
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 1rem;
            z-index: 10000;
            max-width: 300px;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;

        if (type === 'success') {
            notification.style.borderColor = '#28a745';
            notification.style.color = '#28a745';
        } else if (type === 'error') {
            notification.style.borderColor = '#dc3545';
            notification.style.color = '#dc3545';
        }

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);

        // Close button
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            });
        }
    }
}

// Initialize global instance
window.characterCreationModal = new CharacterCreationModal();
