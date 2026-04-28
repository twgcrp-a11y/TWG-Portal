<?php
// TWG Portal — Change user password (CEO only)
require_once 'db.php';
corsHeaders();

$input    = json_decode(file_get_contents('php://input'), true);
$adminPwd = trim($input['adminPassword'] ?? '');
$username = trim($input['username']      ?? '');
$newPass  = trim($input['newPassword']   ?? '');

// Verify CEO password first
if ($adminPwd !== 'TwgCeo@2026') {
    jsonOut(['ok' => false, 'error' => 'Unauthorized'], 401);
}

if (!$username || !$newPass) {
    jsonOut(['ok' => false, 'error' => 'Missing username or password'], 400);
}

if (strlen($newPass) < 6) {
    jsonOut(['ok' => false, 'error' => 'Password must be at least 6 characters'], 400);
}

$allowed = ['CEO','Abdullah','AQ','Munawar','Tameem','Muzamil','Wahed'];
if (!in_array($username, $allowed)) {
    jsonOut(['ok' => false, 'error' => 'Unknown user'], 400);
}

// Store passwords in a JSON file (writable by PHP)
$pwdFile = __DIR__ . '/passwords.json';

// Load existing passwords
$passwords = [];
if (file_exists($pwdFile)) {
    $passwords = json_decode(file_get_contents($pwdFile), true) ?? [];
}

// Update password as bcrypt hash
$passwords[$username] = password_hash($newPass, PASSWORD_BCRYPT);

// Save back
if (file_put_contents($pwdFile, json_encode($passwords, JSON_PRETTY_PRINT)) === false) {
    jsonOut(['ok' => false, 'error' => 'Could not write password file — check folder permissions'], 500);
}

jsonOut(['ok' => true, 'message' => "Password updated for $username"]);
