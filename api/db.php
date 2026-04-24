<?php
// TWG Portal — MySQL connection
// Fill in your cPanel DB credentials below
define('DB_HOST', 'localhost');
define('DB_NAME', 'YOUR_CPANEL_DB_NAME');   // e.g. pecbuhms_twg
define('DB_USER', 'YOUR_CPANEL_DB_USER');   // e.g. pecbuhms_twguser
define('DB_PASS', 'YOUR_CPANEL_DB_PASS');

function getDB() {
    static $pdo = null;
    if ($pdo) return $pdo;
    $pdo = new PDO(
        'mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4',
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    return $pdo;
}

function corsHeaders() {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
}

function jsonOut($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}
