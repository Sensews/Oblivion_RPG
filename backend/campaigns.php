<?php
/**
 * API para gerenciar campanhas - Oblivion RPG
 */

// Desabilitar exibição de erros para evitar HTML na resposta JSON
error_reporting(0);
ini_set('display_errors', 0);

require_once 'config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    switch ($method) {
        case 'GET':
            getCampaigns($db);
            break;
            
        case 'POST':
            createCampaign($db, $input);
            break;
            
        case 'PUT':
            updateCampaign($db, $input);
            break;
            
        case 'DELETE':
            deleteCampaign($db, $input);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Método não permitido']);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno do servidor: ' . $e->getMessage()]);
}

/**
 * Buscar campanhas do usuário
 */
function getCampaigns($db) {
    try {
        // Verificar se foi passado o user_id via query parameter
        $user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
        
        if (!$user_id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID do usuário é obrigatório']);
            return;
        }
        
        $query = "SELECT id, nome, foto_url, descricao, criado_em 
                  FROM campanhas 
                  WHERE mestre_id = :user_id 
                  ORDER BY criado_em DESC";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $campaigns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'campaigns' => $campaigns
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao buscar campanhas: ' . $e->getMessage()]);
    }
}

/**
 * Criar nova campanha
 */
function createCampaign($db, $input) {
    try {
        // Validar dados obrigatórios
        if (!isset($input['nome']) || empty(trim($input['nome']))) {
            http_response_code(400);
            echo json_encode(['error' => 'Nome da campanha é obrigatório']);
            return;
        }
        
        if (!isset($input['mestre_id']) || !is_numeric($input['mestre_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID do mestre é obrigatório']);
            return;
        }
        
        $nome = trim($input['nome']);
        $mestre_id = (int)$input['mestre_id'];
        $foto_url = isset($input['foto_url']) ? trim($input['foto_url']) : null;
        $descricao = isset($input['descricao']) ? trim($input['descricao']) : null;
        
        // Gerar código de convite único
        $codigo_convite = generateUniqueCode($db);
        
        $query = "INSERT INTO campanhas (nome, codigo_convite, mestre_id, foto_url, descricao) 
                  VALUES (:nome, :codigo_convite, :mestre_id, :foto_url, :descricao)";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':nome', $nome);
        $stmt->bindParam(':codigo_convite', $codigo_convite);
        $stmt->bindParam(':mestre_id', $mestre_id, PDO::PARAM_INT);
        $stmt->bindParam(':foto_url', $foto_url);
        $stmt->bindParam(':descricao', $descricao);
        
        if ($stmt->execute()) {
            $campaign_id = $db->lastInsertId();
            
            // Buscar a campanha criada para retornar
            $selectQuery = "SELECT id, nome, foto_url, descricao, criado_em 
                           FROM campanhas 
                           WHERE id = :id";
            $selectStmt = $db->prepare($selectQuery);
            $selectStmt->bindParam(':id', $campaign_id, PDO::PARAM_INT);
            $selectStmt->execute();
            
            $campaign = $selectStmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'message' => 'Campanha criada com sucesso!',
                'campaign' => $campaign
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Erro ao criar campanha']);
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao criar campanha: ' . $e->getMessage()]);
    }
}

/**
 * Atualizar campanha existente
 */
function updateCampaign($db, $input) {
    try {
        if (!isset($input['id']) || !is_numeric($input['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID da campanha é obrigatório']);
            return;
        }
        
        if (!isset($input['nome']) || empty(trim($input['nome']))) {
            http_response_code(400);
            echo json_encode(['error' => 'Nome da campanha é obrigatório']);
            return;
        }
        
        if (!isset($input['mestre_id']) || !is_numeric($input['mestre_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID do mestre é obrigatório']);
            return;
        }
        
        $id = (int)$input['id'];
        $nome = trim($input['nome']);
        $mestre_id = (int)$input['mestre_id'];
        $foto_url = isset($input['foto_url']) ? trim($input['foto_url']) : null;
        $descricao = isset($input['descricao']) ? trim($input['descricao']) : null;
        
        // Verificar se a campanha pertence ao usuário
        $checkQuery = "SELECT id FROM campanhas WHERE id = :id AND mestre_id = :mestre_id";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(':id', $id, PDO::PARAM_INT);
        $checkStmt->bindParam(':mestre_id', $mestre_id, PDO::PARAM_INT);
        $checkStmt->execute();
        
        if ($checkStmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Campanha não encontrada ou você não tem permissão para editá-la']);
            return;
        }
        
        $query = "UPDATE campanhas 
                  SET nome = :nome, foto_url = :foto_url, descricao = :descricao 
                  WHERE id = :id AND mestre_id = :mestre_id";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':nome', $nome);
        $stmt->bindParam(':foto_url', $foto_url);
        $stmt->bindParam(':descricao', $descricao);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->bindParam(':mestre_id', $mestre_id, PDO::PARAM_INT);
        
        if ($stmt->execute()) {
            // Buscar a campanha atualizada
            $selectQuery = "SELECT id, nome, foto_url, descricao, criado_em 
                           FROM campanhas 
                           WHERE id = :id";
            $selectStmt = $db->prepare($selectQuery);
            $selectStmt->bindParam(':id', $id, PDO::PARAM_INT);
            $selectStmt->execute();
            
            $campaign = $selectStmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'message' => 'Campanha atualizada com sucesso!',
                'campaign' => $campaign
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Erro ao atualizar campanha']);
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao atualizar campanha: ' . $e->getMessage()]);
    }
}

/**
 * Excluir campanha
 */
function deleteCampaign($db, $input) {
    try {
        if (!isset($input['id']) || !is_numeric($input['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID da campanha é obrigatório']);
            return;
        }
        
        if (!isset($input['mestre_id']) || !is_numeric($input['mestre_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID do mestre é obrigatório']);
            return;
        }
        
        $id = (int)$input['id'];
        $mestre_id = (int)$input['mestre_id'];
        
        // Verificar se a campanha pertence ao usuário
        $checkQuery = "SELECT id FROM campanhas WHERE id = :id AND mestre_id = :mestre_id";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(':id', $id, PDO::PARAM_INT);
        $checkStmt->bindParam(':mestre_id', $mestre_id, PDO::PARAM_INT);
        $checkStmt->execute();
        
        if ($checkStmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Campanha não encontrada ou você não tem permissão para excluí-la']);
            return;
        }
        
        $query = "DELETE FROM campanhas WHERE id = :id AND mestre_id = :mestre_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->bindParam(':mestre_id', $mestre_id, PDO::PARAM_INT);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Campanha excluída com sucesso!'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Erro ao excluir campanha']);
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao excluir campanha: ' . $e->getMessage()]);
    }
}

/**
 * Gerar código de convite único
 */
function generateUniqueCode($db) {
    do {
        $code = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));
        
        $query = "SELECT id FROM campanhas WHERE codigo_convite = :code";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':code', $code);
        $stmt->execute();
        
    } while ($stmt->rowCount() > 0);
    
    return $code;
}
?>
