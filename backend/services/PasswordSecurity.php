<?php
/**
 * Utilitário para gerenciamento seguro de senhas
 */

class PasswordSecurity {
    
    /**
     * Valida força da senha com critérios rigorosos
     */
    public static function validatePasswordStrength($password) {
        $errors = [];
        
        // Verificar comprimento mínimo
        if (strlen($password) < 8) {
            $errors[] = 'A senha deve ter pelo menos 8 caracteres';
        }
        
        // Verificar comprimento máximo (evitar DoS)
        if (strlen($password) > 128) {
            $errors[] = 'A senha não pode ter mais de 128 caracteres';
        }
        
        // Verificar presença de letra minúscula
        if (!preg_match('/[a-z]/', $password)) {
            $errors[] = 'A senha deve conter pelo menos uma letra minúscula';
        }
        
        // Verificar presença de letra maiúscula
        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'A senha deve conter pelo menos uma letra maiúscula';
        }
        
        // Verificar presença de número
        if (!preg_match('/\d/', $password)) {
            $errors[] = 'A senha deve conter pelo menos um número';
        }
        
        // Verificar presença de caractere especial
        if (!preg_match('/[^a-zA-Z\d]/', $password)) {
            $errors[] = 'A senha deve conter pelo menos um caractere especial';
        }
        
        // Verificar sequências comuns
        if (self::hasCommonSequences($password)) {
            $errors[] = 'A senha não deve conter sequências comuns (123, abc, qwerty, etc.)';
        }
        
        // Verificar senhas comuns
        if (self::isCommonPassword($password)) {
            $errors[] = 'Esta senha é muito comum. Escolha uma senha mais única';
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'strength' => self::calculateStrength($password)
        ];
    }
    
    /**
     * Calcula força da senha (0-100)
     */
    public static function calculateStrength($password) {
        $score = 0;
        $length = strlen($password);
        
        // Pontuação por comprimento
        if ($length >= 8) $score += 20;
        if ($length >= 12) $score += 10;
        if ($length >= 16) $score += 10;
        
        // Pontuação por diversidade de caracteres
        if (preg_match('/[a-z]/', $password)) $score += 15;
        if (preg_match('/[A-Z]/', $password)) $score += 15;
        if (preg_match('/\d/', $password)) $score += 15;
        if (preg_match('/[^a-zA-Z\d]/', $password)) $score += 15;
        
        // Bônus por múltiplos tipos de caracteres especiais
        $specialTypes = 0;
        if (preg_match('/[!@#$%^&*]/', $password)) $specialTypes++;
        if (preg_match('/[()_+={}[\]|\\:";\'<>,.?\/~`-]/', $password)) $specialTypes++;
        $score += min($specialTypes * 5, 10);
        
        // Penalidade por padrões comuns
        if (self::hasCommonSequences($password)) $score -= 20;
        if (self::isCommonPassword($password)) $score -= 30;
        
        return max(0, min(100, $score));
    }
    
    /**
     * Verifica sequências comuns
     */
    private static function hasCommonSequences($password) {
        $sequences = [
            '123', '234', '345', '456', '567', '678', '789',
            'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi',
            'qwe', 'wer', 'ert', 'rty', 'tyu', 'yui', 'uio',
            'asd', 'sdf', 'dfg', 'fgh', 'ghj', 'hjk', 'jkl',
            'zxc', 'xcv', 'cvb', 'vbn', 'bnm'
        ];
        
        $passwordLower = strtolower($password);
        
        foreach ($sequences as $seq) {
            if (strpos($passwordLower, $seq) !== false) {
                return true;
            }
            // Verificar sequência reversa
            if (strpos($passwordLower, strrev($seq)) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Verifica se é uma senha comum
     */
    private static function isCommonPassword($password) {
        $commonPasswords = [
            'password', '12345678', 'qwerty123', 'admin123',
            'password123', '123456789', 'welcome123', 'letmein',
            'monkey123', 'dragon123', 'master123', 'shadow123',
            'superman', 'batman123', 'football', 'baseball'
        ];
        
        $passwordLower = strtolower($password);
        
        return in_array($passwordLower, $commonPasswords);
    }
    
    /**
     * Gera hash seguro da senha
     */
    public static function hashPassword($password, $algorithm = PASSWORD_ARGON2ID) {
        // Opções para Argon2id
        $options = [
            'memory_cost' => 65536, // 64 MB
            'time_cost' => 4,       // 4 iterações
            'threads' => 3          // 3 threads
        ];
        
        return password_hash($password, $algorithm, $options);
    }
    
    /**
     * Verifica se a senha corresponde ao hash
     */
    public static function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }
    
    /**
     * Verifica se o hash precisa ser atualizado
     */
    public static function needsRehash($hash, $algorithm = PASSWORD_ARGON2ID) {
        $options = [
            'memory_cost' => 65536,
            'time_cost' => 4,
            'threads' => 3
        ];
        
        return password_needs_rehash($hash, $algorithm, $options);
    }
    
    /**
     * Gera senha temporária segura
     */
    public static function generateSecurePassword($length = 16) {
        $lowercase = 'abcdefghijklmnopqrstuvwxyz';
        $uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $numbers = '0123456789';
        $symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        $password = '';
        
        // Garantir pelo menos um de cada tipo
        $password .= $lowercase[random_int(0, strlen($lowercase) - 1)];
        $password .= $uppercase[random_int(0, strlen($uppercase) - 1)];
        $password .= $numbers[random_int(0, strlen($numbers) - 1)];
        $password .= $symbols[random_int(0, strlen($symbols) - 1)];
        
        // Preencher o resto
        $allChars = $lowercase . $uppercase . $numbers . $symbols;
        for ($i = 4; $i < $length; $i++) {
            $password .= $allChars[random_int(0, strlen($allChars) - 1)];
        }
        
        // Embaralhar
        return str_shuffle($password);
    }
    
    /**
     * Gera código de recuperação de senha
     */
    public static function generateRecoveryCode($length = 32) {
        return bin2hex(random_bytes($length / 2));
    }
}
?>
