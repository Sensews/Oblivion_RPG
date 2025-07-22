<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Apenas aceitar requisições POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

require_once 'config/database.php';
require_once 'services/VerificationService.php';
require_once 'services/PasswordSecurity.php';

/**
 * Classe para gerenciar o registro de usuários
 */
class UserRegistration {
    private $pdo;
    private $verificationService;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->verificationService = new VerificationService();
    }
    
    /**
     * Processa o registro de um novo usuário
     */
    public function register($data) {
        try {
            // Validar dados de entrada
            $validation = $this->validateInput($data);
            if (!$validation['valid']) {
                return $validation;
            }
            
            // Verificar se usuário já existe
            if ($this->userExists($data['email'], $data['username'])) {
                return [
                    'success' => false,
                    'message' => 'Email ou nome de usuário já estão em uso',
                    'field' => 'email'
                ];
            }
            
            // Criar usuário provisório
            $userId = $this->createProvisionalUser($data);
            
            // Enviar código de verificação
            $emailResult = $this->verificationService->enviarCodigoVerificacao(
                $userId,
                $data['email'],
                $data['username']
            );
            
            if (!$emailResult['success']) {
                // Se falhou ao enviar email, remove o usuário
                $this->removeUser($userId);
                return [
                    'success' => false,
                    'message' => 'Erro ao enviar email de verificação. Tente novamente.'
                ];
            }
            
            return [
                'success' => true,
                'message' => 'Conta criada! Verifique seu email e digite o código de verificação.',
                'user_id' => $userId,
                'verification_required' => true,
                'email' => $data['email']
            ];
            
        } catch (Exception $e) {
            error_log('Erro no registro: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Erro interno do servidor'
            ];
        }
    }
    
    /**
     * Valida os dados de entrada
     */
    private function validateInput($data) {
        $errors = [];
        
        // Validar nome de usuário
        if (empty($data['username'])) {
            return [
                'valid' => false,
                'success' => false,
                'message' => 'Nome de usuário é obrigatório',
                'field' => 'username'
            ];
        }
        
        if (strlen($data['username']) < 3 || strlen($data['username']) > 50) {
            return [
                'valid' => false,
                'success' => false,
                'message' => 'Nome de usuário deve ter entre 3 e 50 caracteres',
                'field' => 'username'
            ];
        }
        
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $data['username'])) {
            return [
                'valid' => false,
                'success' => false,
                'message' => 'Nome de usuário pode conter apenas letras, números e underscore',
                'field' => 'username'
            ];
        }
        
        // Validar email
        if (empty($data['email'])) {
            return [
                'valid' => false,
                'success' => false,
                'message' => 'Email é obrigatório',
                'field' => 'email'
            ];
        }
        
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return [
                'valid' => false,
                'success' => false,
                'message' => 'Email inválido',
                'field' => 'email'
            ];
        }
        
        if (strlen($data['email']) > 150) {
            return [
                'valid' => false,
                'success' => false,
                'message' => 'Email muito longo',
                'field' => 'email'
            ];
        }
        
        // Validar senha
        if (empty($data['password'])) {
            return [
                'valid' => false,
                'success' => false,
                'message' => 'Senha é obrigatória',
                'field' => 'password'
            ];
        }
        
        // Usar validação robusta de senha
        $passwordValidation = PasswordSecurity::validatePasswordStrength($data['password']);
        if (!$passwordValidation['valid']) {
            return [
                'valid' => false,
                'success' => false,
                'message' => implode('; ', $passwordValidation['errors']),
                'field' => 'password'
            ];
        }
        
        // Validar tipo de perfil
        if (!in_array($data['profileType'], ['jogador', 'mestre'])) {
            return [
                'valid' => false,
                'success' => false,
                'message' => 'Tipo de perfil inválido'
            ];
        }
        
        return ['valid' => true];
    }
    
    /**
     * Verifica se usuário já existe
     */
    private function userExists($email, $username) {
        $stmt = $this->pdo->prepare('SELECT id FROM usuarios WHERE email = ? OR nome_usuario = ?');
        $stmt->execute([$email, $username]);
        return $stmt->fetch() !== false;
    }
    
    /**
     * Cria um novo usuário provisório no banco de dados
     */
    private function createProvisionalUser($data) {
        // Usar classe de segurança para hash da senha
        $passwordHash = PasswordSecurity::hashPassword($data['password']);
        
        $stmt = $this->pdo->prepare('
            INSERT INTO usuarios (nome_usuario, email, senha_hash, tipo_perfil, criado_provisorio, email_verificado, criado_em) 
            VALUES (?, ?, ?, ?, TRUE, FALSE, NOW())
        ');
        
        $stmt->execute([
            $data['username'],
            $data['email'],
            $passwordHash,
            $data['profileType']
        ]);
        
        return $this->pdo->lastInsertId();
    }
    
    /**
     * Remove usuário do banco
     */
    private function removeUser($userId) {
        try {
            $stmt = $this->pdo->prepare('DELETE FROM usuarios WHERE id = ?');
            $stmt->execute([$userId]);
        } catch (Exception $e) {
            error_log('Erro ao remover usuário: ' . $e->getMessage());
        }
    }
}

// Processar requisição
try {
    // Obter dados JSON
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('JSON inválido');
    }
    
    // Conectar ao banco de dados
    $pdo = Database::getConnection();
    
    // Processar registro
    $registration = new UserRegistration($pdo);
    $result = $registration->register($data);
    
    // Retornar resultado
    echo json_encode($result);
    
} catch (Exception $e) {
    error_log('Erro no registro: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor'
    ]);
}
?>
