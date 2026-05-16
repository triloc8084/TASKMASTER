<?php
require_once '../config/database.php';

$email = 'adityasalunkhe150@gmail.com';
$password = 'Aditya@123';
$full_name = 'Aditya Salunkhe'; // Using full name instead of username

// Hash the password for security
$hashed_password = password_hash($password, PASSWORD_DEFAULT);

try {
    // Prepare the SQL statement
    $stmt = $pdo->prepare("INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)");
    
    // Execute the statement with the values
    $stmt->execute([$full_name, $email, $hashed_password]);
    
    echo "User added successfully!";
} catch(PDOException $e) {
    if($e->getCode() == 23000) { // Duplicate entry error
        echo "This email is already registered.";
    } else {
        echo "Error: " . $e->getMessage();
    }
}
?> 