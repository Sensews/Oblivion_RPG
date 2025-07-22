<?php
/**
 * Script de limpeza automática de usuários provisórios expirados
 * Execute este script via cron job a cada 30 minutos
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/services/VerificationService.php';

try {
    $verificationService = new VerificationService();
    $removidos = $verificationService->limparUsuariosExpirados();
    
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] Script de limpeza executado. $removidos usuários provisórios removidos.\n";
    
    // Log da execução
    file_put_contents(__DIR__ . '/logs/cleanup.log', $logMessage, FILE_APPEND | LOCK_EX);
    
    if (php_sapi_name() === 'cli') {
        echo $logMessage;
    }
    
} catch (Exception $e) {
    $timestamp = date('Y-m-d H:i:s');
    $errorMessage = "[$timestamp] ERRO no script de limpeza: " . $e->getMessage() . "\n";
    
    error_log($errorMessage);
    file_put_contents(__DIR__ . '/logs/cleanup_errors.log', $errorMessage, FILE_APPEND | LOCK_EX);
    
    if (php_sapi_name() === 'cli') {
        echo $errorMessage;
    }
}
?>
