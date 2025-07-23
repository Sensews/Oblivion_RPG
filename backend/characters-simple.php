<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Incluir configuração do banco
require_once __DIR__ . '/config/database.php';

try {
    $campaignId = (int)($_GET['campaign_id'] ?? 0);
    
    if ($campaignId <= 0) {
        echo json_encode(['success' => false, 'message' => 'ID inválido']);
        exit;
    }
    
    // Usar a conexão configurada no database.php
    $pdo = getDatabaseConnection();
    
    // Primeiro, verificar se a tabela personagens existe
    $checkTable = $pdo->query("SHOW TABLES LIKE 'personagens'");
    if ($checkTable->rowCount() == 0) {
        echo json_encode([
            'success' => true,
            'characters' => [],
            'total' => 0,
            'message' => 'Tabela personagens não existe'
        ]);
        exit;
    }
    
    // Verificar estrutura da tabela
    $columns = $pdo->query("DESCRIBE personagens")->fetchAll(PDO::FETCH_COLUMN);
    
    // Query básica que sempre funciona
    $query = "SELECT id, nome, foto_url, usuario_id, campanha_id FROM personagens WHERE campanha_id = ?";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$campaignId]);
    $characters = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $result = [];
    foreach ($characters as $char) {
        // Buscar nome do usuário se possível
        $userName = 'Usuário Desconhecido';
        if ($char['usuario_id']) {
            try {
                $userStmt = $pdo->prepare("SELECT nome FROM usuarios WHERE id = ?");
                $userStmt->execute([$char['usuario_id']]);
                $user = $userStmt->fetch();
                if ($user) {
                    $userName = $user['nome'];
                }
            } catch (Exception $e) {
                // Ignora erro de usuário
            }
        }
        
        $result[] = [
            'id' => (int)$char['id'],
            'nome' => $char['nome'] ?: 'Sem Nome',
            'foto_url' => $char['foto_url'],
            'usuario' => [
                'nome' => $userName
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
        'message' => 'Erro de conexão: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro: ' . $e->getMessage()
    ]);
}
?>
