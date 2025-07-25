<?php
/**
 * API para criar personagem completo - Oblivion RPG
 * Cria personagem com ficha completa, atributos, inventário, etc.
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
    echo json_encode(['error' => 'Método não permitido']);
    exit;
}

try {
    require_once 'config/database.php';
    
    $pdo = Database::getConnection();
    
    // Obter dados JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Dados inválidos');
    }
    
    // Validar campos obrigatórios
    $required = ['usuario_id', 'nome', 'origem_id', 'legado_id', 'caminho_legado_id', 'reacao_id', 'maestria_equipamento', 'atributos'];
    foreach ($required as $field) {
        if (!isset($input[$field]) || (is_string($input[$field]) && trim($input[$field]) === '')) {
            throw new Exception("Campo obrigatório: $field");
        }
    }
    
    // Validar tamanho da imagem se fornecida
    if (isset($input['foto_url']) && !empty($input['foto_url'])) {
        $imageSize = strlen($input['foto_url']);
        // Limite de 5MB para imagem em base64 (aproximadamente 7MB em base64)
        $maxImageSize = 7 * 1024 * 1024; // 7MB
        
        if ($imageSize > $maxImageSize) {
            throw new Exception('Imagem muito grande. Tamanho máximo: 5MB');
        }
    }
    
    // Validar atributos (devem somar 4, com possibilidade de 1 negativo)
    $atributos = $input['atributos'];
    $soma = array_sum($atributos);
    $negativos = array_filter($atributos, function($val) { return $val < 0; });
    
    if ($soma != 4) {
        throw new Exception('Os atributos devem somar exatamente 4 pontos');
    }
    
    if (count($negativos) > 1 || (count($negativos) == 1 && min($atributos) < -1)) {
        throw new Exception('Apenas um atributo pode ser negativo (-1)');
    }
    
    // Iniciar transação
    $pdo->beginTransaction();
    
    try {
        // 1. Buscar dados da origem
        $stmt = $pdo->prepare("SELECT * FROM origens WHERE id = ?");
        $stmt->execute([$input['origem_id']]);
        $origem = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$origem) {
            throw new Exception('Origem não encontrada');
        }
        
        // 2. Buscar dados do legado
        $stmt = $pdo->prepare("SELECT * FROM legados WHERE id = ?");
        $stmt->execute([$input['legado_id']]);
        $legado = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$legado) {
            throw new Exception('Legado não encontrado');
        }
        
        // 3. Buscar dados do caminho do legado
        $stmt = $pdo->prepare("SELECT * FROM caminhos_legado WHERE id = ? AND legado_id = ?");
        $stmt->execute([$input['caminho_legado_id'], $input['legado_id']]);
        $caminhoLegado = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$caminhoLegado) {
            throw new Exception('Caminho do legado não encontrado');
        }
        
        // 4. Criar personagem
        $stmt = $pdo->prepare("
            INSERT INTO personagens (usuario_id, nome, foto_url, campanha_id) 
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([
            $input['usuario_id'],
            $input['nome'],
            $input['foto_url'] ?? null,
            $input['campanha_id'] ?? null
        ]);
        $personagemId = $pdo->lastInsertId();
        
        // 5. Calcular valores iniciais
        // PV e PE da origem
        $pvInicial = $origem['pv_inicial'];
        $peInicial = $origem['pe_inicial'];
        
        // Aplicar atributo da origem
        $atributoOrigem = $origem['atributo_inicial'];
        if ($atributoOrigem) {
            // Remover o + se existir e converter para lowercase
            $atributoKey = strtolower(str_replace('+1 ', '', $atributoOrigem));
            
            // Mapear nomes de atributos
            $atributoMap = [
                'físico' => 'fisico',
                'fisico' => 'fisico',
                'vitalidade' => 'vitalidade',
                'técnica' => 'tecnica',
                'tecnica' => 'tecnica',
                'intelecto' => 'intelecto',
                'presença' => 'presenca',
                'presenca' => 'presenca',
                'vivência' => 'vivencia',
                'vivencia' => 'vivencia'
            ];
            
            if (isset($atributoMap[$atributoKey]) && isset($atributos[$atributoMap[$atributoKey]])) {
                $atributos[$atributoMap[$atributoKey]]++;
            }
        }
        
        // Calcular valores de defesa, alerta, etc. baseados no legado
        $deslocamento = (int) filter_var($legado['deslocamento'], FILTER_SANITIZE_NUMBER_INT);
        
        // Calcular defesa (exemplo: "8 + Presença ou Técnica")
        $defesa = 8; // valor base padrão
        if (strpos($legado['calculo_defesa'], 'Presença') !== false) {
            $defesa += $atributos['presenca'] ?? 0;
        } elseif (strpos($legado['calculo_defesa'], 'Técnica') !== false) {
            $defesa += $atributos['tecnica'] ?? 0;
        }
        
        // Calcular alerta (exemplo: "7 - Vivência")
        $alerta = 7 - ($atributos['vivencia'] ?? 0);
        
        // Calcular carga (exemplo: "5 + Físico")
        $cargaMax = 5 + ($atributos['fisico'] ?? 0);
        
        // 6. Criar ficha
        $stmt = $pdo->prepare("
            INSERT INTO fichas (
                personagem_id, nome_personagem, pv_atual, pv_max, pv_dados_status,
                pe_atual, pe_max, pe_dados_status, defesa, deslocamento, alerta,
                sorte, azar, testes_morte, testes_exaustao, legado_id, legado_secundario_id, caminho_legado_id, legado__caminho_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0, ?, ?, ?, ?)
        ");
        
        // Prepare secondary legacy and path values (null if not mestizo)
        $secondaryLegacyId = isset($input['legado_secundario_id']) && !empty($input['legado_secundario_id']) 
            ? $input['legado_secundario_id'] 
            : null;
        $secondaryPathId = isset($input['legado__caminho_id']) && !empty($input['legado__caminho_id']) 
            ? $input['legado__caminho_id'] 
            : null;
            
        $stmt->execute([
            $personagemId,
            $input['nome'],
            $pvInicial, $pvInicial, $origem['dados_pv'],
            $peInicial, $peInicial, $origem['dados_pe'],
            $defesa, $deslocamento, $alerta,
            $input['legado_id'], $secondaryLegacyId, $input['caminho_legado_id'], $secondaryPathId
        ]);
        $fichaId = $pdo->lastInsertId();
        
        // 7. Criar atributos
        $nomeAtributos = ['Físico', 'Vitalidade', 'Técnica', 'Intelecto', 'Presença', 'Vivência'];
        $chaveAtributos = ['fisico', 'vitalidade', 'tecnica', 'intelecto', 'presenca', 'vivencia'];
        
        for ($i = 0; $i < count($nomeAtributos); $i++) {
            $stmt = $pdo->prepare("
                INSERT INTO atributos (ficha_id, classe, nome, valor, bonus) 
                VALUES (?, ?, ?, ?, 0)
            ");
            $classe = '';
            if (in_array($nomeAtributos[$i], ['Físico', 'Vitalidade'])) $classe = 'Corpo';
            elseif (in_array($nomeAtributos[$i], ['Técnica', 'Intelecto'])) $classe = 'Mente';
            else $classe = 'Alma';
            
            $stmt->execute([
                $fichaId,
                $classe,
                $nomeAtributos[$i],
                $atributos[$chaveAtributos[$i]] ?? 0
            ]);
        }
        
        // 8. Criar inventário
        $stmt = $pdo->prepare("
            INSERT INTO inventario (ficha_id, carga_max, carga_atual, moeda_cobre, moeda_prata, moeda_ouro, moeda_platina, moeda_lumis) 
            VALUES (?, ?, 0, 0, 0, 0, 0, 0)
        ");
        $stmt->execute([$fichaId, $cargaMax]);
        $inventarioId = $pdo->lastInsertId();
        
        // 9. Adicionar itens iniciais da origem
        if (!empty($origem['equipamento_inicial'])) {
            $itens = explode(',', $origem['equipamento_inicial']);
            foreach ($itens as $item) {
                $item = trim($item);
                if (!empty($item)) {
                    $stmt = $pdo->prepare("
                        INSERT INTO itens_inventario (inventario_id, nome_item, descricao, quantidade, peso) 
                        VALUES (?, ?, 'Item inicial da origem', 1, 0)
                    ");
                    $stmt->execute([$inventarioId, $item]);
                }
            }
        }
        
        // 10. Criar maestria
        $stmt = $pdo->prepare("
            INSERT INTO maestria (ficha_id, pontos_atuais, pontos_gastos) 
            VALUES (?, 20, 0)
        ");
        $stmt->execute([$fichaId]);
        $maestriaId = $pdo->lastInsertId();
        
        // 11. Adicionar maestria de equipamento customizada
        $maestriaData = $input['maestria_equipamento'];
        if (!$maestriaData || !is_array($maestriaData)) {
            throw new Exception('Dados da maestria de equipamento são obrigatórios');
        }
        
        // Validar campos obrigatórios da maestria
        $requiredMaestria = ['nome', 'nivel', 'bonus', 'alvo_primario'];
        foreach ($requiredMaestria as $field) {
            if (!isset($maestriaData[$field]) || trim($maestriaData[$field]) === '') {
                throw new Exception("Campo obrigatório da maestria: $field");
            }
        }
        
        // Validar nível permitido na criação (apenas "Sem Treino" e "Básico")
        $niveisPermitidos = ['Sem Treino', 'Básico'];
        if (!in_array($maestriaData['nivel'], $niveisPermitidos)) {
            throw new Exception('Na criação de personagem, apenas os níveis "Sem Treino" e "Básico" são permitidos');
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO maestria_equipamento (maestria_id, nome, nivel, bonus, alvo_primario) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $maestriaId, 
            $maestriaData['nome'], 
            $maestriaData['nivel'], 
            $maestriaData['bonus'], 
            $maestriaData['alvo_primario']
        ]);
        
        // 12. Adicionar ocupação inicial se houver
        if (!empty($origem['ocupacao_inicial']) && $origem['ocupacao_inicial'] !== 'Nenhuma') {
            $stmt = $pdo->prepare("
                INSERT INTO maestria_ocupacao (maestria_id, nome, titulo, bonus_teste) 
                VALUES (?, ?, 'Iniciante', '+1 em testes relacionados')
            ");
            $stmt->execute([$maestriaId, $origem['ocupacao_inicial']]);
        }
        
        // 13. Adicionar reação escolhida
        $stmt = $pdo->prepare("
            INSERT INTO reacoes (ficha_id, reacao_repositorio_id, nome, efeito, custo_reacao) 
            SELECT ?, id, nome, efeito, custo_reacao 
            FROM reacoes_repositorio 
            WHERE id = ?
        ");
        $stmt->execute([$fichaId, $input['reacao_id']]);
        
        // Commit da transação
        $pdo->commit();
        
        // Retornar sucesso com dados do personagem criado
        echo json_encode([
            'success' => true,
            'message' => 'Personagem criado com sucesso!',
            'data' => [
                'personagem_id' => $personagemId,
                'ficha_id' => $fichaId,
                'nome' => $input['nome'],
                'pv_max' => $pvInicial,
                'pe_max' => $peInicial
            ]
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Erro de banco de dados: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
?>
