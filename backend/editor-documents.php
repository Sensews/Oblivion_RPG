<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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

// Função para verificar se o usuário é mestre da campanha
function validateCampaignMaster($campaignId, $userId, $pdo) {
    try {
        $stmt = $pdo->prepare("SELECT mestre_id FROM campanhas WHERE id = ?");
        $stmt->execute([$campaignId]);
        $campaign = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $campaign && $campaign['mestre_id'] == $userId;
    } catch (Exception $e) {
        return false;
    }
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
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            // Listar documentos de uma campanha
            if (!isset($_GET['campaign_id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID da campanha é obrigatório']);
                exit();
            }
            
            $campaignId = $_GET['campaign_id'];
            
            // Verificar se o usuário é mestre da campanha
            if (!validateCampaignMaster($campaignId, $userSession['user_id'], $pdo)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Acesso negado']);
                exit();
            }
            
            // Buscar documentos
            $stmt = $pdo->prepare("
                SELECT id, titulo, ultima_edicao, criado_em,
                       CHAR_LENGTH(conteudo) as tamanho_conteudo
                FROM editor_mestre 
                WHERE campanha_id = ? 
                ORDER BY ultima_edicao DESC
            ");
            $stmt->execute([$campaignId]);
            $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Formatar datas
            foreach ($documents as &$doc) {
                $doc['ultima_edicao_formatada'] = date('d/m/Y H:i', strtotime($doc['ultima_edicao']));
                $doc['criado_em_formatado'] = date('d/m/Y H:i', strtotime($doc['criado_em']));
            }
            
            echo json_encode([
                'success' => true,
                'documents' => $documents
            ]);
            break;
            
        case 'POST':
            // Criar novo documento
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['campaign_id'], $input['titulo'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Dados obrigatórios não fornecidos']);
                exit();
            }
            
            $campaignId = $input['campaign_id'];
            $titulo = trim($input['titulo']);
            $conteudo = $input['conteudo'] ?? '';
            
            if (empty($titulo)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Título é obrigatório']);
                exit();
            }
            
            // Verificar se o usuário é mestre da campanha
            if (!validateCampaignMaster($campaignId, $userSession['user_id'], $pdo)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Acesso negado']);
                exit();
            }
            
            // Verificar se já existe documento com o mesmo título na campanha
            $stmt = $pdo->prepare("SELECT id FROM editor_mestre WHERE campanha_id = ? AND titulo = ?");
            $stmt->execute([$campaignId, $titulo]);
            if ($stmt->fetch()) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Já existe um documento com este título']);
                exit();
            }
            
            // Criar documento
            $stmt = $pdo->prepare("
                INSERT INTO editor_mestre (campanha_id, titulo, conteudo) 
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$campaignId, $titulo, $conteudo]);
            
            $documentId = $pdo->lastInsertId();
            
            echo json_encode([
                'success' => true,
                'message' => 'Documento criado com sucesso',
                'document_id' => $documentId
            ]);
            break;
            
        case 'PUT':
            // Atualizar documento
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id'], $input['titulo'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Dados obrigatórios não fornecidos']);
                exit();
            }
            
            $documentId = $input['id'];
            $titulo = trim($input['titulo']);
            $conteudo = $input['conteudo'] ?? '';
            
            if (empty($titulo)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Título é obrigatório']);
                exit();
            }
            
            // Buscar documento e verificar permissões
            $stmt = $pdo->prepare("
                SELECT em.campanha_id, c.mestre_id 
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
            
            // Verificar se já existe outro documento com o mesmo título na campanha
            $stmt = $pdo->prepare("
                SELECT id FROM editor_mestre 
                WHERE campanha_id = ? AND titulo = ? AND id != ?
            ");
            $stmt->execute([$document['campanha_id'], $titulo, $documentId]);
            if ($stmt->fetch()) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Já existe outro documento com este título']);
                exit();
            }
            
            // Atualizar documento
            $stmt = $pdo->prepare("
                UPDATE editor_mestre 
                SET titulo = ?, conteudo = ?, ultima_edicao = CURRENT_TIMESTAMP 
                WHERE id = ?
            ");
            $stmt->execute([$titulo, $conteudo, $documentId]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Documento atualizado com sucesso'
            ]);
            break;
            
        case 'DELETE':
            // Deletar documento
            if (!isset($_GET['id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID do documento é obrigatório']);
                exit();
            }
            
            $documentId = $_GET['id'];
            
            // Buscar documento e verificar permissões
            $stmt = $pdo->prepare("
                SELECT em.campanha_id, c.mestre_id 
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
            
            // Deletar documento
            $stmt = $pdo->prepare("DELETE FROM editor_mestre WHERE id = ?");
            $stmt->execute([$documentId]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Documento deletado com sucesso'
            ]);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método não permitido']);
            break;
    }
    
} catch (Exception $e) {
    error_log("Erro em editor-documents.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor'
    ]);
}
?>
