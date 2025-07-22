/**
 * JavaScript para a página de redefinição de senha
 */

class ResetPasswordHandler {
    constructor() {
        this.token = null;
        this.isSubmitting = false;
        this.passwordCriteria = {
            length: false,
            uppercase: false,
            lowercase: false,
            number: false,
            special: false
        };
        this.init();
    }

    init() {
        this.extractTokenFromURL();
        this.bindEvents();
        this.setupPasswordToggle();
        this.validateToken();
    }

    extractTokenFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        this.token = urlParams.get('token');
        
        if (!this.token) {
            this.showError('Token de recuperação não encontrado na URL');
            return;
        }
    }

    async validateToken() {
        if (!this.token) {
            this.showError('Token de recuperação não encontrado');
            return;
        }

        try {
            const response = await fetch('../../backend/validate-reset-token.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: this.token
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao validar token');
            }

            if (data.success) {
                this.showResetForm();
            } else {
                this.showError(data.message || 'Token inválido');
            }

        } catch (error) {
            console.error('Erro ao validar token:', error);
            this.showError(error.message);
        }
    }

    bindEvents() {
        // Form de redefinição
        const resetForm = document.getElementById('resetPasswordForm');
        if (resetForm) {
            resetForm.addEventListener('submit', (e) => this.handleResetPassword(e));
        }

        // Validação em tempo real da senha
        const newPasswordInput = document.getElementById('newPassword');
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', (e) => this.validatePassword(e.target.value));
            newPasswordInput.addEventListener('blur', () => this.checkPasswordMatch());
        }

        // Validação da confirmação de senha
        const confirmPasswordInput = document.getElementById('confirmPassword');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => this.checkPasswordMatch());
            confirmPasswordInput.addEventListener('blur', () => this.checkPasswordMatch());
        }

        // Botão para solicitar novo token
        const requestNewToken = document.getElementById('requestNewToken');
        if (requestNewToken) {
            requestNewToken.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'login.html';
            });
        }
    }

    setupPasswordToggle() {
        // Toggle para nova senha
        const toggleNewPassword = document.getElementById('toggleNewPassword');
        const newPasswordInput = document.getElementById('newPassword');

        if (toggleNewPassword && newPasswordInput) {
            toggleNewPassword.addEventListener('click', () => {
                const type = newPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                newPasswordInput.setAttribute('type', type);
                
                const icon = toggleNewPassword.querySelector('i');
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            });
        }

        // Toggle para confirmação de senha
        const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');

        if (toggleConfirmPassword && confirmPasswordInput) {
            toggleConfirmPassword.addEventListener('click', () => {
                const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                confirmPasswordInput.setAttribute('type', type);
                
                const icon = toggleConfirmPassword.querySelector('i');
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            });
        }
    }

    validatePassword(password) {
        // Critérios de validação
        this.passwordCriteria.length = password.length >= 8;
        this.passwordCriteria.uppercase = /[A-Z]/.test(password);
        this.passwordCriteria.lowercase = /[a-z]/.test(password);
        this.passwordCriteria.number = /\d/.test(password);
        this.passwordCriteria.special = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        // Atualizar interface dos critérios
        this.updatePasswordCriteria();

        // Calcular força da senha
        this.updatePasswordStrength(password);
    }

    updatePasswordCriteria() {
        Object.keys(this.passwordCriteria).forEach(criterion => {
            const element = document.querySelector(`[data-criterion="${criterion}"]`);
            if (element) {
                const icon = element.querySelector('i');
                const isValid = this.passwordCriteria[criterion];
                
                element.classList.toggle('valid', isValid);
                icon.className = isValid ? 'fas fa-check' : 'fas fa-times';
            }
        });
    }

    updatePasswordStrength(password) {
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');
        
        if (!strengthFill || !strengthText) return;

        const validCriteria = Object.values(this.passwordCriteria).filter(Boolean).length;
        const strength = (validCriteria / 5) * 100;

        let strengthLevel = '';
        let strengthColor = '';

        if (password.length === 0) {
            strengthLevel = 'Digite uma senha';
            strengthColor = '#64748b';
        } else if (validCriteria <= 1) {
            strengthLevel = 'Muito fraca';
            strengthColor = '#ef4444';
        } else if (validCriteria <= 2) {
            strengthLevel = 'Fraca';
            strengthColor = '#f97316';
        } else if (validCriteria <= 3) {
            strengthLevel = 'Média';
            strengthColor = '#eab308';
        } else if (validCriteria <= 4) {
            strengthLevel = 'Forte';
            strengthColor = '#22c55e';
        } else {
            strengthLevel = 'Muito forte';
            strengthColor = '#16a34a';
        }

        strengthFill.style.width = `${strength}%`;
        strengthFill.style.backgroundColor = strengthColor;
        strengthText.textContent = strengthLevel;
        strengthText.style.color = strengthColor;
    }

    checkPasswordMatch() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const confirmPasswordError = document.getElementById('confirm-password-error');

        if (confirmPassword && newPassword !== confirmPassword) {
            confirmPasswordError.textContent = 'As senhas não coincidem';
            confirmPasswordError.style.display = 'block';
            return false;
        } else {
            confirmPasswordError.style.display = 'none';
            return true;
        }
    }

    isPasswordValid() {
        return Object.values(this.passwordCriteria).every(Boolean);
    }

    async handleResetPassword(e) {
        e.preventDefault();
        
        if (this.isSubmitting) return;
        
        this.isSubmitting = true;
        this.showLoading(true);
        this.clearMessages();

        try {
            const formData = new FormData(e.target);
            const newPassword = formData.get('newPassword');
            const confirmPassword = formData.get('confirmPassword');

            // Validações
            if (!newPassword || !confirmPassword) {
                throw new Error('Por favor, preencha todos os campos');
            }

            if (!this.isPasswordValid()) {
                throw new Error('A senha não atende aos critérios de segurança');
            }

            if (newPassword !== confirmPassword) {
                throw new Error('As senhas não coincidem');
            }

            const response = await fetch('../../backend/reset-password.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: this.token,
                    newPassword: newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao redefinir senha');
            }

            if (data.success) {
                this.showSuccess('Senha redefinida com sucesso!');
                
                // Redirecionar para login após 2 segundos
                setTimeout(() => {
                    window.location.href = 'login.html?message=password_reset_success';
                }, 2000);
            } else {
                throw new Error(data.message || 'Erro ao redefinir senha');
            }

        } catch (error) {
            console.error('Erro ao redefinir senha:', error);
            this.showGeneralError(error.message);
        } finally {
            this.isSubmitting = false;
            this.showLoading(false);
        }
    }

    showResetForm() {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('errorScreen').style.display = 'none';
        document.getElementById('resetPasswordForm').style.display = 'block';
    }

    showError(message) {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('resetPasswordForm').style.display = 'none';
        
        const errorScreen = document.getElementById('errorScreen');
        const errorMessage = document.getElementById('errorMessage');
        
        errorMessage.textContent = message;
        errorScreen.style.display = 'block';
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

    showSuccess(message) {
        const successElement = document.getElementById('successMessage');
        if (successElement) {
            successElement.querySelector('span').textContent = message;
            successElement.style.display = 'flex';
            successElement.classList.add('show');
        }
    }

    showGeneralError(message) {
        const errorElement = document.getElementById('generalError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    clearMessages() {
        const generalError = document.getElementById('generalError');
        const successMessage = document.getElementById('successMessage');
        
        if (generalError) {
            generalError.style.display = 'none';
            generalError.textContent = '';
        }
        if (successMessage) {
            successMessage.style.display = 'none';
            successMessage.classList.remove('show');
        }
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new ResetPasswordHandler();
});
