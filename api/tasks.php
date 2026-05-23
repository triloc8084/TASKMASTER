<?php
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
}
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

function sendJson($payload, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($payload);
    exit();
}

function readJsonBody() {
    $rawBody = file_get_contents("php://input");
    $data = json_decode($rawBody);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON request body");
    }

    return $data;
}

function validatePriority($priority) {
    $allowedPriorities = ['low', 'medium', 'high'];
    if (!in_array($priority, $allowedPriorities, true)) {
        throw new Exception("Priority must be low, medium, or high");
    }
}

function validateDueDate($dueDate) {
    if ($dueDate === null || $dueDate === '') {
        return null;
    }

    $date = DateTime::createFromFormat('Y-m-d', $dueDate);
    if (!$date || $date->format('Y-m-d') !== $dueDate) {
        throw new Exception("Due date must use YYYY-MM-DD format");
    }

    return $dueDate;
}

function fetchTaskById($pdo, $taskId, $userId) {
    $stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ? AND deleted_at IS NULL");
    $stmt->execute([$taskId, $userId]);
    $task = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$task) {
        throw new Exception("Task not found or unauthorized");
    }

    $task['completed'] = (bool)$task['completed'];
    return $task;
}

// Set session cookie parameters
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
session_start();

require_once 'config.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    sendJson([
        "status" => "error",
        "message" => "User not logged in"
    ], 401);
}

$user_id = $_SESSION['user_id'];

try {
    // Get all tasks
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $sql = "SELECT * FROM tasks WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC";
        $stmt = $pdo->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Database error: " . implode(" ", $pdo->errorInfo()));
        }
        
        $stmt->execute([$user_id]);
        $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convert completed status to boolean
        foreach ($tasks as &$task) {
            $task['completed'] = (bool)$task['completed'];
        }
        
        // Return tasks directly without wrapping in status/data
        echo json_encode($tasks);
        exit();
    }

    // Create new task
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = readJsonBody();
        
        if (!$data || !isset($data->task) || !isset($data->priority)) {
            throw new Exception("Task and priority are required");
        }
        
        $task = htmlspecialchars(trim($data->task));
        $priority = strtolower(htmlspecialchars(trim($data->priority)));
        $dueDate = validateDueDate(!empty($data->due_date) ? htmlspecialchars(trim($data->due_date)) : null);
        $category = !empty($data->category) ? htmlspecialchars(trim($data->category)) : 'General';

        if ($task === '') {
            throw new Exception("Task cannot be empty");
        }

        validatePriority($priority);
        
        $sql = "INSERT INTO tasks (user_id, task, priority, due_date, category) VALUES (?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Database error: " . implode(" ", $pdo->errorInfo()));
        }
        
        $stmt->execute([$user_id, $task, $priority, $dueDate, $category]);
        $newId = $pdo->lastInsertId();
        
        // Fetch the newly created task
        $sql = "SELECT * FROM tasks WHERE id = ? AND user_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$newId, $user_id]);
        $newTask = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$newTask) {
            throw new Exception("Failed to retrieve created task");
        }
        
        $newTask['completed'] = (bool)$newTask['completed'];
        
        echo json_encode([
            "status" => "success",
            "message" => "Task created successfully",
            "task" => $newTask
        ]);
        exit();
    }

    // Update task details or completion status
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $data = readJsonBody();
        
        if (!$data || !isset($data->id)) {
            throw new Exception("Task ID is required");
        }
        
        $id = intval($data->id);
        $currentTask = fetchTaskById($pdo, $id, $user_id);

        $fields = [];
        $values = [];

        if (property_exists($data, 'task')) {
            $task = htmlspecialchars(trim($data->task));
            if ($task === '') {
                throw new Exception("Task cannot be empty");
            }
            $fields[] = "task = ?";
            $values[] = $task;
        }

        if (property_exists($data, 'priority')) {
            $priority = strtolower(htmlspecialchars(trim($data->priority)));
            validatePriority($priority);
            $fields[] = "priority = ?";
            $values[] = $priority;
        }

        if (property_exists($data, 'due_date')) {
            $fields[] = "due_date = ?";
            $values[] = validateDueDate(htmlspecialchars(trim($data->due_date ?? '')));
        }

        if (property_exists($data, 'category')) {
            $fields[] = "category = ?";
            $values[] = htmlspecialchars(trim($data->category));
        }

        if (property_exists($data, 'completed')) {
            $fields[] = "completed = ?";
            $values[] = filter_var($data->completed, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        } elseif (count($fields) === 0) {
            $fields[] = "completed = ?";
            $values[] = $currentTask['completed'] ? 0 : 1;
        }

        $values[] = $id;
        $values[] = $user_id;

        $sql = "UPDATE tasks SET " . implode(", ", $fields) . " WHERE id = ? AND user_id = ?";
        $stmt = $pdo->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Database error: " . implode(" ", $pdo->errorInfo()));
        }
        
        $stmt->execute($values);
        $updatedTask = fetchTaskById($pdo, $id, $user_id);
        
        echo json_encode([
            "status" => "success",
            "message" => "Task updated successfully",
            "task" => $updatedTask
        ]);
        exit();
    }

    // Delete task
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        if (!isset($_GET['id'])) {
            throw new Exception("Task ID is required");
        }
        
        $id = intval($_GET['id']);
        
        $sql = "UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?";
        $stmt = $pdo->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Database error: " . implode(" ", $pdo->errorInfo()));
        }
        
        $stmt->execute([$id, $user_id]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception("Task not found or unauthorized");
        }
        
        echo json_encode([
            "status" => "success",
            "message" => "Task deleted successfully",
            "id" => $id
        ]);
        exit();
    }

} catch (Exception $e) {
    $statusCode = in_array($e->getMessage(), [
        "Task and priority are required",
        "Task ID is required",
        "Task cannot be empty",
        "Priority must be low, medium, or high",
        "Due date must use YYYY-MM-DD format",
        "Invalid JSON request body"
    ], true) ? 400 : 500;

    http_response_code($statusCode);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
} finally {
    if (isset($pdo)) {
        $pdo = null;
    }
}
?> 
