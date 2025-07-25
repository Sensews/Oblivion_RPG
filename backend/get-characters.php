<?php
/**
 * API para buscar personagens - Oblivion RPG
 * Busca personagens por usuário ou campanha com dados da ficha
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    require_once 'config/database.php';
    
    $pdo = Database::getConnection();
    
    $userId = null;
    $campaignId = null;
    
    // Determinar se é GET (por campanha) ou POST (por usuário)
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (isset($_GET['campaign_id'])) {
            $campaignId = (int)$_GET['campaign_id'];
        }
    } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (isset($input['usuario_id'])) {
            $userId = (int)$input['usuario_id'];
        }
        if (isset($input['campaign_id'])) {
            $campaignId = (int)$input['campaign_id'];
        }
    }
    
    // Construir query baseada nos parâmetros
    $conditions = [];
    $params = [];
    
    if ($userId) {
        $conditions[] = 'p.usuario_id = ?';
        $params[] = $userId;
    }
    
    if ($campaignId) {
        $conditions[] = 'p.campanha_id = ?';
        $params[] = $campaignId;
    }
    
    $whereClause = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
    
    $query = "
        SELECT 
            p.id,
            p.nome,
            p.foto_url,
            p.campanha_id,
            c.nome as campanha_nome,
            u.nome_usuario as usuario_nome,
            f.pv_atual,
            f.pv_max,
            f.pe_atual,
            f.pe_max,
            f.defesa,
            f.deslocamento,
            f.alerta,
            l.nome as legado_nome
        FROM personagens p
        LEFT JOIN campanhas c ON p.campanha_id = c.id
        LEFT JOIN usuarios u ON p.usuario_id = u.id
        LEFT JOIN fichas f ON p.id = f.personagem_id
        LEFT JOIN legados l ON f.legado_id = l.id
        $whereClause
        ORDER BY p.nome ASC
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    
    $characters = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $result = [];
    foreach ($characters as $char) {
        $result[] = [
            'id' => (int)$char['id'],
            'nome' => $char['nome'],
            'foto_url' => $char['foto_url'],
            'campanha_id' => $char['campanha_id'] ? (int)$char['campanha_id'] : null,
            'campanha_nome' => $char['campanha_nome'],
            'usuario_nome' => $char['usuario_nome'],
            'pv_atual' => $char['pv_atual'] ? (int)$char['pv_atual'] : 0,
            'pv_max' => $char['pv_max'] ? (int)$char['pv_max'] : 0,
            'pe_atual' => $char['pe_atual'] ? (int)$char['pe_atual'] : 0,
            'pe_max' => $char['pe_max'] ? (int)$char['pe_max'] : 0,
            'defesa' => $char['defesa'] ? (int)$char['defesa'] : 0,
            'deslocamento' => $char['deslocamento'] ? (int)$char['deslocamento'] : 0,
            'alerta' => $char['alerta'] ? (int)$char['alerta'] : 0,
            'legado_nome' => $char['legado_nome']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'characters' => $result,
        'total' => count($result)
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro de banco de dados: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno: ' . $e->getMessage()
    ]);
}
?>
