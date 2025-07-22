<?php
/**
 * Endpoint para validar token de recuperação de senha
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
    
    if (!$input || !isset($input['token'])) {
        throw new Exception('Token é obrigatório');
    }
    
    $token = trim($input['token']);
    
    // Validar formato do token (deve ter 64 caracteres hexadecimais)
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        throw new Exception('Token inválido');
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
    
    // Verificar se o token existe e não expirou
    $stmt = $pdo->prepare("
        SELECT 
            id, 
            nome_usuario, 
            email, 
            token_expira_em,
            TIMESTAMPDIFF(SECOND, NOW(), token_expira_em) as seconds_remaining
        FROM usuarios 
        WHERE token_recuperacao = ? 
        AND ativo = 1 
        AND email_verificado = 1
    ");
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    
    if (!$user) {
        throw new Exception('Token de recuperação inválido');
    }
    
    // Verificar se o token não expirou
    if (strtotime($user['token_expira_em']) <= time()) {
        // Limpar token expirado
        $stmt = $pdo->prepare("
            UPDATE usuarios 
            SET token_recuperacao = NULL, token_expira_em = NULL 
            WHERE id = ?
        ");
        $stmt->execute([$user['id']]);
        
        throw new Exception('Token de recuperação expirado. Solicite um novo link');
    }
    
    // Log da validação bem-sucedida
    error_log("Valid reset token accessed for user ID: {$user['id']}, email: {$user['email']}");
    
    $hours_remaining = ceil($user['seconds_remaining'] / 3600);
    
    echo json_encode([
        'success' => true,
        'message' => 'Token válido',
        'user' => [
            'nome_usuario' => $user['nome_usuario'],
            'email' => $user['email']
        ],
        'expires_in_hours' => $hours_remaining
    ]);
    
} catch (Exception $e) {
    error_log("Error in validate-reset-token.php: " . $e->getMessage());
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} catch (PDOException $e) {
    error_log("Database error in validate-reset-token.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor. Tente novamente mais tarde'
    ]);
}
?>
