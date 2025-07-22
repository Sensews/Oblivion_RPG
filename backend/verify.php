<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

require_once 'config/database.php';
require_once 'services/VerificationService.php';

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('JSON inválido');
    }
    
    $verificationService = new VerificationService();
    
    // Determinar ação baseada no campo 'action'
    $action = $data['action'] ?? '';
    
    switch ($action) {
        case 'verify':
            if (empty($data['user_id']) || empty($data['code'])) {
                echo json_encode([
                    'success' => false,
                    'message' => 'ID do usuário e código são obrigatórios'
                ]);
                exit;
            }
            
            $result = $verificationService->verificarCodigo(
                $data['user_id'],
                $data['code']
            );
            
            echo json_encode($result);
            break;
            
        case 'resend':
            if (empty($data['user_id'])) {
                echo json_encode([
                    'success' => false,
                    'message' => 'ID do usuário é obrigatório'
                ]);
                exit;
            }
            
            $result = $verificationService->reenviarCodigo($data['user_id']);
            echo json_encode($result);
            break;
            
        case 'cancel':
            if (empty($data['user_id'])) {
                echo json_encode([
                    'success' => false,
                    'message' => 'ID do usuário é obrigatório'
                ]);
                exit;
            }
            
            $success = $verificationService->cancelarRegistro($data['user_id']);
            echo json_encode([
                'success' => $success,
                'message' => $success ? 'Registro cancelado com sucesso' : 'Erro ao cancelar registro'
            ]);
            break;
            
        default:
            echo json_encode([
                'success' => false,
                'message' => 'Ação não especificada ou inválida'
            ]);
            break;
    }
    
} catch (Exception $e) {
    error_log('Erro na verificação: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor'
    ]);
}
?>
