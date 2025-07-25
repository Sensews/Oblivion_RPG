<?php
/**
 * Script para verificar estrutura da tabela personagens
 */

require_once 'config/database.php';

try {
    $pdo = Database::getConnection();
    
    // Verificar estrutura da tabela personagens
    $stmt = $pdo->query("DESCRIBE personagens");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Estrutura da tabela 'personagens':\n";
    echo str_pad("Field", 25) . str_pad("Type", 20) . str_pad("Null", 8) . str_pad("Key", 8) . "Default\n";
    echo str_repeat("-", 80) . "\n";
    
    foreach ($columns as $column) {
        echo str_pad($column['Field'], 25) . 
             str_pad($column['Type'], 20) . 
             str_pad($column['Null'], 8) . 
             str_pad($column['Key'], 8) . 
             $column['Default'] . "\n";
    }
    
    // Verificar especificamente a coluna foto_url
    $stmt = $pdo->query("SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME = 'personagens' 
                        AND COLUMN_NAME = 'foto_url'");
    
    $foto_url_info = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($foto_url_info) {
        echo "\n\nInformações específicas da coluna foto_url:\n";
        echo "Tipo: " . $foto_url_info['DATA_TYPE'] . "\n";
        echo "Tamanho máximo: " . ($foto_url_info['CHARACTER_MAXIMUM_LENGTH'] ?? 'Sem limite') . "\n";
    }
    
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage() . "\n";
}
?>
