<?php
/**
 * Classe para envio de emails com PHPMailer
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Carregar PHPMailer (assumindo que está instalado via Composer ou incluído manualmente)
// Se usando Composer: require_once __DIR__ . '/../vendor/autoload.php';
// Se PHPMailer manual: include os arquivos diretamente
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
} else {
    // Fallback para incluir PHPMailer manualmente se necessário
    // Baixe PHPMailer e coloque na pasta vendor/phpmailer/
    require_once __DIR__ . '/../vendor/phpmailer/src/PHPMailer.php';
    require_once __DIR__ . '/../vendor/phpmailer/src/SMTP.php';
    require_once __DIR__ . '/../vendor/phpmailer/src/Exception.php';
}

class EmailService {
    private $mailer;
    private $config;
    
    public function __construct() {
        $this->config = Config::load();
        $this->setupMailer();
    }
    
    private function setupMailer() {
        $this->mailer = new PHPMailer(true);
        
        try {
            // Configurações do servidor SMTP
            $this->mailer->isSMTP();
            $this->mailer->Host = $this->config['mail_host'];
            $this->mailer->SMTPAuth = true;
            $this->mailer->Username = $this->config['mail_username'];
            $this->mailer->Password = $this->config['mail_password'];
            $this->mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $this->mailer->Port = $this->config['mail_port'];
            $this->mailer->CharSet = 'UTF-8';
            
            // Configurações do remetente
            $this->mailer->setFrom(
                $this->config['mail_from_email'], 
                $this->config['mail_from_name']
            );
            
        } catch (Exception $e) {
            error_log('Erro ao configurar mailer: ' . $e->getMessage());
            throw new Exception('Erro na configuração de email');
        }
    }
    
    /**
     * Envia email de verificação com código
     */
    public function enviarEmailVerificacao($email, $nomeUsuario, $codigo) {
        try {
            $this->mailer->addAddress($email, $nomeUsuario);
            
            $this->mailer->isHTML(true);
            $this->mailer->Subject = 'Confirme sua conta - Oblivion RPG';
            
            // Template HTML do email
            $htmlBody = $this->gerarTemplateVerificacao($nomeUsuario, $codigo);
            $this->mailer->Body = $htmlBody;
            
            // Versão texto simples
            $this->mailer->AltBody = $this->gerarTextoSimples($nomeUsuario, $codigo);
            
            $resultado = $this->mailer->send();
            $this->mailer->clearAddresses();
            
            return $resultado;
            
        } catch (Exception $e) {
            error_log('Erro ao enviar email: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Gera template HTML estilizado para verificação
     */
    private function gerarTemplateVerificacao($nomeUsuario, $codigo) {
        return '
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verificação de Email - Oblivion RPG</title>
            <style>
                /* Reset e configurações globais */
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                /* Força modo escuro para todos os clientes de email */
                html, body {
                    background-color: #0f172a !important;
                    background: #0f172a !important;
                    color: #f8fafc !important;
                    color-scheme: dark !important;
                    supported-color-schemes: dark !important;
                }
                
                /* Sobrescreve estilos automáticos de clientes de email */
                [data-ogsc] body,
                [data-ogsc] .email-container,
                [data-outlook-color-schemes] body,
                [data-outlook-color-schemes] .email-container {
                    background-color: #0f172a !important;
                    background: #0f172a !important;
                }
                
                /* Para clientes que suportam media queries de cor */
                @media (prefers-color-scheme: light) {
                    body, html {
                        background-color: #0f172a !important;
                        background: #0f172a !important;
                        color: #f8fafc !important;
                    }
                }
                
                body {
                    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
                    background-color: #0f172a !important;
                    background: #0f172a !important;
                    color: #f8fafc !important;
                    line-height: 1.6;
                    padding: 20px;
                    margin: 0;
                    min-height: 100vh;
                }
                
                .email-container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: #1e293b !important;
                    background-color: #1e293b !important;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
                    border: 2px solid #8b5cf6;
                }
                
                .header {
                    background: #8b5cf6 !important;
                    background-color: #8b5cf6 !important;
                    padding: 30px;
                    text-align: center;
                    position: relative;
                    border-bottom: 3px solid #7c3aed;
                }
                
                .header::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url("data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.1\"%3E%3Cpath d=\"m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
                    opacity: 0.1;
                }
                
                .logo {
                    position: relative;
                    z-index: 1;
                }
                
                .logo h1 {
                    font-size: 2.5rem;
                    font-weight: 800;
                    margin: 0;
                    text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 15px;
                }
                
                .dragon-icon {
                    font-size: 3rem;
                    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
                }
                
                .content {
                    padding: 40px 30px;
                    background: #1e293b !important;
                    background-color: #1e293b !important;
                    color: #f8fafc !important;
                }
                
                .welcome-text {
                    font-size: 1.5rem;
                    margin-bottom: 10px;
                    color: #06b6d4 !important;
                    font-weight: 600;
                }
                
                .message {
                    font-size: 1.1rem;
                    margin-bottom: 30px;
                    color: #cbd5e1 !important;
                    line-height: 1.7;
                }
                
                .code-container {
                    background: #8b5cf6 !important;
                    background-color: #8b5cf6 !important;
                    border-radius: 12px;
                    padding: 30px;
                    text-align: center;
                    margin: 30px 0;
                    position: relative;
                    overflow: hidden;
                    border: 3px solid #7c3aed;
                }
                
                .code-container::before {
                    content: "";
                    position: absolute;
                    top: -2px;
                    left: -2px;
                    right: -2px;
                    bottom: -2px;
                    background: linear-gradient(45deg, #8b5cf6, #06b6d4, #8b5cf6);
                    border-radius: 12px;
                    z-index: -1;
                    animation: borderGlow 3s ease-in-out infinite;
                }
                
                @keyframes borderGlow {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
                
                .code-label {
                    font-size: 1rem;
                    margin-bottom: 15px;
                    color: #ffffff !important;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                .verification-code {
                    font-size: 3rem;
                    font-weight: 900;
                    color: #ffffff !important;
                    letter-spacing: 8px;
                    font-family: "Courier New", monospace;
                    text-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
                    margin: 10px 0;
                    padding: 15px;
                    background: rgba(0, 0, 0, 0.3) !important;
                    background-color: rgba(0, 0, 0, 0.3) !important;
                    border-radius: 8px;
                    border: 2px dashed rgba(255, 255, 255, 0.5);
                }
                
                .code-info {
                    font-size: 0.9rem;
                    color: #ffffff !important;
                    margin-top: 15px;
                }
                
                .instructions {
                    background: #334155 !important;
                    background-color: #334155 !important;
                    border-radius: 12px;
                    padding: 25px;
                    margin: 30px 0;
                    border-left: 4px solid #06b6d4;
                }
                
                .instructions h3 {
                    color: #06b6d4 !important;
                    margin-bottom: 15px;
                    font-size: 1.2rem;
                }
                
                .instructions ol {
                    color: #cbd5e1 !important;
                    padding-left: 20px;
                }
                
                .instructions li {
                    margin-bottom: 8px;
                    line-height: 1.6;
                    color: #cbd5e1 !important;
                }
                
                .warning {
                    background: #dc2626 !important;
                    background-color: #dc2626 !important;
                    border: 2px solid #ef4444;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 25px 0;
                    color: #ffffff !important;
                }
                
                .warning-icon {
                    color: #ef4444;
                    margin-right: 8px;
                    font-size: 1.1rem;
                }
                
                .footer {
                    background: #0f172a !important;
                    background-color: #0f172a !important;
                    padding: 25px 30px;
                    text-align: center;
                    color: #94a3b8 !important;
                    font-size: 0.9rem;
                    border-top: 2px solid #334155;
                }
                
                .footer a {
                    color: #06b6d4 !important;
                    text-decoration: none;
                }
                
                .footer a:hover {
                    text-decoration: underline;
                    color: #0891b2 !important;
                }
                
                .social-links {
                    margin-top: 15px;
                }
                
                .social-links a {
                    display: inline-block;
                    margin: 0 10px;
                    color: #8b5cf6 !important;
                    font-size: 1.2rem;
                    transition: color 0.3s ease;
                }
                
                .social-links a:hover {
                    color: #06b6d4 !important;
                }
                
                @media (max-width: 600px) {
                    .email-container {
                        margin: 10px;
                        border-radius: 12px;
                    }
                    
                    .header {
                        padding: 20px;
                    }
                    
                    .logo h1 {
                        font-size: 2rem;
                        flex-direction: column;
                        gap: 10px;
                    }
                    
                    .content {
                        padding: 25px 20px;
                    }
                    
                    .verification-code {
                        font-size: 2.5rem;
                        letter-spacing: 4px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <div class="logo">
                        <h1>
                            <span class="dragon-icon">🐲</span>
                            Oblivion RPG
                        </h1>
                    </div>
                </div>
                
                <div class="content">
                    <div class="welcome-text">Bem-vindo, ' . htmlspecialchars($nomeUsuario) . '!</div>
                    
                    <div class="message">
                        Sua jornada épica está prestes a começar! Para ativar sua conta no <strong>Oblivion RPG</strong>, 
                        precisamos verificar seu email. Use o código abaixo para confirmar sua conta:
                    </div>
                    
                    <div class="code-container">
                        <div class="code-label">Seu Código de Verificação</div>
                        <div class="verification-code">' . $codigo . '</div>
                        <div class="code-info">
                            ⏰ Este código expira em <strong>15 minutos</strong>
                        </div>
                    </div>
                    
                    <div class="instructions">
                        <h3>📋 Como usar o código:</h3>
                        <ol>
                            <li>Retorne à página de registro do Oblivion RPG</li>
                            <li>Digite o código de 6 dígitos no campo de verificação</li>
                            <li>Clique em "Confirmar" para ativar sua conta</li>
                            <li>Comece sua aventura épica!</li>
                        </ol>
                    </div>
                    
                    <div class="warning">
                        <span class="warning-icon">⚠️</span>
                        <strong>Importante:</strong> Se você não criou esta conta, ignore este email. 
                        A conta será automaticamente removida após o tempo de expiração.
                    </div>
                </div>
                
                <div class="footer">
                    <p>Este email foi enviado automaticamente pelo sistema Oblivion RPG.</p>
                    <p>Se você não solicitou este código, pode ignorar este email com segurança.</p>
                    
                    <div class="social-links">
                        <a href="#" title="Discord">🎮</a>
                        <a href="#" title="GitHub">💻</a>
                        <a href="#" title="Website">🌐</a>
                    </div>
                    
                    <p style="margin-top: 15px; font-size: 0.8rem;">
                        © 2025 Oblivion RPG. Todos os direitos reservados.
                    </p>
                </div>
            </div>
        </body>
        </html>';
    }
    
    /**
     * Gera versão texto simples do email
     */
    private function gerarTextoSimples($nomeUsuario, $codigo) {
        return "
Bem-vindo ao Oblivion RPG, $nomeUsuario!

Sua jornada épica está prestes a começar! Para ativar sua conta, use o código de verificação abaixo:

CÓDIGO DE VERIFICAÇÃO: $codigo

Este código expira em 15 minutos.

Como usar:
1. Retorne à página de registro do Oblivion RPG
2. Digite o código de 6 dígitos no campo de verificação
3. Clique em 'Confirmar' para ativar sua conta
4. Comece sua aventura!

IMPORTANTE: Se você não criou esta conta, ignore este email. A conta será automaticamente removida após o tempo de expiração.

Este email foi enviado automaticamente pelo sistema Oblivion RPG.

© 2025 Oblivion RPG. Todos os direitos reservados.
        ";
    }
}
?>
