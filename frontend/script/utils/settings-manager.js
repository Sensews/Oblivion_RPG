/**
 * Gerenciador de Configurações - Oblivion RPG
 * Sistema unificado de configurações para todas as páginas
 */

class SettingsManager {
    constructor() {
        this.settings = {
            theme: 'dark',
            secondaryColor: '#ff6b35'
        };
        this.init();
    }

    init() {
        this.loadSettings();
        this.applySettings();
        this.bindEvents();
    }

    // ================================
    // CARREGAMENTO E SALVAMENTO
    // ================================

    loadSettings() {
        // Carregar configurações dos cookies
        const savedTheme = this.getCookie('oblivion_theme');
        const savedSecondaryColor = this.getCookie('oblivion_secondary_color');

        if (savedTheme) this.settings.theme = savedTheme;
        if (savedSecondaryColor) this.settings.secondaryColor = savedSecondaryColor;

        console.log('Configurações carregadas:', this.settings);
    }

    saveSettings() {
        // Salvar configurações nos cookies (válidos por 1 ano)
        this.setCookie('oblivion_theme', this.settings.theme, 365);
        this.setCookie('oblivion_secondary_color', this.settings.secondaryColor, 365);
        
        console.log('Configurações salvas:', this.settings);
    }

    // ================================
    // APLICAÇÃO DE CONFIGURAÇÕES
    // ================================

    applySettings() {
        // Aplicar tema
        document.body.classList.toggle('light-theme', this.settings.theme === 'light');
        
        // Aplicar cor secundária
        this.applySecondaryColor(this.settings.secondaryColor);
        
        // Atualizar UI do modal se existir
        this.updateSettingsUI();
    }

    applySecondaryColor(color) {
        document.documentElement.style.setProperty('--accent-color', color);
        
        // Converter hex para RGB para usar com rgba()
        const rgb = this.hexToRgb(color);
        if (rgb) {
            document.documentElement.style.setProperty('--accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        }
        
        // Calcular cor de glow baseada na cor escolhida
        const glowColor = this.hexToRgba(color, 0.6);
        document.documentElement.style.setProperty('--glow-color', glowColor);
        
        // Atualizar border-color
        const borderColorDark = this.hexToRgba(color, 0.3);
        const borderColorLight = this.hexToRgba(color, 0.4);
        document.documentElement.style.setProperty('--border-color', borderColorDark);
        document.documentElement.style.setProperty('--light-border-color', borderColorLight);
    }

    updateSettingsUI() {
        // Atualizar radio buttons do tema
        const themeRadios = document.querySelectorAll('input[name="theme"]');
        themeRadios.forEach(radio => {
            radio.checked = radio.value === this.settings.theme;
        });

        // Atualizar color picker e preview
        const colorPicker = document.getElementById('secondaryColorPicker');
        const colorPreview = document.getElementById('colorPreview');
        if (colorPicker && colorPreview) {
            colorPicker.value = this.settings.secondaryColor;
            colorPreview.style.backgroundColor = this.settings.secondaryColor;
        }

        // Atualizar presets de cor
        this.updateColorPresets();
    }

    updateColorPresets() {
        const presets = document.querySelectorAll('.color-preset');
        presets.forEach(preset => {
            const color = preset.dataset.color;
            preset.classList.toggle('active', color === this.settings.secondaryColor);
        });
    }

    resetSettings() {
        this.settings = {
            theme: 'dark',
            secondaryColor: '#ff6b35'
        };
        this.applySettings();
        this.saveSettings();
        this.showNotification('Configurações restauradas para o padrão!', 'success');
    }

    // ================================
    // EVENT LISTENERS
    // ================================

    bindEvents() {
        // Botão de configurações
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettingsModal());
        }

        // Modal de configurações
        this.bindSettingsModalEvents();
    }

    bindSettingsModalEvents() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;

        const backdrop = document.getElementById('settingsBackdrop');
        const closeBtn = document.getElementById('closeSettings');
        const saveBtn = document.getElementById('saveSettings');
        const resetBtn = document.getElementById('resetSettings');

        // Fechar modal
        [backdrop, closeBtn].forEach(element => {
            if (element) {
                element.addEventListener('click', () => this.closeSettingsModal());
            }
        });

        // Salvar configurações
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.handleSaveSettings());
        }

        // Resetar configurações
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Tem certeza que deseja restaurar as configurações padrão?')) {
                    this.resetSettings();
                }
            });
        }

        // Theme toggle
        const themeRadios = document.querySelectorAll('input[name="theme"]');
        themeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.settings.theme = e.target.value;
                this.applySettings();
            });
        });

        // Color picker
        const colorPicker = document.getElementById('secondaryColorPicker');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                this.settings.secondaryColor = e.target.value;
                this.applySettings();
            });
        }

        // Color presets
        const colorPresets = document.querySelectorAll('.color-preset');
        colorPresets.forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                this.settings.secondaryColor = color;
                this.applySettings();
            });
        });

        // Fechar modal com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                this.closeSettingsModal();
            }
        });
    }

    // ================================
    // MODAL DE CONFIGURAÇÕES
    // ================================

    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'block';
            document.body.classList.add('modal-open');
            
            // Pequeno delay para permitir a transição
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        }
    }

    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
            
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }

    handleSaveSettings() {
        this.saveSettings();
        this.showNotification('Configurações salvas com sucesso!', 'success');
        this.closeSettingsModal();
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
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // ================================
    // UTILITÁRIOS
    // ================================

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    setCookie(name, value, days) {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return decodeURIComponent(parts.pop().split(';').shift());
        }
        return null;
    }
}

// Exportar para uso global
window.SettingsManager = SettingsManager;

// Auto-inicializar apenas se não estiver no dashboard (o dashboard tem seu próprio manager)
if (typeof window.DashboardManager === 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Aguardar um pouco para garantir que outros scripts carregaram
        setTimeout(() => {
            if (!window.settingsManager) {
                window.settingsManager = new SettingsManager();
            }
        }, 100);
    });
}
