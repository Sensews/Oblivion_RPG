<?php
/**
 * Endpoint para solicitação de recuperação de senha
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Lidar com requisições OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit();
}

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/services/EmailService.php';

try {
    // Obter dados da requisição
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['email'])) {
        throw new Exception('Email é obrigatório');
    }
    
    $email = trim($input['email']);
    
    // Validar email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Email inválido');
    }
    
    // Conectar ao banco de dados
    $config = Config::load();
    $pdo = new PDO(
        "mysql:host={$config['db_host']};dbname={$config['db_name']};charset={$config['db_charset']}",
        $config['db_user'],
        $config['db_pass'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
    
    // Verificar se o usuário existe e está ativo
    $stmt = $pdo->prepare("
        SELECT id, nome_usuario, email, email_verificado, ativo 
        FROM usuarios 
        WHERE email = ? AND ativo = 1
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        // Por segurança, sempre retornamos sucesso mesmo se o email não existir
        echo json_encode([
            'success' => true,
            'message' => 'Se o email estiver cadastrado, você receberá as instruções de recuperação'
        ]);
        exit();
    }
    
    // Verificar se o email foi verificado
    if (!$user['email_verificado']) {
        throw new Exception('Email não verificado. Verifique seu email antes de solicitar recuperação de senha');
    }
    
    // Verificar se há uma solicitação recente (rate limiting)
    $stmt = $pdo->prepare("
        SELECT token_expira_em 
        FROM usuarios 
        WHERE id = ? AND token_recuperacao IS NOT NULL AND token_expira_em > NOW()
    ");
    $stmt->execute([$user['id']]);
    $existing_request = $stmt->fetch();
    
    if ($existing_request) {
        $time_remaining = strtotime($existing_request['token_expira_em']) - time();
        $minutes_remaining = ceil($time_remaining / 60);
        
        throw new Exception("Já existe uma solicitação ativa. Tente novamente em {$minutes_remaining} minutos");
    }
    
    // Gerar token de recuperação
    $token = bin2hex(random_bytes(32)); // 64 caracteres
    $expires_at = date('Y-m-d H:i:s', time() + (24 * 60 * 60)); // 24 horas
    
    // Atualizar usuário com token de recuperação
    $stmt = $pdo->prepare("
        UPDATE usuarios 
        SET token_recuperacao = ?, token_expira_em = ? 
        WHERE id = ?
    ");
    $stmt->execute([$token, $expires_at, $user['id']]);
    
    // Preparar link de recuperação
    $recovery_link = $config['app_url'] . "/frontend/pages/reset-password.html?token=" . $token;
    
    // Enviar email usando template estilizado
    $emailService = new EmailService();
    $emailSent = $emailService->enviarEmailRecuperacao(
        $user['email'],
        $user['nome_usuario'],
        $recovery_link
    );
    
    if (!$emailSent) {
        throw new Exception('Erro ao enviar email. Tente novamente mais tarde');
    }
    
    // Log da solicitação (opcional)
    error_log("Password recovery requested for user ID: {$user['id']}, email: {$user['email']}");
    
    echo json_encode([
        'success' => true,
        'message' => 'Email de recuperação enviado com sucesso! Verifique sua caixa de entrada'
    ]);
    
} catch (Exception $e) {
    error_log("Error in forgot-password.php: " . $e->getMessage());
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} catch (PDOException $e) {
    error_log("Database error in forgot-password.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor. Tente novamente mais tarde'
    ]);
}
?>
