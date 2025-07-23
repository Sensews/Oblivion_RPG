<?php
/**
 * API para buscar detalhes de uma campanha específica - Oblivion RPG
 */

// Desabilitar exibição de erros para evitar HTML na resposta JSON
error_reporting(0);
ini_set('display_errors', 0);

require_once 'config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit;
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Validar parâmetros obrigatórios
    $campaign_id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
    
    if (!$campaign_id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID da campanha é obrigatório']);
        exit;
    }
    
    if (!$user_id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID do usuário é obrigatório']);
        exit;
    }
    
    // Buscar dados da campanha
    $campaign = getCampaignDetails($db, $campaign_id, $user_id);
    
    if (!$campaign) {
        http_response_code(404);
        echo json_encode(['error' => 'Campanha não encontrada ou você não tem permissão para acessá-la']);
        exit;
    }
    
    echo json_encode([
        'campaign' => $campaign
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno do servidor: ' . $e->getMessage()]);
}

/**
 * Buscar detalhes de uma campanha específica
 */
function getCampaignDetails($db, $campaign_id, $user_id) {
    try {
        // Query para buscar campanha - primeiro tenta como mestre
        $query = "
            SELECT c.id, c.nome, c.codigo_convite, c.mestre_id, c.foto_url, 
                   c.descricao, c.criado_em, c.atualizado_em,
                   u.nome_usuario as nome_mestre
            FROM campanhas c
            LEFT JOIN usuarios u ON c.mestre_id = u.id
            WHERE c.id = :campaign_id AND c.mestre_id = :user_id
        ";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':campaign_id', $campaign_id, PDO::PARAM_INT);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $campaign = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Se não encontrou como mestre, tenta como jogador
        if (!$campaign) {
            $query = "
                SELECT DISTINCT c.id, c.nome, c.codigo_convite, c.mestre_id, c.foto_url, 
                       c.descricao, c.criado_em, c.atualizado_em,
                       u.nome_usuario as nome_mestre
                FROM campanhas c
                LEFT JOIN usuarios u ON c.mestre_id = u.id
                INNER JOIN personagens p ON p.campanha_id = c.id
                WHERE c.id = :campaign_id AND p.usuario_id = :user_id
            ";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':campaign_id', $campaign_id, PDO::PARAM_INT);
            $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmt->execute();
            
            $campaign = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        if (!$campaign) {
            return null;
        }
        
        // Converter timestamps para formato mais amigável
        if ($campaign['criado_em']) {
            $campaign['criado_em'] = date('Y-m-d H:i:s', strtotime($campaign['criado_em']));
        }
        
        if ($campaign['atualizado_em']) {
            $campaign['atualizado_em'] = date('Y-m-d H:i:s', strtotime($campaign['atualizado_em']));
        }
        
        // Determinar se o usuário é o mestre
        $campaign['is_master'] = ($campaign['mestre_id'] == $user_id);
        
        return $campaign;
        
    } catch (Exception $e) {
        throw new Exception('Erro ao buscar detalhes da campanha: ' . $e->getMessage());
    }
}
?>
