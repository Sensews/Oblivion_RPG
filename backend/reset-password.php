<?php
/**
 * Endpoint para redefinir senha
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
require_once __DIR__ . '/services/PasswordSecurity.php';

try {
    // Obter dados da requisição
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['token']) || !isset($input['newPassword'])) {
        throw new Exception('Token e nova senha são obrigatórios');
    }
    
    $token = trim($input['token']);
    $newPassword = $input['newPassword'];
    
    // Validar formato do token
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        throw new Exception('Token inválido');
    }
    
    // Validar senha
    if (empty($newPassword)) {
        throw new Exception('Nova senha é obrigatória');
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
            senha_hash as current_password_hash,
            token_expira_em
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
    
    // Validar critérios de segurança da senha
    $passwordSecurity = new PasswordSecurity();
    $validation = $passwordSecurity::validatePasswordStrength($newPassword);
    
    if (!$validation['valid']) {
        throw new Exception('Senha não atende aos critérios de segurança: ' . implode(', ', $validation['errors']));
    }
    
    // Verificar se a nova senha não é igual à atual
    if (password_verify($newPassword, $user['current_password_hash'])) {
        throw new Exception('A nova senha deve ser diferente da senha atual');
    }
    
    // Gerar hash da nova senha
    $newPasswordHash = password_hash($newPassword, PASSWORD_ARGON2ID, [
        'memory_cost' => 65536, // 64 MB
        'time_cost' => 4,       // 4 iterações
        'threads' => 3          // 3 threads
    ]);
    
    // Iniciar transação
    $pdo->beginTransaction();
    
    try {
        // Atualizar senha e limpar token de recuperação
        $stmt = $pdo->prepare("
            UPDATE usuarios 
            SET 
                senha_hash = ?,
                token_recuperacao = NULL,
                token_expira_em = NULL,
                atualizado_em = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$newPasswordHash, $user['id']]);
        
        // Registrar log de alteração de senha (opcional)
        $stmt = $pdo->prepare("
            INSERT INTO logs_verificacao (usuario_id, email, codigo, verificado_em) 
            VALUES (?, ?, 'RESET', NOW())
        ");
        $stmt->execute([$user['id'], $user['email']]);
        
        // Confirmar transação
        $pdo->commit();
        
        // Log da redefinição bem-sucedida
        error_log("Password reset successful for user ID: {$user['id']}, email: {$user['email']}");
        
        echo json_encode([
            'success' => true,
            'message' => 'Senha redefinida com sucesso!'
        ]);
        
    } catch (Exception $e) {
        // Reverter transação em caso de erro
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Error in reset-password.php: " . $e->getMessage());
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} catch (PDOException $e) {
    error_log("Database error in reset-password.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor. Tente novamente mais tarde'
    ]);
}
?>
