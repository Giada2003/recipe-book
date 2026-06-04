<?php
// auth_api.php
// This script handles AJAX requests for user registration and login.
session_start();
require_once 'database.php';

// Set header to return JSON response
header('Content-Type: application/json');

// Read the incoming JSON payload
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['action'])) {
    echo json_encode(['success' => false, 'message' => 'No action specified.']);
    exit;
}

$action = $data['action'];
$username = trim($data['username'] ?? '');
$password = $data['password'] ?? '';

// Basic validation
if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Username and password are required.']);
    exit;
}

if ($action === 'register') {
    $db = get_db();

    // Check if username already exists
    foreach ($db['users'] as $user) {
        if ($user['username'] === $username) {
            echo json_encode(['success' => false, 'message' => 'Username already exists.']);
            exit;
        }
    }

    // Hash the password for secure storage
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $new_user_id = get_next_id($db['users']);

    $db['users'][] = [
        'id' => $new_user_id,
        'username' => $username,
        'password' => $hashed_password
    ];

    save_db($db);

    // Log the user in automatically after successful registration
    $_SESSION['user_id'] = $new_user_id;
    $_SESSION['username'] = $username;

    echo json_encode(['success' => true, 'message' => 'Registration successful!']);

} elseif ($action === 'login') {
    $db = get_db();
    foreach ($db['users'] as $user) {
        if ($user['username'] === $username && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            echo json_encode(['success' => true, 'message' => 'Login successful!']);
            exit;
        }
    }
    echo json_encode(['success' => false, 'message' => 'Invalid username or password.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action.']);
}
?>
