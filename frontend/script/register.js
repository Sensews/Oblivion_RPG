class RegisterForm {
    constructor() {
        this.form = document.getElementById('registerForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.successMessage = document.getElementById('successMessage');
        this.generalError = document.getElementById('generalError');
        
        // Elementos do medidor de força da senha
        this.passwordStrength = document.getElementById('passwordStrength');
        this.strengthFill = document.getElementById('strengthFill');
        this.strengthText = document.getElementById('strengthText');
        
        // Modal de verificação
        this.verificationModal = new VerificationModal();
        
        this.fields = {
            username: document.getElementById('username'),
            email: document.getElementById('email'),
            password: document.getElementById('password'),
            confirmPassword: document.getElementById('confirmPassword'),
            profileType: document.getElementsByName('profileType')
        };
        
        this.errorElements = {
            username: document.getElementById('username-error'),
            email: document.getElementById('email-error'),
            password: document.getElementById('password-error'),
            confirmPassword: document.getElementById('confirm-password-error')
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupPasswordToggle();
        this.setupValidation();
        this.initializePasswordStrength();
    }
    
    initializePasswordStrength() {
        // Inicializar o medidor no estado vazio
        this.passwordStrength.classList.add('empty');
        const strengthBar = document.querySelector('.strength-bar');
        const strengthText = document.querySelector('.strength-text');
        strengthBar.classList.remove('show');
        strengthText.classList.remove('show');
    }
    
    setupEventListeners() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // Validação em tempo real
        Object.keys(this.fields).forEach(fieldName => {
            if (fieldName !== 'profileType') {
                this.fields[fieldName].addEventListener('blur', () => {
                    this.validateField(fieldName);
                });
                
                this.fields[fieldName].addEventListener('input', () => {
                    this.clearFieldError(fieldName);
                });
            }
        });
    }
    
    setupPasswordToggle() {
        const toggleButtons = document.querySelectorAll('.toggle-password');
        
        toggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                const input = button.previousElementSibling;
                const icon = button.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    }
    
    setupValidation() {
        // Validação de confirmação de senha em tempo real
        this.fields.confirmPassword.addEventListener('input', () => {
            if (this.fields.confirmPassword.value && 
                this.fields.password.value !== this.fields.confirmPassword.value) {
                this.showFieldError('confirmPassword', 'As senhas não coincidem');
            } else {
                this.clearFieldError('confirmPassword');
            }
        });
        
        // Medidor de força da senha
        this.fields.password.addEventListener('input', () => {
            this.updatePasswordStrength(this.fields.password.value);
        });
    }
    
    validateField(fieldName) {
        const field = this.fields[fieldName];
        const value = field.value.trim();
        
        switch (fieldName) {
            case 'username':
                return this.validateUsername(value);
            case 'email':
                return this.validateEmail(value);
            case 'password':
                return this.validatePassword(value);
            case 'confirmPassword':
                return this.validateConfirmPassword(value);
            default:
                return true;
        }
    }
    
    validateUsername(username) {
        if (!username) {
            this.showFieldError('username', 'Nome de usuário é obrigatório');
            return false;
        }
        
        if (username.length < 3) {
            this.showFieldError('username', 'Nome de usuário deve ter pelo menos 3 caracteres');
            return false;
        }
        
        if (username.length > 50) {
            this.showFieldError('username', 'Nome de usuário deve ter no máximo 50 caracteres');
            return false;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.showFieldError('username', 'Nome de usuário pode conter apenas letras, números e underscore');
            return false;
        }
        
        this.clearFieldError('username');
        return true;
    }
    
    validateEmail(email) {
        if (!email) {
            this.showFieldError('email', 'Email é obrigatório');
            return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showFieldError('email', 'Email inválido');
            return false;
        }
        
        this.clearFieldError('email');
        return true;
    }
    
    validatePassword(password) {
        if (!password) {
            this.showFieldError('password', 'Senha é obrigatória');
            return false;
        }
        
        if (password.length < 6) {
            this.showFieldError('password', 'Senha deve ter pelo menos 6 caracteres');
            return false;
        }
        
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            this.showFieldError('password', 'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número');
            return false;
        }
        
        this.clearFieldError('password');
        return true;
    }
    
    validateConfirmPassword(confirmPassword) {
        if (!confirmPassword) {
            this.showFieldError('confirmPassword', 'Confirmação de senha é obrigatória');
            return false;
        }
        
        if (confirmPassword !== this.fields.password.value) {
            this.showFieldError('confirmPassword', 'As senhas não coincidem');
            return false;
        }
        
        this.clearFieldError('confirmPassword');
        return true;
    }
    
    /**
     * Calcula e atualiza o medidor de força da senha
     */
    updatePasswordStrength(password) {
        const strengthBar = document.querySelector('.strength-bar');
        const strengthText = document.querySelector('.strength-text');
        
        if (!password) {
            // Senha vazia - esconder conteúdo mas manter espaço
            this.passwordStrength.classList.remove('show');
            this.passwordStrength.classList.add('empty');
            strengthBar.classList.remove('show');
            strengthText.classList.remove('show');
            
            // Remover classes anteriores
            this.strengthFill.className = 'strength-fill';
            this.strengthText.className = 'strength-text';
            this.strengthText.textContent = '';
            return;
        }
        
        // Senha presente - mostrar medidor
        this.passwordStrength.classList.add('show');
        this.passwordStrength.classList.remove('empty');
        strengthBar.classList.add('show');
        strengthText.classList.add('show');
        
        const strength = this.calculatePasswordStrength(password);
        
        // Remover classes anteriores
        this.strengthFill.className = 'strength-fill';
        this.strengthText.className = 'strength-text';
        
        // Adicionar nova classe baseada na força
        this.strengthFill.classList.add(strength.level);
        this.strengthText.classList.add(strength.level, 'show');
        this.strengthText.textContent = strength.text;
    }
    
    /**
     * Calcula a força da senha
     */
    calculatePasswordStrength(password) {
        let score = 0;
        let feedback = [];
        
        // Critérios de pontuação
        if (password.length >= 8) {
            score += 25;
        } else {
            feedback.push('pelo menos 8 caracteres');
        }
        
        if (/[a-z]/.test(password)) {
            score += 15;
        } else {
            feedback.push('letras minúsculas');
        }
        
        if (/[A-Z]/.test(password)) {
            score += 15;
        } else {
            feedback.push('letras maiúsculas');
        }
        
        if (/\d/.test(password)) {
            score += 15;
        } else {
            feedback.push('números');
        }
        
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            score += 20;
            feedback = feedback.filter(item => item !== 'caracteres especiais');
        } else {
            feedback.push('caracteres especiais');
        }
        
        // Bonificações
        if (password.length >= 12) score += 10;
        if (/(.)\1{2,}/.test(password)) score -= 15; // Penaliza repetições
        if (/012|123|234|345|456|567|678|789|890|abc|bcd|cde|def/.test(password.toLowerCase())) {
            score -= 10; // Penaliza sequências
        }
        
        // Determinar nível e texto
        if (score < 30) {
            return {
                level: 'weak',
                text: `Fraca - Adicione: ${feedback.slice(0, 2).join(', ')}`
            };
        } else if (score < 60) {
            return {
                level: 'fair',
                text: feedback.length > 0 ? `Regular - Adicione: ${feedback.slice(0, 1).join(', ')}` : 'Regular'
            };
        } else if (score < 85) {
            return {
                level: 'good',
                text: 'Boa - Senha segura'
            };
        } else {
            return {
                level: 'strong',
                text: 'Forte - Excelente segurança!'
            };
        }
    }
    
    showFieldError(fieldName, message) {
        const errorElement = this.errorElements[fieldName];
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }
    
    clearFieldError(fieldName) {
        const errorElement = this.errorElements[fieldName];
        if (errorElement) {
            errorElement.classList.remove('show');
            setTimeout(() => {
                if (!errorElement.classList.contains('show')) {
                    errorElement.textContent = '';
                }
            }, 300);
        }
    }
    
    clearAllErrors() {
        Object.keys(this.errorElements).forEach(fieldName => {
            this.clearFieldError(fieldName);
        });
        this.hideGeneralError();
    }
    
    showGeneralError(message) {
        this.generalError.textContent = message;
        this.generalError.classList.add('show');
    }
    
    hideGeneralError() {
        this.generalError.classList.remove('show');
        // Limpar o texto após a animação
        setTimeout(() => {
            if (!this.generalError.classList.contains('show')) {
                this.generalError.textContent = '';
            }
        }, 300);
    }
    
    showSuccess() {
        this.successMessage.classList.add('show');
        setTimeout(() => {
            // Redirecionar para página de login após 2 segundos
            window.location.href = 'login.html';
        }, 2000);
    }
    
    setLoading(loading) {
        if (loading) {
            this.submitBtn.classList.add('loading');
            this.submitBtn.disabled = true;
        } else {
            this.submitBtn.classList.remove('loading');
            this.submitBtn.disabled = false;
        }
    }
    
    getSelectedProfileType() {
        const selectedRadio = Array.from(this.fields.profileType).find(radio => radio.checked);
        return selectedRadio ? selectedRadio.value : 'jogador';
    }
    
    validateForm() {
        let isValid = true;
        
        // Validar todos os campos
        Object.keys(this.fields).forEach(fieldName => {
            if (fieldName !== 'profileType') {
                if (!this.validateField(fieldName)) {
                    isValid = false;
                }
            }
        });
        
        return isValid;
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        this.clearAllErrors();
        
        if (!this.validateForm()) {
            return;
        }
        
        const formData = {
            username: this.fields.username.value.trim(),
            email: this.fields.email.value.trim(),
            password: this.fields.password.value,
            profileType: this.getSelectedProfileType()
        };
        
        this.setLoading(true);
        
        try {
            const response = await fetch('../../backend/register.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (result.verification_required) {
                    // Mostrar modal de verificação
                    this.verificationModal.show(result.user_id, result.email);
                } else {
                    this.showSuccess();
                }
            } else {
                if (result.field) {
                    this.showFieldError(result.field, result.message);
                } else {
                    this.showGeneralError(result.message || 'Erro ao criar conta. Tente novamente.');
                }
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            this.showGeneralError('Erro de conexão. Verifique sua internet e tente novamente.');
        } finally {
            this.setLoading(false);
        }
    }
}

