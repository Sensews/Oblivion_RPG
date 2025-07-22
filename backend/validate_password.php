<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Apenas aceitar requisições POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

require_once 'services/PasswordSecurity.php';

try {
    // Obter dados JSON
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('JSON inválido');
    }
    
    if (empty($data['password'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Senha é obrigatória'
        ]);
        exit;
    }
    
    // Validar senha usando PasswordSecurity
    $validation = PasswordSecurity::validatePasswordStrength($data['password']);
    
    echo json_encode([
        'success' => $validation['valid'],
        'valid' => $validation['valid'],
        'errors' => $validation['errors'],
        'strength' => $validation['strength'],
        'message' => $validation['valid'] ? 'Senha válida' : implode('; ', $validation['errors'])
    ]);
    
} catch (Exception $e) {
    error_log('Erro na validação de senha: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor'
    ]);
}
?>
