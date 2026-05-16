<?php
require_once '../config/database.php';

try {
    // Query to check if the user exists
    $stmt = $pdo->prepare("SELECT id, username, email, created_at FROM users WHERE email = ?");
    $stmt->execute(['adityasalunkhe150@gmail.com']);
    $user = $stmt->fetch();

    if ($user) {
        echo "User found successfully!<br>";
        echo "Username: " . htmlspecialchars($user['username']) . "<br>";
        echo "Email: " . htmlspecialchars($user['email']) . "<br>";
        echo "Created at: " . htmlspecialchars($user['created_at']) . "<br>";
    } else {
        echo "User not found. Please make sure you ran add_user.php first.";
    }
} catch(PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?> 