<?php
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/database.php';

try {
    // Test database connection
    $dbInfo = [
        "status" => "success",
        "message" => "Database connection successful",
        "pdo_info" => [
            "driver" => $pdo->getAttribute(PDO::ATTR_DRIVER_NAME),
            "server_version" => $pdo->getAttribute(PDO::ATTR_SERVER_VERSION),
            "client_version" => $pdo->getAttribute(PDO::ATTR_CLIENT_VERSION)
        ]
    ];
    
    // Check if tasks table exists
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $tableInfo = [
        "status" => "success",
        "message" => "Tables in database",
        "tables" => $tables
    ];
    
    // Check tasks table structure
    $columns = $pdo->query("DESCRIBE tasks")->fetchAll(PDO::FETCH_ASSOC);
    $structureInfo = [
        "status" => "success",
        "message" => "Tasks table structure",
        "columns" => $columns
    ];
    
    // Get actual task data
    $tasks = $pdo->query("SELECT * FROM tasks")->fetchAll(PDO::FETCH_ASSOC);
    $taskData = [
        "status" => "success",
        "message" => "Task data",
        "count" => count($tasks),
        "tasks" => $tasks
    ];
    
    // Combine all information
    echo json_encode([
        "database_info" => $dbInfo,
        "table_info" => $tableInfo,
        "structure_info" => $structureInfo,
        "task_data" => $taskData
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?> 