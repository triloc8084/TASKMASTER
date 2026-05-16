<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");

// Set session cookie parameters
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_samesite', 'Lax');

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Check if user is logged in
$isLoggedIn = isset($_SESSION['user_id']);

// Return response
echo json_encode([
    "status" => "success",
    "is_logged_in" => $isLoggedIn,
    "user_id" => $isLoggedIn ? $_SESSION['user_id'] : null,
    "full_name" => $isLoggedIn ? $_SESSION['full_name'] : null,
    "email" => $isLoggedIn ? $_SESSION['email'] : null
]);
?> 