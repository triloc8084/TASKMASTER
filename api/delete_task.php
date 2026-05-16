<?php
require_once 'config.php';
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");

ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

try {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        throw new Exception("User not logged in");
    }

    // Get and validate task_id
    $taskId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    
    if ($taskId <= 0) {
        throw new Exception("Invalid task ID");
    }

    // Delete the task
    $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?");
    if (!$stmt->execute([$taskId, $_SESSION['user_id']])) {
        throw new Exception("Error deleting task");
    }

    if ($stmt->rowCount() === 0) {
        throw new Exception("Task not found or unauthorized");
    }

    // Return success response
    echo json_encode([
        "status" => "success",
        "message" => "Task deleted successfully"
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?> 
