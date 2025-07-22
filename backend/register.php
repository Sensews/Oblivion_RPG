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

/**
 * Classe para gerenciar o registro de usuários
 */
class UserRegistration {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
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
            
            // Criar usuário
            $userId = $this->createUser($data);
            
            return [
                'success' => true,
                'message' => 'Usuário criado com sucesso',
                'user_id' => $userId
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
        
        if (strlen($data['password']) < 6) {
            return [
                'valid' => false,
                'success' => false,
                'message' => 'Senha deve ter pelo menos 6 caracteres',
                'field' => 'password'
            ];
        }
        
        if (!preg_match('/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/', $data['password'])) {
            return [
                'valid' => false,
                'success' => false,
                'message' => 'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número',
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
     * Cria um novo usuário no banco de dados
     */
    private function createUser($data) {
        $passwordHash = password_hash($data['password'], PASSWORD_ARGON2ID);
        
        $stmt = $this->pdo->prepare('
            INSERT INTO usuarios (nome_usuario, email, senha_hash, tipo_perfil, criado_em) 
            VALUES (?, ?, ?, ?, NOW())
        ');
        
        $stmt->execute([
            $data['username'],
            $data['email'],
            $passwordHash,
            $data['profileType']
        ]);
        
        return $this->pdo->lastInsertId();
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
