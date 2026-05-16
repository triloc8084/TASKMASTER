<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    // First check if MySQL extension is loaded
    if (!extension_loaded('pdo_mysql')) {
        throw new Exception('PDO MySQL extension is not loaded');
    }

    // Try to connect with error mode as warning first to get more info
    $pdo = new PDO(
        "mysql:host=localhost;port=3306",
        "root",
        "",
        array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_WARNING,
            PDO::ATTR_TIMEOUT => 3
        )
    );
    
    echo json_encode([
        "status" => "success",
        "message" => "Database connection successful",
        "server_info" => $pdo->getAttribute(PDO::ATTR_SERVER_INFO),
        "client_version" => $pdo->getAttribute(PDO::ATTR_CLIENT_VERSION)
    ]);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database connection failed",
        "error" => $e->getMessage(),
        "code" => $e->getCode(),
        "trace" => $e->getTraceAsString()
    ]);
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "General error",
        "error" => $e->getMessage()
    ]);
}
?> 