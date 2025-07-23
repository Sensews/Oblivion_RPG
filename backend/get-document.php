<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config/database.php';

// Função para validar sessão do usuário
function validateUserSession() {
    // Verificar diferentes formas de receber o Authorization header
    $authHeader = null;
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
        }
    }
    
    if (!$authHeader) {
        return false;
    }
    
    if (strpos($authHeader, 'Bearer ') !== 0) {
        return false;
    }
    
    $sessionData = substr($authHeader, 7);
    $decoded = json_decode(base64_decode($sessionData), true);
    
    if (!$decoded || !isset($decoded['user_id'])) {
        return false;
    }
    
    return $decoded;
}

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    // Validar sessão
    $userSession = validateUserSession();
    if (!$userSession) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Sessão inválida']);
        exit();
    }
    
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método não permitido']);
        exit();
    }
    
    if (!isset($_GET['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID do documento é obrigatório']);
        exit();
    }
    
    $documentId = $_GET['id'];
    
    // Buscar documento completo e verificar permissões
    $stmt = $pdo->prepare("
        SELECT em.*, c.nome as campanha_nome, c.mestre_id 
        FROM editor_mestre em 
        JOIN campanhas c ON em.campanha_id = c.id 
        WHERE em.id = ?
    ");
    $stmt->execute([$documentId]);
    $document = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$document) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Documento não encontrado']);
        exit();
    }
    
    if ($document['mestre_id'] != $userSession['user_id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Acesso negado']);
        exit();
    }
    
    // Formatar datas
    $document['ultima_edicao_formatada'] = date('d/m/Y H:i', strtotime($document['ultima_edicao']));
    $document['criado_em_formatado'] = date('d/m/Y H:i', strtotime($document['criado_em']));
    
    // Remover dados sensíveis
    unset($document['mestre_id']);
    
    echo json_encode([
        'success' => true,
        'document' => $document
    ]);
    
} catch (Exception $e) {
    error_log("Erro em get-document.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor'
    ]);
}
?>
