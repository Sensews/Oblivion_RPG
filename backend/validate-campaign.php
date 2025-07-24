<?php
/**
 * Endpoint para validar código de campanha
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    exit;
}

require_once 'config/database.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['codigo_convite']) || empty(trim($input['codigo_convite']))) {
        echo json_encode(['success' => false, 'error' => 'Código de convite é obrigatório']);
        exit;
    }
    
    $codigo_convite = trim($input['codigo_convite']);
    
    $db = Database::getConnection();
    
    // Buscar campanha pelo código de convite
    $sql = "SELECT c.id, c.nome, c.descricao, u.nome_usuario as mestre_nome 
            FROM campanhas c 
            LEFT JOIN usuarios u ON c.mestre_id = u.id 
            WHERE c.codigo_convite = :codigo_convite";
    
    $stmt = $db->prepare($sql);
    $stmt->bindParam(':codigo_convite', $codigo_convite, PDO::PARAM_STR);
    $stmt->execute();
    
    $campanha = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($campanha) {
        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $campanha['id'],
                'nome' => $campanha['nome'],
                'descricao' => $campanha['descricao'],
                'mestre_nome' => $campanha['mestre_nome'],
                'codigo_convite' => $codigo_convite
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Código de campanha não encontrado'
        ]);
    }

} catch (Exception $e) {
    error_log("Erro na validação de campanha: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor: ' . $e->getMessage()
    ]);
}
?>
