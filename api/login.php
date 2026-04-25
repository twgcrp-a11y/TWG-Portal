<?php
require_once 'db.php';
corsHeaders();

$input    = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = trim($input['password'] ?? '');

// ─── Passwords ────────────────────────────────────────────────────────────────
// Change these before going live. To generate a bcrypt hash:
// php -r "echo password_hash('yournewpassword', PASSWORD_BCRYPT);"
// Then replace the plain 'pass' value with '' and put the hash in 'hash'
$users = [
    'CEO'      => ['pass' => 'TwgCeo@2026',      'hash' => ''],
    'Abdullah' => ['pass' => 'Abd@Twg2026',       'hash' => ''],
    'Munawar'  => ['pass' => 'Mun@Twg2026',       'hash' => ''],
    'Tameem'   => ['pass' => 'Tam@Twg2026',       'hash' => ''],
    'Muzamil'  => ['pass' => 'Muz@Twg2026',       'hash' => ''],
    'Wahed'    => ['pass' => 'Wah@Twg2026',       'hash' => ''],
];

if (!isset($users[$username])) {
    jsonOut(['ok' => false, 'error' => 'Invalid credentials'], 401);
}

$user = $users[$username];

// Check plain text (used during initial setup)
if (!empty($user['pass']) && $password === $user['pass']) {
    jsonOut(['ok' => true, 'user' => $username, 'mode' => 'mysql']);
}

// Check bcrypt hash (production)
if (!empty($user['hash']) && password_verify($password, $user['hash'])) {
    jsonOut(['ok' => true, 'user' => $username, 'mode' => 'mysql']);
}

jsonOut(['ok' => false, 'error' => 'Invalid credentials'], 401);
