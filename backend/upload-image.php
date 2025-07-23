<?php
/**
 * API para upload de imagens - Oblivion RPG (Versão Unificada)
 * Combina as funcionalidades das 3 versões em uma só
 */

// Configurações de erro
error_reporting(0);
ini_set('display_errors', 0);

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
    
    // Parâmetros opcionais
    $cropSquare = isset($_POST['crop_square']) && $_POST['crop_square'] === 'true';
    $maxSize = isset($_POST['max_size']) ? (int)$_POST['max_size'] : 400;
    $quality = isset($_POST['quality']) ? (int)$_POST['quality'] : 85;
    
    // Limitar parâmetros
    $maxSize = min(max($maxSize, 100), 1200); // Entre 100 e 1200px
    $quality = min(max($quality, 60), 95);     // Entre 60 e 95%
    
    // Processar imagem se GD estiver disponível
    if (extension_loaded('gd')) {
        // Criar imagem a partir do arquivo
        $sourceImage = null;
        switch ($imageInfo[2]) {
            case IMAGETYPE_JPEG:
                $sourceImage = imagecreatefromjpeg($uploadedFile['tmp_name']);
                break;
            case IMAGETYPE_PNG:
                $sourceImage = imagecreatefrompng($uploadedFile['tmp_name']);
                break;
            case IMAGETYPE_GIF:
                $sourceImage = imagecreatefromgif($uploadedFile['tmp_name']);
                break;
            case IMAGETYPE_WEBP:
                $sourceImage = imagecreatefromwebp($uploadedFile['tmp_name']);
                break;
        }
        
        if ($sourceImage) {
            $processedImage = $sourceImage;
            $newWidth = $originalWidth;
            $newHeight = $originalHeight;
            
            // Fazer crop quadrado se solicitado
            if ($cropSquare) {
                $processedImage = cropToSquare($sourceImage, $originalWidth, $originalHeight);
                $newWidth = $newHeight = min($originalWidth, $originalHeight);
            }
            
            // Calcular dimensões finais
            if ($cropSquare) {
                $finalWidth = $finalHeight = $maxSize;
            } else {
                $ratio = min($maxSize / $newWidth, $maxSize / $newHeight);
                if ($ratio < 1) {
                    $finalWidth = (int)($newWidth * $ratio);
                    $finalHeight = (int)($newHeight * $ratio);
                } else {
                    $finalWidth = $newWidth;
                    $finalHeight = $newHeight;
                }
            }
            
            // Criar imagem final
            $finalImage = imagecreatetruecolor($finalWidth, $finalHeight);
            
            // Preservar transparência para PNG
            if ($imageInfo[2] === IMAGETYPE_PNG) {
                imagealphablending($finalImage, false);
                imagesavealpha($finalImage, true);
                $transparent = imagecolorallocatealpha($finalImage, 255, 255, 255, 127);
                imagefill($finalImage, 0, 0, $transparent);
            }
            
            // Redimensionar
            imagecopyresampled(
                $finalImage, $processedImage,
                0, 0, 0, 0,
                $finalWidth, $finalHeight,
                imagesx($processedImage), imagesy($processedImage)
            );
            
            // Converter para base64
            ob_start();
            if ($imageInfo[2] === IMAGETYPE_PNG) {
                imagepng($finalImage, null, 6);
                $outputFormat = 'png';
            } else {
                imagejpeg($finalImage, null, $quality);
                $outputFormat = 'jpeg';
            }
            $imageData = ob_get_contents();
            ob_end_clean();
            
            // Limpar memória
            imagedestroy($sourceImage);
            if ($processedImage !== $sourceImage) {
                imagedestroy($processedImage);
            }
            imagedestroy($finalImage);
            
            $finalMimeType = "image/{$outputFormat}";
            $processed = true;
            
        } else {
            // Fallback: carregar arquivo original
            $imageData = file_get_contents($uploadedFile['tmp_name']);
            $finalWidth = $originalWidth;
            $finalHeight = $originalHeight;
            $finalMimeType = $mimeType;
            $processed = false;
        }
    } else {
        // Sem GD: apenas carregar arquivo original
        $imageData = file_get_contents($uploadedFile['tmp_name']);
        $finalWidth = $originalWidth;
        $finalHeight = $originalHeight;
        $finalMimeType = $mimeType;
        $processed = false;
    }
    
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
    $dataUri = "data:{$finalMimeType};base64,{$base64}";
    
    // Verificar tamanho da base64
    if (strlen($base64) > 5400000) { // ~4MB em base64
        http_response_code(400);
        echo json_encode(['error' => 'Imagem muito grande após processamento']);
        exit;
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Imagem processada com sucesso',
        'data' => [
            'base64' => $dataUri,
            'size' => strlen($imageData),
            'dimensions' => [
                'width' => $finalWidth,
                'height' => $finalHeight
            ],
            'format' => pathinfo($finalMimeType, PATHINFO_EXTENSION) ?: 'jpeg',
            'processed' => $processed,
            'gd_available' => extension_loaded('gd'),
            'cropped' => $cropSquare && $processed,
            'original_dimensions' => [
                'width' => $originalWidth,
                'height' => $originalHeight
            ]
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno: ' . $e->getMessage()]);
} catch (Error $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro fatal: ' . $e->getMessage()]);
}

/**
 * Função para fazer crop quadrado da imagem
 */
function cropToSquare($image, $width, $height) {
    // Determinar o tamanho do quadrado (menor dimensão)
    $size = min($width, $height);
    
    // Calcular posição para centralizar o crop
    $x = ($width - $size) / 2;
    $y = ($height - $size) / 2;
    
    // Criar nova imagem quadrada
    $squareImage = imagecreatetruecolor($size, $size);
    
    // Preservar transparência
    imagealphablending($squareImage, false);
    imagesavealpha($squareImage, true);
    
    // Copiar a parte central da imagem original
    imagecopy($squareImage, $image, 0, 0, $x, $y, $size, $size);
    
    return $squareImage;
}
?>
