<?php
/**
 * API para gerenciamento de NPCs - Oblivion RPG
 */

// Configurações de erro para garantir JSON puro
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/php_errors.log');

// Buffer de saída para capturar qualquer HTML indesejado
ob_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    exit(0);
}

require_once 'config/database.php';

try {
    $config = Config::load();
    $db = new PDO(
        "mysql:host={$config['db_host']};dbname={$config['db_name']};charset={$config['db_charset']}",
        $config['db_user'],
        $config['db_pass'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );

    $method = $_SERVER['REQUEST_METHOD'];
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    
    // Se o JSON falhou, tentar usar dados POST diretamente
    if ($input === null && !empty($_POST)) {
        $input = $_POST;
    }

    switch ($method) {
        case 'GET':
            if (isset($_GET['campaign_id'])) {
                getCampaignNpcs($db, $_GET['campaign_id'], $_GET['user_id'] ?? null);
            } elseif (isset($_GET['npc_id'])) {
                getNpcDetails($db, $_GET['npc_id'], $_GET['user_id'] ?? null);
            } else {
                ob_end_clean();
                http_response_code(400);
                echo json_encode(['error' => 'Parâmetros insuficientes']);
            }
            break;

        case 'POST':
            createNpc($db, $input);
            break;

        case 'PUT':
            updateNpc($db, $input);
            break;

        case 'DELETE':
            deleteNpc($db, $input);
            break;

        default:
            ob_end_clean();
            http_response_code(405);
            echo json_encode(['error' => 'Método não permitido']);
            break;
    }

} catch (Exception $e) {
    // Log detalhado do erro
    error_log("Erro no npcs.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    error_log("Linha do erro: " . $e->getLine());
    error_log("Arquivo do erro: " . $e->getFile());
    
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'error' => 'Erro interno do servidor: ' . $e->getMessage(),
        'details' => [
            'line' => $e->getLine(),
            'file' => basename($e->getFile())
        ]
    ]);
}

/**
 * Buscar NPCs de uma campanha
 */
function getCampaignNpcs($db, $campaign_id, $user_id) {
    try {
        // Verificar se o usuário tem acesso à campanha
        if (!hasAccessToCampaign($db, $campaign_id, $user_id)) {
            ob_end_clean();
            http_response_code(403);
            echo json_encode(['error' => 'Você não tem permissão para acessar esta campanha']);
            return;
        }

        $query = "SELECT id, nome_npc, imagem_url, pv_atual, pv_max, defesa
                  FROM fichas_npc 
                  WHERE campanha_id = :campaign_id 
                  ORDER BY nome_npc ASC";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':campaign_id', $campaign_id, PDO::PARAM_INT);
        $stmt->execute();

        $npcs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        ob_end_clean();
        echo json_encode([
            'success' => true,
            'npcs' => $npcs
        ]);

    } catch (Exception $e) {
        ob_end_clean();
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao buscar NPCs: ' . $e->getMessage()]);
    }
}

/**
 * Buscar detalhes completos de um NPC
 */
