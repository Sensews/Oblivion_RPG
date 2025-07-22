<?php
/**
 * Endpoint para autenticação de usuários
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

try {
    // Obter dados da requisição
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['loginField']) || !isset($input['password'])) {
        throw new Exception('Email/usuário e senha são obrigatórios');
    }
    
    $loginField = trim($input['loginField']);
    $password = $input['password'];
    $rememberMe = isset($input['rememberMe']) ? (bool)$input['rememberMe'] : false;
    
    // Validação básica
    if (empty($loginField) || empty($password)) {
        throw new Exception('Por favor, preencha todos os campos');
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
    
    // Buscar usuário por email ou nome de usuário
    $stmt = $pdo->prepare("
        SELECT 
            id, 
            nome_usuario, 
            email, 
            senha_hash, 
            tipo_perfil, 
            email_verificado, 
            ativo,
            ultimo_login
        FROM usuarios 
        WHERE (email = ? OR nome_usuario = ?) 
        AND ativo = 1
    ");
    $stmt->execute([$loginField, $loginField]);
    $user = $stmt->fetch();
    
    if (!$user) {
        throw new Exception('Email ou nome de usuário não encontrado');
    }
    
    // Verificar se o email foi verificado
    if (!$user['email_verificado']) {
        throw new Exception('Email não verificado. Verifique sua caixa de entrada e confirme seu email antes de fazer login');
    }
    
    // Verificar senha
    if (!password_verify($password, $user['senha_hash'])) {
        // Log de tentativa de login inválida
        error_log("Failed login attempt for user: {$loginField}");
        throw new Exception('Senha incorreta. Verifique se digitou corretamente ou use "Esqueceu a senha?"');
    }
    
    // Verificar se a senha precisa ser rehashed (por segurança)
    if (password_needs_rehash($user['senha_hash'], PASSWORD_ARGON2ID)) {
        $newHash = password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => 65536,
            'time_cost' => 4,
            'threads' => 3
        ]);
        
        $stmt = $pdo->prepare("UPDATE usuarios SET senha_hash = ? WHERE id = ?");
        $stmt->execute([$newHash, $user['id']]);
    }
    
    // Gerar token de sessão
    $token = bin2hex(random_bytes(32));
    $expiresAt = $rememberMe ? 
        date('Y-m-d H:i:s', time() + (30 * 24 * 60 * 60)) : // 30 dias
        date('Y-m-d H:i:s', time() + (24 * 60 * 60));        // 24 horas
    
    // Atualizar último login
    $stmt = $pdo->prepare("
        UPDATE usuarios 
        SET ultimo_login = NOW() 
        WHERE id = ?
    ");
    $stmt->execute([$user['id']]);
    
    // Limpar dados sensíveis
    unset($user['senha_hash']);
    
    // Log de login bem-sucedido
    error_log("Successful login for user ID: {$user['id']}, email: {$user['email']}");
    
    // Preparar resposta
    $response = [
        'success' => true,
        'message' => 'Login realizado com sucesso!',
        'token' => $token,
        'expires_at' => $expiresAt,
        'user' => [
            'id' => $user['id'],
            'nome_usuario' => $user['nome_usuario'],
            'email' => $user['email'],
            'tipo_perfil' => $user['tipo_perfil'],
            'ultimo_login' => $user['ultimo_login']
        ],
        'redirect' => 'dashboard.html'
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    error_log("Error in login.php: " . $e->getMessage());
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} catch (PDOException $e) {
    error_log("Database error in login.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor. Tente novamente mais tarde'
    ]);
}
?>
