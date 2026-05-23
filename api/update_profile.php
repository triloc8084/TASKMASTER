<?php
require_once 'config.php';
header('Content-Type: application/json');
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
}
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

    $data = json_decode(file_get_contents("php://input"), true);
    if (json_last_error() !== JSON_ERROR_NONE || !$data) {
        throw new Exception("Invalid request");
    }

    $fullName = sanitizeInput($data['fullName'] ?? '');
    $email = sanitizeInput($data['email'] ?? '');
    $password = $data['password'] ?? '';
    $confirmPassword = $data['confirmPassword'] ?? '';
    $userId = $_SESSION['user_id'];

    if (empty($fullName) || empty($email)) {
        throw new Exception("Name and email are required");
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception("Invalid email format");
    }

    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id <> ?");
    $stmt->execute([$email, $userId]);
    if ($stmt->fetch(PDO::FETCH_ASSOC)) {
        throw new Exception("Email already registered");
    }

    if (!empty($password) || !empty($confirmPassword)) {
        if ($password !== $confirmPassword) {
            throw new Exception("Passwords do not match");
        }
        if (strlen($password) < 8) {
            throw new Exception("Password must be at least 8 characters long");
        }
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("UPDATE users SET full_name = ?, email = ?, password = ? WHERE id = ?");
        $stmt->execute([$fullName, $email, $hashedPassword, $userId]);
    } else {
        $stmt = $pdo->prepare("UPDATE users SET full_name = ?, email = ? WHERE id = ?");
        $stmt->execute([$fullName, $email, $userId]);
    }

    $_SESSION['full_name'] = $fullName;
    $_SESSION['email'] = $email;

    echo json_encode([
        "status" => "success",
        "message" => "Profile updated successfully",
        "user" => [
            "id" => $userId,
            "full_name" => $fullName,
            "email" => $email
        ]
    ]);
} catch (Exception $e) {
    if (http_response_code() === 200) {
        http_response_code(400);
    }
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>