function getNpcDetails($db, $npc_id, $user_id) {
    try {
        // Buscar NPC básico
        $query = "SELECT fn.*, c.mestre_id
                  FROM fichas_npc fn
                  INNER JOIN campanhas c ON fn.campanha_id = c.id
                  WHERE fn.id = :npc_id";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
        $stmt->execute();

        $npc = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$npc) {
            ob_end_clean();
            http_response_code(404);
            echo json_encode(['error' => 'NPC não encontrado']);
            return;
        }

        // Verificar permissões
        if (!hasAccessToCampaign($db, $npc['campanha_id'], $user_id)) {
            ob_end_clean();
            http_response_code(403);
            echo json_encode(['error' => 'Você não tem permissão para acessar este NPC']);
            return;
        }

        // Buscar ações
        $actionsQuery = "SELECT * FROM npc_acoes WHERE npc_id = :npc_id ORDER BY nome ASC";
        $actionsStmt = $db->prepare($actionsQuery);
        $actionsStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
        $actionsStmt->execute();
        $npc['acoes'] = $actionsStmt->fetchAll(PDO::FETCH_ASSOC);

        // Buscar reações
        $reactionsQuery = "SELECT * FROM npc_reacoes WHERE npc_id = :npc_id ORDER BY nome ASC";
        $reactionsStmt = $db->prepare($reactionsQuery);
        $reactionsStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
        $reactionsStmt->execute();
        $npc['reacoes'] = $reactionsStmt->fetchAll(PDO::FETCH_ASSOC);

        // Buscar habilidades
        $abilitiesQuery = "SELECT * FROM npc_habilidades WHERE npc_id = :npc_id ORDER BY nome ASC";
        $abilitiesStmt = $db->prepare($abilitiesQuery);
        $abilitiesStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
        $abilitiesStmt->execute();
        $npc['habilidades'] = $abilitiesStmt->fetchAll(PDO::FETCH_ASSOC);

        // Buscar pontos fracos
        $weaknessesQuery = "SELECT * FROM npc_pontos_fracos WHERE npc_id = :npc_id ORDER BY nome ASC";
        $weaknessesStmt = $db->prepare($weaknessesQuery);
        $weaknessesStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
        $weaknessesStmt->execute();
        $npc['pontos_fracos'] = $weaknessesStmt->fetchAll(PDO::FETCH_ASSOC);

        // Buscar saque
        $saqueQuery = "SELECT * FROM npc_saque WHERE npc_id = :npc_id ORDER BY nome_item ASC";
        $saqueStmt = $db->prepare($saqueQuery);
        $saqueStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
        $saqueStmt->execute();
        $npc['saque'] = $saqueStmt->fetchAll(PDO::FETCH_ASSOC);

        // Buscar anotações
        $anotacoesQuery = "SELECT * FROM npc_anotacoes WHERE npc_id = :npc_id ORDER BY id ASC";
        $anotacoesStmt = $db->prepare($anotacoesQuery);
        $anotacoesStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
        $anotacoesStmt->execute();
        $npc['anotacoes'] = $anotacoesStmt->fetchAll(PDO::FETCH_ASSOC);

        ob_end_clean();
        echo json_encode([
            'success' => true,
            'npc' => $npc
        ]);

    } catch (Exception $e) {
        ob_end_clean();
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao buscar detalhes do NPC: ' . $e->getMessage()]);
    }
}

/**
 * Criar novo NPC
 */