/**
 * Classe para gerenciar o modal de verificação de email
 */
class VerificationModal {
    constructor() {
        this.modal = document.getElementById('verificationModal');
        this.emailDisplay = document.getElementById('emailDisplay');
        this.verificationCodeInput = document.getElementById('verificationCode');
        this.verificationError = document.getElementById('verificationError');
        this.timeRemaining = document.getElementById('timeRemaining');
        
        this.btnVerify = document.getElementById('btnVerify');
        this.btnResend = document.getElementById('btnResend');
        this.btnCancel = document.getElementById('btnCancel');
        
        this.userId = null;
        this.email = '';
        this.countdownTimer = null;
        this.expirationTime = null;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Verificar código
        this.btnVerify.addEventListener('click', () => this.verifyCode());
        
        // Reenviar código
        this.btnResend.addEventListener('click', () => this.resendCode());
        
        // Cancelar
        this.btnCancel.addEventListener('click', () => this.cancel());
        
        // Enter no input de código
        this.verificationCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.verifyCode();
            }
        });
        
        // Formatar input de código (apenas números)
        this.verificationCodeInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 6) value = value.slice(0, 6);
            e.target.value = value;
            
            // Auto-verificar quando chegar a 6 dígitos
            if (value.length === 6) {
                setTimeout(() => this.verifyCode(), 500);
            }
        });
        
        // Fechar modal ao clicar no backdrop
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal || e.target.classList.contains('modal-backdrop')) {
                this.cancel();
            }
        });
        
        // ESC para fechar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('show')) {
                this.cancel();
            }
        });
    }
    
    show(userId, email) {
        this.userId = userId;
        this.email = email;
        this.emailDisplay.textContent = email;
        
        // Mostrar modal
        this.modal.classList.add('show');
        document.body.classList.add('modal-open');
        
        // Focar no input
        setTimeout(() => {
            this.verificationCodeInput.focus();
        }, 300);
        
        // Iniciar countdown
        this.startCountdown();
        
        // Limpar campos
        this.clearMessages();
        this.verificationCodeInput.value = '';
    }
    
    hide() {
        this.modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
    }
    
    async verifyCode() {
        const code = this.verificationCodeInput.value.trim();
        
        if (code.length !== 6) {
            this.showError('Por favor, digite o código de 6 dígitos');
            return;
        }
        
        this.setVerifyLoading(true);
        this.clearMessages();
        
        try {
            const response = await fetch('../../backend/verify.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'verify',
                    user_id: this.userId,
                    code: code
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Email verificado com sucesso!');
                
                setTimeout(() => {
                    this.hide();
                    // Mostrar mensagem de sucesso na página principal
                    const registerForm = document.querySelector('.register-form');
                    if (registerForm) {
                        const successMessage = document.getElementById('successMessage');
                        if (successMessage) {
                            successMessage.textContent = 'Conta criada e verificada com sucesso! Redirecionando...';
                            successMessage.classList.add('show');
                        }
                    }
                    
                    // Redirecionar para login após 2 segundos
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                }, 1500);
                
            } else {
                if (result.expired) {
                    this.showError(result.message);
                    setTimeout(() => {
                        this.hide();
                        window.location.reload();
                    }, 3000);
                } else {
                    this.showError(result.message || 'Código incorreto. Tente novamente.');
                    this.verificationCodeInput.value = '';
                    this.verificationCodeInput.focus();
                }
            }
            
        } catch (error) {
            console.error('Erro ao verificar código:', error);
            this.showError('Erro de conexão. Tente novamente.');
        } finally {
            this.setVerifyLoading(false);
        }
    }
    
    async resendCode() {
        this.setResendLoading(true);
        this.clearMessages();
        
        try {
            const response = await fetch('../../backend/verify.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'resend',
                    user_id: this.userId
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Novo código enviado! Verifique seu email.');
                this.verificationCodeInput.value = '';
                this.startCountdown(); // Reiniciar countdown
            } else {
                this.showError(result.message || 'Erro ao reenviar código. Tente novamente.');
            }
            
        } catch (error) {
            console.error('Erro ao reenviar código:', error);
            this.showError('Erro de conexão. Tente novamente.');
        } finally {
            this.setResendLoading(false);
        }
    }
    
    async cancel() {
        if (confirm('Tem certeza que deseja cancelar o registro? Sua conta será removida.')) {
            try {
                await fetch('../../backend/verify.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'cancel',
                        user_id: this.userId
                    })
                });
            } catch (error) {
                console.error('Erro ao cancelar registro:', error);
            }
            
            this.hide();
            window.location.reload();
        }
    }
    
    startCountdown() {
        // 15 minutos em segundos
        let timeLeft = 15 * 60;
        
        this.updateTimeDisplay(timeLeft);
        
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
        }
        
        this.countdownTimer = setInterval(() => {
            timeLeft--;
            this.updateTimeDisplay(timeLeft);
            
            if (timeLeft <= 0) {
                clearInterval(this.countdownTimer);
                this.showError('Código expirado. A conta foi removida.');
                setTimeout(() => {
                    this.hide();
                    window.location.reload();
                }, 3000);
            }
        }, 1000);
    }
    
    updateTimeDisplay(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const display = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        
        this.timeRemaining.textContent = display;
        
        // Adicionar classe de warning quando restam menos de 2 minutos
        if (seconds <= 120) {
            this.timeRemaining.classList.add('warning');
        } else {
            this.timeRemaining.classList.remove('warning');
        }
    }
    
    showError(message) {
        this.verificationError.textContent = message;
        this.verificationError.classList.add('show');
    }
    
    showSuccess(message) {
        // Criar elemento de sucesso se não existir
        let successElement = document.querySelector('.verification-success');
        if (!successElement) {
            successElement = document.createElement('div');
            successElement.className = 'verification-success';
            this.verificationError.parentNode.insertBefore(successElement, this.verificationError);
        }
        
        successElement.textContent = message;
        successElement.classList.add('show');
        this.verificationError.classList.remove('show');
    }
    
    clearMessages() {
        this.verificationError.classList.remove('show');
        const successElement = document.querySelector('.verification-success');
        if (successElement) {
            successElement.classList.remove('show');
        }
    }
    
    setVerifyLoading(loading) {
        if (loading) {
            this.btnVerify.classList.add('loading');
            this.btnVerify.disabled = true;
            this.btnVerify.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        } else {
            this.btnVerify.classList.remove('loading');
            this.btnVerify.disabled = false;
            this.btnVerify.innerHTML = '<i class="fas fa-check"></i> Confirmar Código';
        }
    }
    
    setResendLoading(loading) {
        if (loading) {
            this.btnResend.disabled = true;
            this.btnResend.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        } else {
            this.btnResend.disabled = false;
            this.btnResend.innerHTML = '<i class="fas fa-paper-plane"></i> Reenviar Código';
        }
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new RegisterForm();
});

// Adicionar efeitos visuais extras
document.addEventListener('DOMContentLoaded', () => {
    // Efeito de focus nos inputs
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });
    
    // Animação de entrada para os elementos do formulário
    const formGroups = document.querySelectorAll('.form-group');
    formGroups.forEach((group, index) => {
        group.style.animationDelay = `${index * 0.1}s`;
        group.style.animation = 'fadeInUp 0.6s ease-out forwards';
    });
});