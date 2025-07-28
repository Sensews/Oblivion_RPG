<?php
/**
 * Script de teste para verificar estrutura do banco de dados
 * e identificar tabelas relacionadas às campanhas
 */

require_once 'config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    echo "=== VERIFICAÇÃO DE ESTRUTURA DO BANCO DE DADOS ===\n\n";
    
    // Verificar quais tabelas existem
    $tablesQuery = "SHOW TABLES";
    $stmt = $db->query($tablesQuery);
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "Tabelas encontradas:\n";
    foreach ($tables as $table) {
        echo "- $table\n";
    }
    
    echo "\n=== VERIFICAÇÃO DE RELACIONAMENTOS COM CAMPANHAS ===\n\n";
    
    // Verificar tabelas que têm campanha_id
    $tablesWithCampaignId = [];
    
    foreach ($tables as $table) {
        $columnsQuery = "SHOW COLUMNS FROM `$table` WHERE Field = 'campanha_id'";
        $stmt = $db->query($columnsQuery);
        if ($stmt->rowCount() > 0) {
            $tablesWithCampaignId[] = $table;
            
            // Contar registros nesta tabela
            $countQuery = "SELECT COUNT(*) as total FROM `$table`";
            $countStmt = $db->query($countQuery);
            $count = $countStmt->fetch()['total'];
            
            echo "Tabela: $table\n";
            echo "- Total de registros: $count\n";
            
            if ($count > 0) {
                // Mostrar distribuição por campanha
                $distQuery = "SELECT campanha_id, COUNT(*) as count FROM `$table` GROUP BY campanha_id ORDER BY campanha_id";
                $distStmt = $db->query($distQuery);
                $distribution = $distStmt->fetchAll();
                
                echo "- Distribuição por campanha:\n";
                foreach ($distribution as $dist) {
                    $campaignId = $dist['campanha_id'] ?? 'NULL';
                    echo "  Campanha $campaignId: {$dist['count']} registros\n";
                }
            }
            echo "\n";
        }
    }
    
    if (empty($tablesWithCampaignId)) {
        echo "Nenhuma tabela com campo campanha_id encontrada.\n";
    }
    
    echo "\n=== VERIFICAÇÃO DE FOREIGN KEYS ===\n\n";
    
    // Verificar foreign keys relacionadas à tabela campanhas
    $fkQuery = "
        SELECT 
            TABLE_NAME,
            COLUMN_NAME,
            CONSTRAINT_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
        FROM 
            information_schema.KEY_COLUMN_USAGE 
        WHERE 
            REFERENCED_TABLE_SCHEMA = DATABASE() 
            AND REFERENCED_TABLE_NAME = 'campanhas'
    ";
    
    $stmt = $db->query($fkQuery);
    $foreignKeys = $stmt->fetchAll();
    
    if (!empty($foreignKeys)) {
        echo "Foreign keys que referenciam campanhas:\n";
        foreach ($foreignKeys as $fk) {
            echo "- Tabela: {$fk['TABLE_NAME']}\n";
            echo "  Coluna: {$fk['COLUMN_NAME']}\n";
            echo "  Constraint: {$fk['CONSTRAINT_NAME']}\n";
            echo "  Referencia: {$fk['REFERENCED_TABLE_NAME']}.{$fk['REFERENCED_COLUMN_NAME']}\n\n";
        }
    } else {
        echo "Nenhuma foreign key encontrada referenciando campanhas.\n";
    }
    
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage() . "\n";
}
?>