function createNpc($db, $input) {
    try {
        // Debug temporário
        error_log("createNpc chamada com input: " . print_r($input, true));
        
        // Validação básica
        if (!isset($input['campanha_id'])) {
            error_log("Erro: campanha_id não encontrado");
            ob_end_clean();
            http_response_code(400);
            echo json_encode(['error' => 'campanha_id é obrigatório']);
            return;
        }
        
        if (!isset($input['nome_npc']) || empty(trim($input['nome_npc']))) {
            error_log("Erro: nome_npc não encontrado ou vazio");
            ob_end_clean();
            http_response_code(400);
            echo json_encode(['error' => 'nome_npc é obrigatório']);
            return;
        }
        
        if (!isset($input['user_id'])) {
            error_log("Erro: user_id não encontrado");
            ob_end_clean();
            http_response_code(400);
            echo json_encode(['error' => 'user_id é obrigatório']);
            return;
        }

        // Verificar se o usuário é mestre da campanha
        if (!isCampaignMaster($db, $input['campanha_id'], $input['user_id'])) {
            ob_end_clean();
            http_response_code(403);
            echo json_encode(['error' => 'Apenas o mestre pode criar NPCs']);
            return;
        }

        $db->beginTransaction();

        // Inserir NPC principal
        error_log("Tentando inserir NPC principal...");
        $npcQuery = "INSERT INTO fichas_npc (
            campanha_id, nome_npc, imagem_url, pv_atual, pv_max, movimento, 
            defesa, classe_conjuracao, classe_manobra, atributo_corpo, 
            atributo_mente, atributo_alma
        ) VALUES (
            :campanha_id, :nome_npc, :imagem_url, :pv_atual, :pv_max, :movimento,
            :defesa, :classe_conjuracao, :classe_manobra, :atributo_corpo,
            :atributo_mente, :atributo_alma
        )";

        $stmt = $db->prepare($npcQuery);
        
        // Converter tipos para garantir consistência
        $campanha_id = (int) $input['campanha_id'];
        $pv_atual = (int) ($input['pv_atual'] ?? 0);
        $pv_max = (int) ($input['pv_max'] ?? 0);
        $defesa = (int) ($input['defesa'] ?? 0);
        $classe_conjuracao = (int) ($input['classe_conjuracao'] ?? 0);
        $classe_manobra = (int) ($input['classe_manobra'] ?? 0);
        $atributo_corpo = (int) ($input['atributo_corpo'] ?? 0);
        $atributo_mente = (int) ($input['atributo_mente'] ?? 0);
        $atributo_alma = (int) ($input['atributo_alma'] ?? 0);
        
        $stmt->bindParam(':campanha_id', $campanha_id, PDO::PARAM_INT);
        $stmt->bindParam(':nome_npc', $input['nome_npc']);
        $stmt->bindParam(':imagem_url', $input['imagem_url']);
        $stmt->bindParam(':pv_atual', $pv_atual, PDO::PARAM_INT);
        $stmt->bindParam(':pv_max', $pv_max, PDO::PARAM_INT);
        $stmt->bindParam(':movimento', $input['movimento']);
        $stmt->bindParam(':defesa', $defesa, PDO::PARAM_INT);
        $stmt->bindParam(':classe_conjuracao', $classe_conjuracao, PDO::PARAM_INT);
        $stmt->bindParam(':classe_manobra', $classe_manobra, PDO::PARAM_INT);
        $stmt->bindParam(':atributo_corpo', $atributo_corpo, PDO::PARAM_INT);
        $stmt->bindParam(':atributo_mente', $atributo_mente, PDO::PARAM_INT);
        $stmt->bindParam(':atributo_alma', $atributo_alma, PDO::PARAM_INT);
        
        $stmt->execute();
        error_log("NPC principal inserido com sucesso!");

        $npc_id = $db->lastInsertId();
        error_log("ID do NPC criado: " . $npc_id);

        // Inserir ações
        error_log("Tentando inserir ações...");
        if (isset($input['acoes']) && is_array($input['acoes'])) {
            error_log("Número de ações a inserir: " . count($input['acoes']));
            foreach ($input['acoes'] as $index => $acao) {
                if (!empty($acao['nome'])) {
                    error_log("Inserindo ação $index: " . $acao['nome']);
                    $actionQuery = "INSERT INTO npc_acoes (npc_id, nome, quantidade_acoes, efeito, extra) 
                                   VALUES (:npc_id, :nome, :quantidade_acoes, :efeito, :extra)";
                    $actionStmt = $db->prepare($actionQuery);
                    $actionStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
                    $actionStmt->bindParam(':nome', $acao['nome']);
                    
                    // Criar variáveis para bindParam
                    $quantidade_acoes = $acao['quantidade_acoes'] ?? 1;
                    $efeito = $acao['efeito'] ?? null;
                    $extra = $acao['extra'] ?? null;
                    
                    $actionStmt->bindParam(':quantidade_acoes', $quantidade_acoes, PDO::PARAM_INT);
                    $actionStmt->bindParam(':efeito', $efeito);
                    $actionStmt->bindParam(':extra', $extra);
                    $actionStmt->execute();
                    error_log("Ação $index inserida com sucesso!");
                }
            }
        }

        // Inserir reações
        error_log("Tentando inserir reações...");
        if (isset($input['reacoes']) && is_array($input['reacoes'])) {
            error_log("Número de reações a inserir: " . count($input['reacoes']));
            foreach ($input['reacoes'] as $index => $reacao) {
                if (!empty($reacao['nome'])) {
                    error_log("Inserindo reação $index: " . $reacao['nome']);
                    $reactionQuery = "INSERT INTO npc_reacoes (npc_id, nome, quantidade_reacoes, efeito, extra) 
                                     VALUES (:npc_id, :nome, :quantidade_reacoes, :efeito, :extra)";
                    $reactionStmt = $db->prepare($reactionQuery);
                    $reactionStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
                    $reactionStmt->bindParam(':nome', $reacao['nome']);
                    
                    // Criar variáveis para bindParam
                    $quantidade_reacoes = $reacao['quantidade_reacoes'] ?? 1;
                    $efeito = $reacao['efeito'] ?? null;
                    $extra = $reacao['extra'] ?? null;
                    
                    $reactionStmt->bindParam(':quantidade_reacoes', $quantidade_reacoes, PDO::PARAM_INT);
                    $reactionStmt->bindParam(':efeito', $efeito);
                    $reactionStmt->bindParam(':extra', $extra);
                    $reactionStmt->execute();
                    error_log("Reação $index inserida com sucesso!");
                }
            }
        }

        // Inserir habilidades
        error_log("Tentando inserir habilidades...");
        if (isset($input['habilidades']) && is_array($input['habilidades'])) {
            error_log("Número de habilidades a inserir: " . count($input['habilidades']));
            foreach ($input['habilidades'] as $index => $habilidade) {
                if (!empty($habilidade['nome'])) {
                    error_log("Inserindo habilidade $index: " . $habilidade['nome']);
                    $abilityQuery = "INSERT INTO npc_habilidades (npc_id, nome, efeito) 
                                    VALUES (:npc_id, :nome, :efeito)";
                    $abilityStmt = $db->prepare($abilityQuery);
                    $abilityStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
                    $abilityStmt->bindParam(':nome', $habilidade['nome']);
                    
                    // Criar variável para bindParam
                    $efeito = $habilidade['efeito'] ?? null;
                    $abilityStmt->bindParam(':efeito', $efeito);
                    $abilityStmt->execute();
                    error_log("Habilidade $index inserida com sucesso!");
                }
            }
        }

        // Inserir pontos fracos
        error_log("Tentando inserir pontos fracos...");
        if (isset($input['pontos_fracos']) && is_array($input['pontos_fracos'])) {
            error_log("Número de pontos fracos a inserir: " . count($input['pontos_fracos']));
            foreach ($input['pontos_fracos'] as $index => $ponto_fraco) {
                if (!empty($ponto_fraco['nome'])) {
                    error_log("Inserindo ponto fraco $index: " . $ponto_fraco['nome']);
                    $weaknessQuery = "INSERT INTO npc_pontos_fracos (npc_id, nome, efeito) 
                                     VALUES (:npc_id, :nome, :efeito)";
                    $weaknessStmt = $db->prepare($weaknessQuery);
                    $weaknessStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
                    $weaknessStmt->bindParam(':nome', $ponto_fraco['nome']);
                    
                    // Criar variável para bindParam
                    $efeito = $ponto_fraco['efeito'] ?? null;
                    $weaknessStmt->bindParam(':efeito', $efeito);
                    $weaknessStmt->execute();
                    error_log("Ponto fraco $index inserido com sucesso!");
                }
            }
        }

        // Inserir saque
        error_log("Tentando inserir saque...");
        if (isset($input['saque']) && is_array($input['saque'])) {
            error_log("Número de itens de saque a inserir: " . count($input['saque']));
            foreach ($input['saque'] as $index => $item) {
                if (!empty($item['nome_item'])) {
                    error_log("Inserindo item de saque $index: " . $item['nome_item']);
                    $saqueQuery = "INSERT INTO npc_saque (npc_id, nome_item, peso, custo, descricao) 
                                   VALUES (:npc_id, :nome_item, :peso, :custo, :descricao)";
                    $saqueStmt = $db->prepare($saqueQuery);
                    $saqueStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
                    $saqueStmt->bindParam(':nome_item', $item['nome_item']);
                    
                    // Criar variáveis para bindParam
                    $peso = $item['peso'] ?? 0.00;
                    $custo = $item['custo'] ?? 0.00;
                    $descricao = $item['descricao'] ?? null;
                    
                    $saqueStmt->bindParam(':peso', $peso);
                    $saqueStmt->bindParam(':custo', $custo);
                    $saqueStmt->bindParam(':descricao', $descricao);
                    $saqueStmt->execute();
                    error_log("Item de saque $index inserido com sucesso!");
                }
            }
        }

        // Inserir anotações
        error_log("Tentando inserir anotações...");
        if (isset($input['anotacoes']) && is_array($input['anotacoes'])) {
            error_log("Número de anotações a inserir: " . count($input['anotacoes']));
            foreach ($input['anotacoes'] as $index => $anotacao) {
                if (!empty($anotacao['anotacoes'])) {
                    error_log("Inserindo anotação $index");
                    $anotacaoQuery = "INSERT INTO npc_anotacoes (npc_id, anotacoes) 
                                     VALUES (:npc_id, :anotacoes)";
                    $anotacaoStmt = $db->prepare($anotacaoQuery);
                    $anotacaoStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
                    $anotacaoStmt->bindParam(':anotacoes', $anotacao['anotacoes']);
                    $anotacaoStmt->execute();
                    error_log("Anotação $index inserida com sucesso!");
                }
            }
        }

        $db->commit();

        ob_end_clean();
        echo json_encode([
            'success' => true,
            'message' => 'NPC criado com sucesso',
            'npc_id' => $npc_id
        ]);

    } catch (Exception $e) {
        $db->rollBack();
        
        // Log detalhado do erro
        error_log("Erro ao criar NPC: " . $e->getMessage());
        error_log("Trace: " . $e->getTraceAsString());
        error_log("Input recebido: " . print_r($input, true));
        
        ob_end_clean();
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao criar NPC: ' . $e->getMessage()]);
    }
}

