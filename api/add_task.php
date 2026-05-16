<?php
require_once 'config.php';
header('Content-Type: application/json');

try {
    // Get JSON input
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    if (!isset($data['user_id']) || !isset($data['task']) || !isset($data['priority']) || !isset($data['due_date'])) {
        throw new Exception("Missing required fields");
    }

    // Sanitize input
    $userId = (int)$data['user_id'];
    $task = sanitizeInput($data['task']);
    $priority = sanitizeInput($data['priority']);
    $dueDate = sanitizeInput($data['due_date']);

    // Validate user exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        throw new Exception("Invalid user");
    }
    $stmt->close();

    // Insert task
    $stmt = $conn->prepare("INSERT INTO tasks (user_id, task, priority, due_date) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("isss", $userId, $task, $priority, $dueDate);
    
    if (!$stmt->execute()) {
        throw new Exception("Error adding task: " . $stmt->error);
    }

    // Return success response
    echo json_encode([
        "status" => "success",
        "message" => "Task added successfully",
        "task_id" => $stmt->insert_id
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