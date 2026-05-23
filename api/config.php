<?php
// Database configuration with Environment Variables & TiDB Cloud Fallbacks
$host = getenv('DB_HOST') ?: 'gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com';
$dbname = getenv('DB_NAME') ?: 'todo_app';
$username = getenv('DB_USER') ?: '3tyzKtq58X9hmED.root';
$password = getenv('DB_PASS') !== false ? getenv('DB_PASS') : 'Rzs0iPykd50Bkuel';
$port = getenv('DB_PORT') ?: '4000';

// Handle SSL CA certificate path
$ssl_ca = getenv('DB_SSL_CA');
if (!$ssl_ca) {
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        // Fallback for Windows local development using TiDB Cloud
        $local_win_ca = dirname(__DIR__) . '/config/isrgrootx1.pem';
        if (file_exists($local_win_ca)) {
            $ssl_ca = $local_win_ca;
        }
    } else {
        // Fallback for Linux (Render) production environment
        $linux_ca = '/etc/ssl/certs/ca-certificates.crt';
        if (file_exists($linux_ca)) {
            $ssl_ca = $linux_ca;
        }
    }
}

// Error reporting (only in development)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set timezone
date_default_timezone_set('UTC');

try {
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];

    // If SSL CA file is specified, configure SSL options
    if ($ssl_ca) {
        $options[PDO::MYSQL_ATTR_SSL_CA] = $ssl_ca;
        $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
    }

    // Connect directly to the database
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname", $username, $password, $options);
    
    // Set charset
    $pdo->exec("SET NAMES utf8mb4");

    // Create users table if it doesn't exist
    $sql = "CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $pdo->exec($sql);

    // Create tasks table if it doesn't exist
    $sql = "CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        task VARCHAR(255) NOT NULL,
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        due_date DATE,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $pdo->exec($sql);

    // Add deleted_at column if it doesn't exist (Soft Deletes)
    $stmt = $pdo->query("SHOW COLUMNS FROM tasks LIKE 'deleted_at'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL");
    }

    // Add category column if it doesn't exist
    $stmt = $pdo->query("SHOW COLUMNS FROM tasks LIKE 'category'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE tasks ADD COLUMN category VARCHAR(50) DEFAULT 'General'");
    }

} catch(PDOException $e) {
    die("ERROR: " . $e->getMessage());
}

// Function to safely close database connection
function closeConnection() {
    global $pdo;
    if($pdo) {
        $pdo = null;
    }
}

// Function to sanitize input
function sanitizeInput($data) {
    if (is_string($data)) {
        return htmlspecialchars(trim($data));
    }
    return $data;
}

// Function to handle database errors
function handleDBError($error) {
    error_log("Database Error: " . $error);
    return json_encode([
        "status" => "error",
        "message" => "An error occurred. Please try again later."
    ]);
}

// Function to generate CSRF token
function generateCSRFToken() {
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
    }
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

// Function to validate CSRF token
function validateCSRFToken($token) {
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
    }
    return !empty($token) && hash_equals($_SESSION['csrf_token'] ?? '', $token);
}
?> 