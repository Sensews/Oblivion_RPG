<?php
/**
 * API para buscar estatísticas de uma campanha - Oblivion RPG
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
    
    // Validar parâmetro obrigatório
    $campaign_id = isset($_GET['campaign_id']) ? (int)$_GET['campaign_id'] : null;
    
    if (!$campaign_id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID da campanha é obrigatório']);
        exit;
    }
    
    // Buscar estatísticas
    $stats = getCampaignStats($db, $campaign_id);
    
    echo json_encode($stats);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno do servidor: ' . $e->getMessage()]);
}

/**
 * Buscar estatísticas de uma campanha
 */
function getCampaignStats($db, $campaign_id) {
    try {
        $stats = [];
        
        // Contar personagens conectados à campanha
        $query = "SELECT COUNT(*) as total FROM personagens WHERE campanha_id = :campaign_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':campaign_id', $campaign_id, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['characters'] = (int)$result['total'];
        
        // Contar NPCs da campanha
        $query = "SELECT COUNT(*) as total FROM fichas_npc WHERE campanha_id = :campaign_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':campaign_id', $campaign_id, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['npcs'] = (int)$result['total'];
        
        // Contar documentos do editor de mestre para esta campanha
        $query = "SELECT COUNT(*) as total FROM editor_mestre WHERE campanha_id = :campaign_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':campaign_id', $campaign_id, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['documents'] = (int)$result['total'];
        
        return $stats;
        
    } catch (Exception $e) {
        throw new Exception('Erro ao buscar estatísticas da campanha: ' . $e->getMessage());
    }
}
?>