/**
 * Atualizar NPC existente
 */
function updateNpc($db, $input) {
    try {
        // Debug temporário
        error_log("updateNpc chamada com input: " . print_r($input, true));
        
        if (!isset($input['npc_id'])) {
            error_log("Erro: npc_id não encontrado");
            ob_end_clean();
            http_response_code(400);
            echo json_encode(['error' => 'npc_id é obrigatório']);
            return;
        }
        
        if (!isset($input['user_id'])) {
            error_log("Erro: user_id não encontrado");
            ob_end_clean();
            http_response_code(400);
            echo json_encode(['error' => 'user_id é obrigatório']);
            return;
        }

        // Converter tipos para garantir consistência  
        $npc_id = (int) $input['npc_id'];
        $pv_atual = (int) ($input['pv_atual'] ?? 0);
        $pv_max = (int) ($input['pv_max'] ?? 0);
        $defesa = (int) ($input['defesa'] ?? 0);
        $classe_conjuracao = (int) ($input['classe_conjuracao'] ?? 0);
        $classe_manobra = (int) ($input['classe_manobra'] ?? 0);
        $atributo_corpo = (int) ($input['atributo_corpo'] ?? 0);
        $atributo_mente = (int) ($input['atributo_mente'] ?? 0);
        $atributo_alma = (int) ($input['atributo_alma'] ?? 0);

        // Verificar se o usuário é mestre da campanha
        $campaignCheck = "SELECT campanha_id FROM fichas_npc WHERE id = :npc_id";
        $campaignStmt = $db->prepare($campaignCheck);
        $campaignStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
        $campaignStmt->execute();
        $result = $campaignStmt->fetch();

        if (!$result || !isCampaignMaster($db, $result['campanha_id'], $input['user_id'])) {
            ob_end_clean();
            http_response_code(403);
            echo json_encode(['error' => 'Apenas o mestre pode editar NPCs']);
            return;
        }

        $db->beginTransaction();
        error_log("Transação iniciada com sucesso");

        // Log da estrutura das tabelas para debugging
        $tables = ['npc_acoes', 'npc_reacoes', 'npc_habilidades', 'npc_pontos_fracos', 'npc_saque', 'npc_anotacoes'];
        foreach ($tables as $table) {
            try {
                $descStmt = $db->prepare("DESCRIBE $table");
                $descStmt->execute();
                $structure = $descStmt->fetchAll(PDO::FETCH_ASSOC);
                error_log("=== ESTRUTURA DA TABELA $table ===");
                foreach ($structure as $column) {
                    error_log("  Campo: {$column['Field']}, Tipo: {$column['Type']}, Null: {$column['Null']}, Key: {$column['Key']}, Default: {$column['Default']}");
                }
                error_log("=== FIM ESTRUTURA $table ===");
            } catch (Exception $e) {
                error_log("Erro ao obter estrutura da tabela $table: " . $e->getMessage());
            }
        }

        // Atualizar dados principais do NPC
        $updateQuery = "UPDATE fichas_npc SET 
                        nome_npc = :nome_npc,
                        imagem_url = :imagem_url,
                        pv_atual = :pv_atual,
                        pv_max = :pv_max,
                        movimento = :movimento,
                        defesa = :defesa,
                        classe_conjuracao = :classe_conjuracao,
                        classe_manobra = :classe_manobra,
                        atributo_corpo = :atributo_corpo,
                        atributo_mente = :atributo_mente,
                        atributo_alma = :atributo_alma
                        WHERE id = :npc_id";

        error_log("Query principal preparada");
        $stmt = $db->prepare($updateQuery);
        $stmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
        $stmt->bindParam(':nome_npc', $input['nome_npc']);
        $stmt->bindParam(':imagem_url', $input['imagem_url']);
        $stmt->bindParam(':pv_atual', $pv_atual, PDO::PARAM_INT);
        $stmt->bindParam(':pv_max', $pv_max, PDO::PARAM_INT);
        $stmt->bindParam(':movimento', $input['movimento']);
        $stmt->bindParam(':defesa', $defesa, PDO::PARAM_INT);
        $stmt->bindParam(':classe_conjuracao', $classe_conjuracao, PDO::PARAM_INT);
        $stmt->bindParam(':classe_manobra', $classe_manobra, PDO::PARAM_INT);
        $stmt->bindParam(':atributo_corpo', $atributo_corpo, PDO::PARAM_INT);
        $stmt->bindParam(':atributo_mente', $atributo_mente, PDO::PARAM_INT);
        $stmt->bindParam(':atributo_alma', $atributo_alma, PDO::PARAM_INT);
        
        error_log("Parâmetros vinculados, executando query principal");
        $stmt->execute();
        error_log("Query principal executada com sucesso");

        // Deletar todos os registros relacionados para recriar
        error_log("Iniciando delete de registros relacionados");
        $deleteQueries = [
            "DELETE FROM npc_acoes WHERE npc_id = :npc_id",
            "DELETE FROM npc_reacoes WHERE npc_id = :npc_id",
            "DELETE FROM npc_habilidades WHERE npc_id = :npc_id",
            "DELETE FROM npc_pontos_fracos WHERE npc_id = :npc_id",
            "DELETE FROM npc_saque WHERE npc_id = :npc_id",
            "DELETE FROM npc_anotacoes WHERE npc_id = :npc_id"
        ];

        foreach ($deleteQueries as $deleteQuery) {
            error_log("Executando delete: " . $deleteQuery);
            $deleteStmt = $db->prepare($deleteQuery);
            $deleteStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
            $deleteStmt->execute();
        }
        error_log("Deletes completados");

        // Recriar ações
        if (isset($input['acoes']) && is_array($input['acoes'])) {
            error_log("Processando " . count($input['acoes']) . " ações");
            foreach ($input['acoes'] as $index => $acao) {
                if (!empty($acao['nome'])) {
                    error_log("Inserindo ação $index: " . $acao['nome']);
                    error_log("Dados da ação: " . print_r($acao, true));
                    try {
                        $actionQuery = "INSERT INTO npc_acoes (npc_id, nome, quantidade_acoes, efeito, extra) 
                                       VALUES (:npc_id, :nome, :quantidade_acoes, :efeito, :extra)";
                        error_log("Query preparada: " . $actionQuery);
                        $actionStmt = $db->prepare($actionQuery);
                        error_log("Statement preparado com sucesso");
                        
                        error_log("Vinculando parâmetros...");
                        $actionStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
                        error_log("npc_id vinculado: " . $npc_id);
                        $actionStmt->bindParam(':nome', $acao['nome']);
                        error_log("nome vinculado: " . $acao['nome']);
                        
                        // Criar variáveis para bindParam (não pode usar expressões diretamente)
                        $quantidade_acoes = $acao['quantidade_acoes'] ?? 1;
                        $efeito = $acao['efeito'] ?? null;
                        $extra = $acao['extra'] ?? null;
                        
                        $actionStmt->bindParam(':quantidade_acoes', $quantidade_acoes, PDO::PARAM_INT);
                        error_log("quantidade_acoes vinculado: " . $quantidade_acoes);
                        $actionStmt->bindParam(':efeito', $efeito);
                        error_log("efeito vinculado: " . ($efeito ?? 'null'));
                        $actionStmt->bindParam(':extra', $extra);
                        error_log("extra vinculado: " . ($extra ?? 'null'));
                        
                        error_log("Executando query...");
                        $result = $actionStmt->execute();
                        error_log("Execute result: " . ($result ? 'true' : 'false'));
                        
                        if ($result) {
                            error_log("Ação $index inserida com sucesso!");
                        } else {
                            error_log("Execute retornou false!");
                            $errorInfo = $actionStmt->errorInfo();
                            error_log("Error Info: " . print_r($errorInfo, true));
                        }
                    } catch (Exception $e) {
                        error_log("ERRO ao inserir ação $index: " . $e->getMessage());
                        error_log("SQLSTATE: " . $e->getCode());
                        if (method_exists($e, 'errorInfo')) {
                            error_log("Error Info: " . print_r($e->errorInfo, true));
                        }
                        throw $e;
                    }
                }
            }
        }

        // Recriar reações
        if (isset($input['reacoes']) && is_array($input['reacoes'])) {
            error_log("Processando " . count($input['reacoes']) . " reações");
            foreach ($input['reacoes'] as $index => $reacao) {
                if (!empty($reacao['nome'])) {
                    error_log("Inserindo reação $index: " . $reacao['nome']);
                    try {
                        $reactionQuery = "INSERT INTO npc_reacoes (npc_id, nome, quantidade_reacoes, efeito, extra) 
                                         VALUES (:npc_id, :nome, :quantidade_reacoes, :efeito, :extra)";
                        $reactionStmt = $db->prepare($reactionQuery);
                        $reactionStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
                        $reactionStmt->bindParam(':nome', $reacao['nome']);
                        
                        // Criar variáveis para bindParam
                        $quantidade_reacoes = $reacao['quantidade_reacoes'] ?? 1;
                        $efeito = $reacao['efeito'] ?? null;
                        $extra = $reacao['extra'] ?? null;
                        
                        $reactionStmt->bindParam(':quantidade_reacoes', $quantidade_reacoes, PDO::PARAM_INT);
                        $reactionStmt->bindParam(':efeito', $efeito);
                        $reactionStmt->bindParam(':extra', $extra);
                        $reactionStmt->execute();
                        error_log("Reação $index inserida com sucesso!");
                    } catch (Exception $e) {
                        error_log("ERRO ao inserir reação $index: " . $e->getMessage());
                        throw $e;
                    }
                }
            }
        }

        // Recriar habilidades
        if (isset($input['habilidades']) && is_array($input['habilidades'])) {
            error_log("Processando " . count($input['habilidades']) . " habilidades");
            foreach ($input['habilidades'] as $index => $habilidade) {
                if (!empty($habilidade['nome'])) {
                    error_log("Inserindo habilidade $index: " . $habilidade['nome']);
                    try {
                        $abilityQuery = "INSERT INTO npc_habilidades (npc_id, nome, efeito) 
                                        VALUES (:npc_id, :nome, :efeito)";
                        $abilityStmt = $db->prepare($abilityQuery);
                        $abilityStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
                        $abilityStmt->bindParam(':nome', $habilidade['nome']);
                        
                        // Criar variável para bindParam
                        $efeito = $habilidade['efeito'] ?? null;
                        $abilityStmt->bindParam(':efeito', $efeito);
                        $abilityStmt->execute();
                        error_log("Habilidade $index inserida com sucesso!");
                    } catch (Exception $e) {
                        error_log("ERRO ao inserir habilidade $index: " . $e->getMessage());
                        throw $e;
                    }
                }
            }
        }

        // Recriar pontos fracos
        if (isset($input['pontos_fracos']) && is_array($input['pontos_fracos'])) {
            error_log("Processando " . count($input['pontos_fracos']) . " pontos fracos");
            foreach ($input['pontos_fracos'] as $index => $ponto_fraco) {
                if (!empty($ponto_fraco['nome'])) {
                    error_log("Inserindo ponto fraco $index: " . $ponto_fraco['nome']);
                    try {
                        $weaknessQuery = "INSERT INTO npc_pontos_fracos (npc_id, nome, efeito) 
                                         VALUES (:npc_id, :nome, :efeito)";
                        $weaknessStmt = $db->prepare($weaknessQuery);
                        $weaknessStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
                        $weaknessStmt->bindParam(':nome', $ponto_fraco['nome']);
                        
                        // Criar variável para bindParam
                        $efeito = $ponto_fraco['efeito'] ?? null;
                        $weaknessStmt->bindParam(':efeito', $efeito);
                        $weaknessStmt->execute();
                        error_log("Ponto fraco $index inserido com sucesso!");
                    } catch (Exception $e) {
                        error_log("ERRO ao inserir ponto fraco $index: " . $e->getMessage());
                        throw $e;
                    }
                }
            }
        }

        // Recriar saque
        if (isset($input['saque']) && is_array($input['saque'])) {
            error_log("Processando " . count($input['saque']) . " itens de saque");
            foreach ($input['saque'] as $index => $item) {
                if (!empty($item['nome_item'])) {
                    error_log("Inserindo item de saque $index: " . $item['nome_item']);
                    try {
                        $saqueQuery = "INSERT INTO npc_saque (npc_id, nome_item, peso, custo, descricao) 
                                       VALUES (:npc_id, :nome_item, :peso, :custo, :descricao)";
                        $saqueStmt = $db->prepare($saqueQuery);
                        $saqueStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
                        $saqueStmt->bindParam(':nome_item', $item['nome_item']);
                        
                        // Criar variáveis para bindParam
                        $peso = $item['peso'] ?? 0.00;
                        $custo = $item['custo'] ?? 0.00;
                        $descricao = $item['descricao'] ?? null;
                        
                        $saqueStmt->bindParam(':peso', $peso);
                        $saqueStmt->bindParam(':custo', $custo);
                        $saqueStmt->bindParam(':descricao', $descricao);
                        $saqueStmt->execute();
                        error_log("Item de saque $index inserido com sucesso!");
                    } catch (Exception $e) {
                        error_log("ERRO ao inserir item de saque $index: " . $e->getMessage());
                        throw $e;
                    }
                }
            }
        }

        // Recriar anotações
        if (isset($input['anotacoes']) && is_array($input['anotacoes'])) {
            error_log("Processando " . count($input['anotacoes']) . " anotações");
            foreach ($input['anotacoes'] as $index => $anotacao) {
                if (!empty($anotacao['anotacoes'])) {
                    error_log("Inserindo anotação $index");
                    try {
                        $anotacaoQuery = "INSERT INTO npc_anotacoes (npc_id, anotacoes) 
                                         VALUES (:npc_id, :anotacoes)";
                        $anotacaoStmt = $db->prepare($anotacaoQuery);
                        $anotacaoStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
                        $anotacaoStmt->bindParam(':anotacoes', $anotacao['anotacoes']);
                        $anotacaoStmt->execute();
                        error_log("Anotação $index inserida com sucesso!");
                    } catch (Exception $e) {
                        error_log("ERRO ao inserir anotação $index: " . $e->getMessage());
                        throw $e;
                    }
                }
            }
        }

        $db->commit();

        ob_end_clean();
        echo json_encode([
            'success' => true,
            'message' => 'NPC atualizado com sucesso'
        ]);

    } catch (Exception $e) {
        $db->rollBack();
        
        // Log detalhado do erro
        error_log("Erro ao atualizar NPC: " . $e->getMessage());
        error_log("Trace: " . $e->getTraceAsString());
        error_log("Input recebido: " . print_r($input, true));
        
        ob_end_clean();
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao atualizar NPC: ' . $e->getMessage()]);
    }
}

