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
                this.showSuccess();
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