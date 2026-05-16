<?php
require_once 'config.php';
header('Content-Type: application/json');

try {
    // Get and validate user_id
    $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
    
    if ($userId <= 0) {
        throw new Exception("Invalid user ID");
    }

    // Validate user exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        throw new Exception("Invalid user");
    }
    $stmt->close();

    // Get tasks for user
    $stmt = $conn->prepare("
        SELECT id, task, priority, due_date, completed, created_at, updated_at 
        FROM tasks 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $tasks = [];
    while ($row = $result->fetch_assoc()) {
        $tasks[] = [
            'id' => $row['id'],
            'task' => $row['task'],
            'priority' => $row['priority'],
            'due_date' => $row['due_date'],
            'completed' => (bool)$row['completed'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at']
        ];
    }

    // Return success response
    echo json_encode([
        "status" => "success",
        "tasks" => $tasks
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
} finally {
    if (isset($stmt)) {
        $stmt->close();
    }
    closeConnection();
}
?> 