/**
 * Deletar NPC
 */
function deleteNpc($db, $input) {
    try {
        if (!isset($input['npc_id'])) {
            ob_end_clean();
            http_response_code(400);
            echo json_encode(['error' => 'npc_id é obrigatório']);
            return;
        }
        
        if (!isset($input['user_id'])) {
            ob_end_clean();
            http_response_code(400);
            echo json_encode(['error' => 'user_id é obrigatório']);
            return;
        }

        $npc_id = (int) $input['npc_id'];

        // Verificar se o usuário é mestre da campanha
        $campaignCheck = "SELECT campanha_id FROM fichas_npc WHERE id = :npc_id";
        $campaignStmt = $db->prepare($campaignCheck);
        $campaignStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
        $campaignStmt->execute();
        $result = $campaignStmt->fetch();

        if (!$result || !isCampaignMaster($db, $result['campanha_id'], $input['user_id'])) {
            ob_end_clean();
            http_response_code(403);
            echo json_encode(['error' => 'Apenas o mestre pode deletar NPCs']);
            return;
        }

        $db->beginTransaction();

        // Deletar todos os registros relacionados
        $deleteQueries = [
            "DELETE FROM npc_acoes WHERE npc_id = :npc_id",
            "DELETE FROM npc_reacoes WHERE npc_id = :npc_id",
            "DELETE FROM npc_habilidades WHERE npc_id = :npc_id",
            "DELETE FROM npc_pontos_fracos WHERE npc_id = :npc_id",
            "DELETE FROM npc_saque WHERE npc_id = :npc_id",
            "DELETE FROM npc_anotacoes WHERE npc_id = :npc_id",
            "DELETE FROM fichas_npc WHERE id = :npc_id"
        ];

        foreach ($deleteQueries as $deleteQuery) {
            $deleteStmt = $db->prepare($deleteQuery);
            $deleteStmt->bindParam(':npc_id', $npc_id, PDO::PARAM_INT);
            $deleteStmt->execute();
        }

        $db->commit();

        ob_end_clean();
        echo json_encode([
            'success' => true,
            'message' => 'NPC deletado com sucesso'
        ]);

    } catch (Exception $e) {
        $db->rollBack();
        ob_end_clean();
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao deletar NPC: ' . $e->getMessage()]);
    }
}

/**
 * Verificar se usuário tem acesso à campanha
 */
function hasAccessToCampaign($db, $campaign_id, $user_id) {
    $query = "SELECT 1 FROM campanhas c
              LEFT JOIN personagens p ON p.campanha_id = c.id
              WHERE c.id = :campaign_id 
              AND (c.mestre_id = :user_id OR p.usuario_id = :user_id)";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':campaign_id', $campaign_id, PDO::PARAM_INT);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    
    return $stmt->fetch() !== false;
}

/**
 * Verificar se usuário é mestre da campanha
 */
function isCampaignMaster($db, $campaign_id, $user_id) {
    $query = "SELECT 1 FROM campanhas WHERE id = :campaign_id AND mestre_id = :user_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':campaign_id', $campaign_id, PDO::PARAM_INT);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    
    return $stmt->fetch() !== false;
}
?>
