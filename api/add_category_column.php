<?php
require_once 'config.php';

try {
    $conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);
    
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    
    // Check if column exists
    $result = $conn->query("SHOW COLUMNS FROM tasks LIKE 'category'");
    if ($result->num_rows == 0) {
        $sql = "ALTER TABLE tasks ADD COLUMN category VARCHAR(50) DEFAULT 'General'";
        if ($conn->query($sql)) {
            echo "✓ Category column added successfully\n";
        } else {
            throw new Exception("Error adding column: " . $conn->error);
        }
    } else {
        echo "✓ Category column already exists\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
