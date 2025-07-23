<?php
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if (!isset($_GET['campaign_id'])) {
    echo json_encode(['success' => false, 'message' => 'campaign_id é obrigatório']);
    exit;
}

$campaignId = (int)$_GET['campaign_id'];

if ($campaignId <= 0) {
    echo json_encode(['success' => false, 'message' => 'campaign_id inválido']);
    exit;
}

try {
    $host = 'localhost';
    $dbname = 'oblivion_rpg';
    $username = 'root';
    $password = '';
    
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    $query = "SELECT 
        p.id,
        COALESCE(p.nome, 'Sem Nome') as nome,
        p.foto_url,
        COALESCE(u.nome, 'Usuário Desconhecido') as usuario_nome
    FROM personagens p
    LEFT JOIN usuarios u ON p.usuario_id = u.id
    WHERE p.campanha_id = ?
    ORDER BY p.nome ASC";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$campaignId]);
    
    $characters = $stmt->fetchAll();
    
    $result = [];
    foreach ($characters as $char) {
        $result[] = [
            'id' => (int)$char['id'],
            'nome' => $char['nome'],
            'foto_url' => $char['foto_url'],
            'usuario' => [
                'nome' => $char['usuario_nome']
            ]
        ];
    }
    
    echo json_encode([
        'success' => true,
        'characters' => $result,
        'total' => count($result)
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro de banco de dados'
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno'
    ]);
}
?>
