<?php
/**
 * API para upload de imagens - Salvar no banco de dados como base64
 * Oblivion RPG
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
    // Verificar se foi enviado um arquivo
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        $errorMsg = 'Erro no upload';
        if (isset($_FILES['image']['error'])) {
            switch ($_FILES['image']['error']) {
                case UPLOAD_ERR_INI_SIZE:
                case UPLOAD_ERR_FORM_SIZE:
                    $errorMsg = 'Arquivo muito grande';
                    break;
                case UPLOAD_ERR_PARTIAL:
                    $errorMsg = 'Upload parcial';
                    break;
                case UPLOAD_ERR_NO_FILE:
                    $errorMsg = 'Nenhum arquivo enviado';
                    break;
                default:
                    $errorMsg = 'Erro no upload: ' . $_FILES['image']['error'];
            }
        }
        
        http_response_code(400);
        echo json_encode(['error' => $errorMsg]);
        exit;
    }

    $uploadedFile = $_FILES['image'];
    
    // Verificar tamanho (5MB)
    if ($uploadedFile['size'] > 5 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['error' => 'Arquivo muito grande. Máximo: 5MB']);
        exit;
    }
    
    // Verificar tipo do arquivo
    $imageInfo = getimagesize($uploadedFile['tmp_name']);
    
    if ($imageInfo === false) {
        http_response_code(400);
        echo json_encode(['error' => 'Arquivo não é uma imagem válida']);
        exit;
    }
    
    $allowedTypes = [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_GIF, IMAGETYPE_WEBP];
    if (!in_array($imageInfo[2], $allowedTypes)) {
        http_response_code(400);
        echo json_encode(['error' => 'Tipo não permitido. Use: JPEG, PNG, GIF ou WebP']);
        exit;
    }
    
    $originalWidth = $imageInfo[0];
    $originalHeight = $imageInfo[1];
    $mimeType = $imageInfo['mime'];
    
    // Sem GD: apenas carregar arquivo original (versão simples)
    $imageData = file_get_contents($uploadedFile['tmp_name']);
    
    if ($imageData === false) {
        http_response_code(400);
        echo json_encode(['error' => 'Não foi possível processar o arquivo']);
        exit;
    }
    
    // Verificar tamanho final
    if (strlen($imageData) > 4 * 1024 * 1024) { // 4MB
        http_response_code(400);
        echo json_encode(['error' => 'Imagem resultante muito grande']);
        exit;
    }
    
    // Converter para base64
    $base64 = base64_encode($imageData);
    $dataUri = "data:{$mimeType};base64,{$base64}";
    
    // Verificar tamanho da base64
    if (strlen($base64) > 5400000) { // ~4MB em base64
        http_response_code(400);
        echo json_encode(['error' => 'Imagem muito grande após processamento']);
        exit;
    }
    
    // Retornar no formato esperado pelo npc-sheet.js
    echo json_encode([
        'success' => true,
        'dataUri' => $dataUri,
        'originalSize' => $uploadedFile['size'],
        'finalSize' => strlen($imageData),
        'dimensions' => [
            'original' => ['width' => $originalWidth, 'height' => $originalHeight],
            'final' => ['width' => $originalWidth, 'height' => $originalHeight]
        ],
        'compression' => '0%'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno: ' . $e->getMessage()]);
} catch (Error $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro fatal: ' . $e->getMessage()]);
}
?>
