<?php
require_once 'db.php';
corsHeaders();

$input    = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = trim($input['password'] ?? '');

// Individual passwords per user (plain text for now — replace with bcrypt hashes in production)
// To generate a hash: php -r "echo password_hash('yourpassword', PASSWORD_BCRYPT);"
$users = [
    'CEO'      => ['pass' => 'admin123',    'hash' => ''],
    'Abdullah' => ['pass' => 'abdullah123', 'hash' => ''],
    'Munawar'  => ['pass' => 'munawar123',  'hash' => ''],
    'Tameem'   => ['pass' => 'tameem123',   'hash' => ''],
    'Muzamil'  => ['pass' => 'muzamil123',  'hash' => ''],
    'Wahed'    => ['pass' => 'wahed123',    'hash' => ''],
];

if (!isset($users[$username])) {
    jsonOut(['ok' => false, 'error' => 'User not found'], 401);
}

$user = $users[$username];

// Check plain text password (for initial setup)
if ($password === $user['pass']) {
    jsonOut(['ok' => true, 'user' => $username, 'mode' => 'mysql']);
}

// Check bcrypt hash if set
if (!empty($user['hash']) && password_verify($password, $user['hash'])) {
    jsonOut(['ok' => true, 'user' => $username, 'mode' => 'mysql']);
}

jsonOut(['ok' => false, 'error' => 'Invalid password'], 401);
