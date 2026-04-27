<?php
require_once 'db.php';
corsHeaders();

$input    = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = trim($input['password'] ?? '');

// Default passwords (used if no custom password set via portal)
$defaults = [
    'CEO'      => 'TwgCeo@2026',
    'Abdullah' => 'Abd@Twg2026',
    'Munawar'  => 'Mun@Twg2026',
    'Tameem'   => 'Tam@Twg2026',
    'Muzamil'  => 'Muz@Twg2026',
    'Wahed'    => 'Wah@Twg2026',
];

if (!isset($defaults[$username])) {
    jsonOut(['ok' => false, 'error' => 'Invalid credentials'], 401);
}

// Load custom passwords set via portal (bcrypt hashes)
$pwdFile   = __DIR__ . '/passwords.json';
$custom    = file_exists($pwdFile) ? (json_decode(file_get_contents($pwdFile), true) ?? []) : [];

// Check custom bcrypt hash first
if (!empty($custom[$username]) && password_verify($password, $custom[$username])) {
    jsonOut(['ok' => true, 'user' => $username, 'mode' => 'mysql']);
}

// Fall back to default password
if ($password === $defaults[$username]) {
    jsonOut(['ok' => true, 'user' => $username, 'mode' => 'mysql']);
}

jsonOut(['ok' => false, 'error' => 'Invalid credentials'], 401);
