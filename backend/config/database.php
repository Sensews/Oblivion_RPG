<?php
/**
 * Configuração do banco de dados e variáveis de ambiente
 */

class Config {
    private static $config = null;
    
    public static function load() {
        if (self::$config === null) {
            self::loadEnv();
            self::$config = [
                'db_host' => $_ENV['DB_HOST'] ?? 'localhost',
                'db_name' => $_ENV['DB_NAME'] ?? 'oblivion_rpg',
                'db_user' => $_ENV['DB_USER'] ?? 'rpg_user',
                'db_pass' => $_ENV['DB_PASS'] ?? '',
                'db_charset' => $_ENV['DB_CHARSET'] ?? 'utf8mb4',
                'app_env' => $_ENV['APP_ENV'] ?? 'production',
                'app_debug' => $_ENV['APP_DEBUG'] === 'true',
                'app_url' => $_ENV['APP_URL'] ?? '',
                'jwt_secret' => $_ENV['JWT_SECRET'] ?? 'default_secret',
                'hash_algo' => $_ENV['HASH_ALGO'] ?? PASSWORD_DEFAULT,
                'mail_host' => $_ENV['MAIL_HOST'] ?? 'localhost',
                'mail_port' => $_ENV['MAIL_PORT'] ?? 587,
                'mail_username' => $_ENV['MAIL_USERNAME'] ?? '',
                'mail_password' => $_ENV['MAIL_PASSWORD'] ?? '',
                'mail_from_email' => $_ENV['MAIL_FROM_EMAIL'] ?? '',
                'mail_from_name' => $_ENV['MAIL_FROM_NAME'] ?? 'Oblivion RPG',
                'mail_encryption' => $_ENV['MAIL_ENCRYPTION'] ?? 'tls'
            ];
        }
        return self::$config;
    }
    
    public static function get($key, $default = null) {
        $config = self::load();
        return $config[$key] ?? $default;
    }
    
    private static function loadEnv() {
        $envFile = __DIR__ . '/../../.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) continue;
                if (strpos($line, '=') !== false) {
                    list($name, $value) = explode('=', $line, 2);
                    $_ENV[trim($name)] = trim($value);
                }
            }
        }
    }
}

/**
 * Classe para conexão com o banco de dados
 */
class Database {
    private static $pdo = null;
    
    public static function getConnection() {
        if (self::$pdo === null) {
            $config = Config::load();
            
            $dsn = "mysql:host={$config['db_host']};dbname={$config['db_name']};charset={$config['db_charset']}";
            
            try {
                self::$pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
            } catch (PDOException $e) {
                if (Config::get('app_debug')) {
                    throw new Exception("Erro de conexão: " . $e->getMessage());
                } else {
                    throw new Exception("Erro de conexão com o banco de dados");
                }
            }
        }
        
        return self::$pdo;
    }
}
?>
