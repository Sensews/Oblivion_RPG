/**
 * JavaScript para funcionalidades de Login e Recuperação de Senha
 */

class LoginHandler {
    constructor() {
        this.isSubmitting = false;
        this.isRecoverySubmitting = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupPasswordToggle();
        this.checkForMessages();
    }

    checkForMessages() {
        const urlParams = new URLSearchParams(window.location.search);
        const message = urlParams.get('message');
        const error = urlParams.get('error');
        
        if (message === 'password_reset_success') {
            this.showSuccess('Senha redefinida com sucesso! Você já pode fazer login');
            // Limpar a URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        if (error) {
            this.showError(decodeURIComponent(error));
            // Limpar a URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    bindEvents() {
        // Form de login
        const loginForm = document.getElementById('registerForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Modal de recuperação de senha
        const forgotPasswordLink = document.getElementById('forgotPasswordLink');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => this.openRecoveryModal(e));
        }

        // Form de recuperação de senha
        const recoveryForm = document.getElementById('recoveryForm');
        if (recoveryForm) {
            recoveryForm.addEventListener('submit', (e) => this.handlePasswordRecovery(e));
        }

        // Fechar modal
        const closeModal = document.getElementById('closeModal');
        const cancelRecovery = document.getElementById('btnCancelRecovery');
        const modalBackdrop = document.getElementById('modalBackdrop');

        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeRecoveryModal());
        }
        if (cancelRecovery) {
            cancelRecovery.addEventListener('click', () => this.closeRecoveryModal());
        }
        if (modalBackdrop) {
            modalBackdrop.addEventListener('click', () => this.closeRecoveryModal());
        }

        // Tecla ESC para fechar modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeRecoveryModal();
            }
        });
    }

    setupPasswordToggle() {
        const togglePassword = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('password');

        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                const icon = togglePassword.querySelector('i');
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            });
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        if (this.isSubmitting) return;
        
        this.isSubmitting = true;
        this.showLoading(true);
        this.clearErrors();

        try {
            const formData = new FormData(e.target);
            const loginField = formData.get('loginField');
            const password = formData.get('password');
            const rememberMe = formData.get('rememberMe') === 'on';

            // Validação básica
            if (!loginField || !password) {
                throw new Error('Por favor, preencha todos os campos obrigatórios');
            }

            const response = await fetch('../../backend/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    loginField: loginField.trim(),
                    password: password,
                    rememberMe: rememberMe
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao fazer login');
            }

            if (data.success) {
                this.showSuccess('Login realizado com sucesso!');
                
                // Criar objeto de sessão no formato esperado pelo dashboard
                const sessionData = {
                    user_id: data.user.id,
                    token: data.token,
                    expires_at: data.expires_at,
                    user: data.user,
                    user_type: data.user.tipo_perfil || 'jogador'
                };
                
                // Armazenar dados de autenticação
                if (rememberMe) {
                    localStorage.setItem('oblivion_user_session', JSON.stringify(sessionData));
                } else {
                    sessionStorage.setItem('oblivion_user_session', JSON.stringify(sessionData));
                }

                // Redirecionar após 1 segundo
                setTimeout(() => {
                    window.location.href = data.redirect || '../pages/dashboard.html';
                }, 1000);
            } else {
                throw new Error(data.message || 'Erro ao fazer login');
            }

        } catch (error) {
            console.error('Erro no login:', error);
            this.showError(error.message);
        } finally {
            this.isSubmitting = false;
            this.showLoading(false);
        }
    }

    openRecoveryModal(e) {
        e.preventDefault();
        const modal = document.getElementById('recoveryModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            // Focar no campo de email
            const emailInput = document.getElementById('recoveryEmail');
            if (emailInput) {
                setTimeout(() => emailInput.focus(), 300);
            }
        }
    }

    closeRecoveryModal() {
        const modal = document.getElementById('recoveryModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }, 300);
            
            // Limpar formulário
            const form = document.getElementById('recoveryForm');
            if (form) {
                form.reset();
                this.clearRecoveryMessages();
            }
        }
    }

    async handlePasswordRecovery(e) {
        e.preventDefault();
        
        if (this.isRecoverySubmitting) return;
        
        this.isRecoverySubmitting = true;
        this.showRecoveryLoading(true);
        this.clearRecoveryMessages();

        try {
            const formData = new FormData(e.target);
            const email = formData.get('recoveryEmail');

            // Validação básica
            if (!email) {
                throw new Error('Por favor, digite seu email');
            }

            if (!this.isValidEmail(email)) {
                throw new Error('Por favor, digite um email válido');
            }

            const response = await fetch('../../backend/forgot-password.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.trim()
                })
            });

            const responseText = await response.text();

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                throw new Error('Resposta inválida do servidor: ' + responseText.substring(0, 100));
            }

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao enviar email de recuperação');
            }

            if (data.success) {
                this.showRecoverySuccess('Email de recuperação enviado com sucesso! Verifique sua caixa de entrada.');
                
                // Fechar modal após 3 segundos
                setTimeout(() => {
                    this.closeRecoveryModal();
                }, 3000);
            } else {
                throw new Error(data.message || 'Erro ao enviar email de recuperação');
            }

        } catch (error) {
            console.error('Erro na recuperação de senha:', error);
            this.showRecoveryError(error.message);
        } finally {
            this.isRecoverySubmitting = false;
            this.showRecoveryLoading(false);
        }
    }

    showLoading(show) {
        const submitBtn = document.getElementById('submitBtn');
        const loadingSpinner = document.getElementById('loadingSpinner');
        const btnText = submitBtn.querySelector('.btn-text');

        if (show) {
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            if (btnText) btnText.style.opacity = '0';
            if (loadingSpinner) loadingSpinner.style.display = 'block';
        } else {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            if (btnText) btnText.style.opacity = '1';
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        }
    }

    showRecoveryLoading(show) {
        const submitBtn = document.getElementById('btnSendRecovery');
        const loadingSpinner = document.getElementById('recoveryLoadingSpinner');
        const btnText = submitBtn.querySelector('.btn-text');

        if (show) {
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            if (btnText) btnText.style.opacity = '0';
            if (loadingSpinner) loadingSpinner.style.display = 'block';
        } else {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            if (btnText) btnText.style.opacity = '1';
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        }
    }

    showSuccess(message) {
        const successElement = document.getElementById('successMessage');
        if (successElement) {
            successElement.textContent = message;
            successElement.style.display = 'flex';
            successElement.classList.add('show');
        }
    }

    showError(message) {
        const errorElement = document.getElementById('generalError');
        if (errorElement) {
            errorElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
            errorElement.style.display = 'block';
            errorElement.classList.add('show');
            
            // Auto-hide após 8 segundos
            setTimeout(() => {
                errorElement.classList.remove('show');
                setTimeout(() => {
                    errorElement.style.display = 'none';
                    errorElement.innerHTML = '';
                }, 300);
            }, 8000);
        }
    }

    showRecoverySuccess(message) {
        const successElement = document.getElementById('recoverySuccess');
        if (successElement) {
            successElement.textContent = message;
            successElement.style.display = 'block';
            successElement.classList.add('show');
        }
    }

    showRecoveryError(message) {
        const errorElement = document.getElementById('recoveryError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    clearErrors() {
        const generalError = document.getElementById('generalError');
        const successMessage = document.getElementById('successMessage');
        
        if (generalError) {
            generalError.classList.remove('show');
            generalError.style.display = 'none';
            generalError.textContent = '';
        }
        if (successMessage) {
            successMessage.style.display = 'none';
            successMessage.classList.remove('show');
        }
    }

    clearRecoveryMessages() {
        const errorElement = document.getElementById('recoveryError');
        const successElement = document.getElementById('recoverySuccess');
        
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }
        if (successElement) {
            successElement.style.display = 'none';
            successElement.classList.remove('show');
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new LoginHandler();
});
