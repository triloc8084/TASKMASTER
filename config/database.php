<?php
$host = getenv('DB_HOST') ?: 'gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com';
$dbname = getenv('DB_NAME') ?: 'todo_app';
$username = getenv('DB_USER') ?: '3tyzKtq58X9hmED.root';
$password = getenv('DB_PASS') !== false ? getenv('DB_PASS') : 'Rzs0iPykd50Bkuel';
$port = getenv('DB_PORT') ?: '4000';

// Handle SSL CA certificate path
$ssl_ca = getenv('DB_SSL_CA');
if (!$ssl_ca) {
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        // Fallback for Windows local development using TiDB Cloud
        $local_win_ca = __DIR__ . '/isrgrootx1.pem';
        if (file_exists($local_win_ca)) {
            $ssl_ca = $local_win_ca;
        }
    } else {
        // Fallback for Linux (Render) production environment
        $linux_ca = '/etc/ssl/certs/ca-certificates.crt';
        if (file_exists($linux_ca)) {
            $ssl_ca = $linux_ca;
        }
    }
}

try {
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];

    // If SSL CA file is specified, configure SSL options
    if ($ssl_ca) {
        $options[PDO::MYSQL_ATTR_SSL_CA] = $ssl_ca;
        $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
    }

    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname", $username, $password, $options);
} catch(PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
    exit;
} 