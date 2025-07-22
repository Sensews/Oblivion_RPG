<?php
/**
 * Serviço para gerenciar verificação de email
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/EmailService.php';

class VerificationService {
    private $pdo;
    private $emailService;
    
    public function __construct() {
        $this->pdo = Database::getConnection();
        $this->emailService = new EmailService();
    }
    
    /**
     * Gera e envia código de verificação
     */
    public function enviarCodigoVerificacao($usuarioId, $email, $nomeUsuario) {
        try {
            // Gerar código de 6 dígitos
            $codigo = $this->gerarCodigo();
            
            // Definir expiração (15 minutos)
            $expiracao = new DateTime();
            $expiracao->add(new DateInterval('PT15M'));
            
            // Salvar código no banco
            $stmt = $this->pdo->prepare('
                UPDATE usuarios 
                SET codigo_verificacao = ?, 
                    codigo_expira_em = ?,
                    criado_provisorio = TRUE
                WHERE id = ?
            ');
            
            $stmt->execute([
                $codigo,
                $expiracao->format('Y-m-d H:i:s'),
                $usuarioId
            ]);
            
            // Enviar email
            $emailEnviado = $this->emailService->enviarEmailVerificacao(
                $email, 
                $nomeUsuario, 
                $codigo
            );
            
            if (!$emailEnviado) {
                throw new Exception('Falha ao enviar email de verificação');
            }
            
            // Log da tentativa
            $this->logVerificacao($usuarioId, $email, $codigo);
            
            return [
                'success' => true,
                'message' => 'Código de verificação enviado com sucesso',
                'expira_em' => $expiracao->format('Y-m-d H:i:s')
            ];
            
        } catch (Exception $e) {
            error_log('Erro ao enviar código: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Erro ao enviar código de verificação'
            ];
        }
    }
    
    /**
     * Verifica código inserido pelo usuário
     */
    public function verificarCodigo($usuarioId, $codigo) {
        try {
            $stmt = $this->pdo->prepare('
                SELECT codigo_verificacao, codigo_expira_em, email_verificado
                FROM usuarios 
                WHERE id = ?
            ');
            
            $stmt->execute([$usuarioId]);
            $usuario = $stmt->fetch();
            
            if (!$usuario) {
                return [
                    'success' => false,
                    'message' => 'Usuário não encontrado'
                ];
            }
            
            if ($usuario['email_verificado']) {
                return [
                    'success' => false,
                    'message' => 'Email já foi verificado'
                ];
            }
            
            // Verificar se código expirou
            $agora = new DateTime();
            $expiracao = new DateTime($usuario['codigo_expira_em']);
            
            if ($agora > $expiracao) {
                // Remover usuário se código expirou
                $this->removerUsuarioProvisorio($usuarioId);
                return [
                    'success' => false,
                    'message' => 'Código expirado. Conta removida. Tente criar novamente.',
                    'expired' => true
                ];
            }
            
            // Verificar código
            if ($usuario['codigo_verificacao'] !== $codigo) {
                // Incrementar tentativas
                $this->incrementarTentativas($usuarioId);
                return [
                    'success' => false,
                    'message' => 'Código incorreto'
                ];
            }
            
            // Código correto - ativar conta
            $this->ativarConta($usuarioId);
            
            return [
                'success' => true,
                'message' => 'Email verificado com sucesso! Conta ativada.'
            ];
            
        } catch (Exception $e) {
            error_log('Erro ao verificar código: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Erro interno do servidor'
            ];
        }
    }
    
    /**
     * Reenvia código de verificação
     */
    public function reenviarCodigo($usuarioId) {
        try {
            $stmt = $this->pdo->prepare('
                SELECT email, nome_usuario, email_verificado 
                FROM usuarios 
                WHERE id = ?
            ');
            
            $stmt->execute([$usuarioId]);
            $usuario = $stmt->fetch();
            
            if (!$usuario) {
                return [
                    'success' => false,
                    'message' => 'Usuário não encontrado'
                ];
            }
            
            if ($usuario['email_verificado']) {
                return [
                    'success' => false,
                    'message' => 'Email já foi verificado'
                ];
            }
            
            return $this->enviarCodigoVerificacao(
                $usuarioId,
                $usuario['email'],
                $usuario['nome_usuario']
            );
            
        } catch (Exception $e) {
            error_log('Erro ao reenviar código: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Erro ao reenviar código'
            ];
        }
    }
    
    /**
     * Remove usuários provisórios expirados
     */
    public function limparUsuariosExpirados() {
        try {
            $agora = new DateTime();
            
            $stmt = $this->pdo->prepare('
                DELETE FROM usuarios 
                WHERE criado_provisorio = TRUE 
                AND email_verificado = FALSE 
                AND codigo_expira_em < ?
            ');
            
            $stmt->execute([$agora->format('Y-m-d H:i:s')]);
            
            $removidos = $stmt->rowCount();
            
            if ($removidos > 0) {
                error_log("Removidos $removidos usuários provisórios expirados");
            }
            
            return $removidos;
            
        } catch (Exception $e) {
            error_log('Erro ao limpar usuários expirados: ' . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * Cancela registro provisório
     */
    public function cancelarRegistro($usuarioId) {
        try {
            return $this->removerUsuarioProvisorio($usuarioId);
        } catch (Exception $e) {
            error_log('Erro ao cancelar registro: ' . $e->getMessage());
            return false;
        }
    }
    
    // Métodos privados auxiliares
    
    private function gerarCodigo() {
        return str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }
    
    private function logVerificacao($usuarioId, $email, $codigo) {
        try {
            $stmt = $this->pdo->prepare('
                INSERT INTO logs_verificacao (usuario_id, email, codigo) 
                VALUES (?, ?, ?)
            ');
            $stmt->execute([$usuarioId, $email, $codigo]);
        } catch (Exception $e) {
            error_log('Erro ao logar verificação: ' . $e->getMessage());
        }
    }
    
    private function incrementarTentativas($usuarioId) {
        try {
            $stmt = $this->pdo->prepare('
                UPDATE logs_verificacao 
                SET tentativas = tentativas + 1 
                WHERE usuario_id = ? 
                AND verificado_em IS NULL
                ORDER BY criado_em DESC 
                LIMIT 1
            ');
            $stmt->execute([$usuarioId]);
        } catch (Exception $e) {
            error_log('Erro ao incrementar tentativas: ' . $e->getMessage());
        }
    }
    
    private function ativarConta($usuarioId) {
        $this->pdo->beginTransaction();
        
        try {
            // Ativar conta
            $stmt = $this->pdo->prepare('
                UPDATE usuarios 
                SET email_verificado = TRUE,
                    criado_provisorio = FALSE,
                    codigo_verificacao = NULL,
                    codigo_expira_em = NULL
                WHERE id = ?
            ');
            $stmt->execute([$usuarioId]);
            
            // Marcar como verificado no log
            $stmt = $this->pdo->prepare('
                UPDATE logs_verificacao 
                SET verificado_em = NOW() 
                WHERE usuario_id = ? 
                AND verificado_em IS NULL
            ');
            $stmt->execute([$usuarioId]);
            
            $this->pdo->commit();
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            throw $e;
        }
    }
    
    private function removerUsuarioProvisorio($usuarioId) {
        try {
            $stmt = $this->pdo->prepare('
                DELETE FROM usuarios 
                WHERE id = ? 
                AND criado_provisorio = TRUE 
                AND email_verificado = FALSE
            ');
            
            $stmt->execute([$usuarioId]);
            return $stmt->rowCount() > 0;
            
        } catch (Exception $e) {
            error_log('Erro ao remover usuário provisório: ' . $e->getMessage());
            return false;
        }
    }
}
?>
