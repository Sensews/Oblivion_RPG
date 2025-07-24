<?php
/**
 * API para buscar dados de criação de personagem - Oblivion RPG
 * Retorna origens, legados, caminhos e reações para criação de personagem
 */

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
    require_once 'config/database.php';
    
    $pdo = Database::getConnection();
    
    // Buscar todas as origens
    $stmt = $pdo->query("
        SELECT id, nome, descricao_origem, pv_inicial, pe_inicial, dados_pv, dados_pe, 
               equipamento_inicial, habilidade_nome, habilidade_descricao, 
               atributo_inicial, ocupacao_inicial
        FROM origens 
        ORDER BY nome
    ");
    $origens = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Buscar todos os legados
    $stmt = $pdo->query("
        SELECT id, nome, descricao, deslocamento, calculo_defesa, 
               calculo_alerta, calculo_carga
        FROM legados 
        ORDER BY nome
    ");
    $legados = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Buscar todos os caminhos de legado
    $stmt = $pdo->query("
        SELECT cl.id, cl.legado_id, cl.nome_caminho,
               cl.habilidade_nome_1, cl.descricao_1, cl.custo_1,
               cl.habilidade_nome_2, cl.descricao_2, cl.custo_2,
               cl.habilidade_nome_3, cl.descricao_3, cl.custo_3,
               cl.habilidade_nome_4, cl.descricao_4, cl.custo_4,
               cl.habilidade_nome_5, cl.descricao_5, cl.custo_5
        FROM caminhos_legado cl
        ORDER BY cl.legado_id, cl.nome_caminho
    ");
    $caminhos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Buscar todas as reações do repositório
    $stmt = $pdo->query("
        SELECT id, nome, efeito, custo_reacao
        FROM reacoes_repositorio 
        ORDER BY nome
    ");
    $reacoes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Organizar caminhos por legado
    $caminhosPorLegado = [];
    foreach ($caminhos as $caminho) {
        $legadoId = $caminho['legado_id'];
        if (!isset($caminhosPorLegado[$legadoId])) {
            $caminhosPorLegado[$legadoId] = [];
        }
        $caminhosPorLegado[$legadoId][] = $caminho;
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'origens' => $origens,
            'legados' => $legados,
            'caminhos' => $caminhosPorLegado,
            'reacoes' => $reacoes
        ]
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Erro de banco de dados: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Erro interno: ' . $e->getMessage()
    ]);
}
?>
