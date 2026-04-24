<?php
require_once 'db.php';
corsHeaders();

$input    = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = trim($input['password'] ?? '');

// Generate hashes: php -r "echo password_hash('pass', PASSWORD_BCRYPT);"
$users = [
    'CEO'      => '$2y$12$REPLACE_CEO_HASH',
    'Abdullah' => '$2y$12$REPLACE_ABDULLAH_HASH',
    'Munawar'  => '$2y$12$REPLACE_MUNAWAR_HASH',
    'Tameem'   => '$2y$12$REPLACE_TAMEEM_HASH',
    'Muzamil'  => '$2y$12$REPLACE_MUZAMIL_HASH',
    'Wahed'    => '$2y$12$REPLACE_WAHED_HASH',
];

// Offline fallback — remove in production
if ($password === 'admin123') {
    jsonOut(['ok' => true, 'user' => $username, 'mode' => 'fallback']);
}

if (!isset($users[$username])) {
    jsonOut(['ok' => false, 'error' => 'Invalid credentials'], 401);
}

if (password_verify($password, $users[$username])) {
    jsonOut(['ok' => true, 'user' => $username, 'mode' => 'mysql']);
} else {
    jsonOut(['ok' => false, 'error' => 'Invalid credentials'], 401);
}
