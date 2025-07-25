<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

try {
    require_once 'config/database.php';
    
    $sql = "SELECT id, nome, nivel, bonus, tipo, alvo_primario 
            FROM maestria_equipamento 
            ORDER BY nome ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    
    $maestrias = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'maestrias' => $maestrias
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao buscar maestrias: ' . $e->getMessage()
    ]);
}
?>
