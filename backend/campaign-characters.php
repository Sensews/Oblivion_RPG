<?php
// Desabilitar exibição de erros para não quebrar o JSON
error_reporting(0);
ini_set('display_errors', 0);

// Limpar qualquer output anterior
if (ob_get_level()) {
    ob_end_clean();
}
ob_start();

// Headers para CORS e JSON
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Responder a requisições OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    exit(0);
}

// Incluir configuração do banco
try {
    require_once __DIR__ . '/config/database.php';
} catch (Exception $e) {
    ob_end_clean();
    echo json_encode([
        'success' => false,
        'message' => 'Erro de configuração do banco de dados'
    ]);
    exit;
}

/**
 * Busca os personagens de uma campanha
 */
function getCampaignCharacters($campaignId, $userId) {
    try {
        $pdo = getDatabaseConnection();
        
        // Buscar diretamente os personagens da campanha sem verificação de acesso
        $query = "SELECT 
            p.id,
            p.nome,
            p.foto_url,
            u.nome as usuario_nome,
            u.email as usuario_email
        FROM personagens p
        LEFT JOIN usuarios u ON p.usuario_id = u.id
        WHERE p.campanha_id = :campaign_id
        ORDER BY p.nome ASC";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute([':campaign_id' => $campaignId]);
        
        $characters = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Processar os dados dos personagens
        $processedCharacters = [];
        foreach ($characters as $character) {
            $processedCharacters[] = [
                'id' => (int)$character['id'],
                'nome' => $character['nome'] ?? 'Personagem Sem Nome',
                'foto_url' => $character['foto_url'],
                'usuario' => [
                    'nome' => $character['usuario_nome'] ?? 'Usuário Desconhecido',
                    'email' => $character['usuario_email']
                ]
            ];
        }
        
        return [
            'success' => true,
            'characters' => $processedCharacters,
            'total' => count($processedCharacters)
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Erro interno do servidor'
        ];
    }
}

// Verificar método da requisição
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    ob_end_clean();
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método não permitido'
    ]);
    exit;
}

// Verificar se os parâmetros necessários foram fornecidos
if (!isset($_GET['campaign_id']) || !isset($_GET['user_id'])) {
    ob_end_clean();
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Parâmetros obrigatórios: campaign_id e user_id'
    ]);
    exit;
}

$campaignId = filter_var($_GET['campaign_id'], FILTER_VALIDATE_INT);
$userId = filter_var($_GET['user_id'], FILTER_VALIDATE_INT);

if (!$campaignId || !$userId) {
    ob_end_clean();
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'IDs devem ser números válidos'
    ]);
    exit;
}

// Buscar e retornar os personagens
try {
    $result = getCampaignCharacters($campaignId, $userId);

    ob_end_clean();
    if (!$result['success']) {
        http_response_code(403);
    }

    echo json_encode($result, JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor'
    ], JSON_UNESCAPED_UNICODE);
}
?>
