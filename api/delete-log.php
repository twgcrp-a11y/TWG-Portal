<?php
// TWG Portal — Delete a daily log entry (CEO only — enforced client-side)
require_once 'db.php';
corsHeaders();

$input = json_decode(file_get_contents('php://input'), true);
$id    = (int)($input['id'] ?? 0);
if (!$id) jsonOut(['ok' => false, 'error' => 'Missing id'], 400);

try {
    $db = getDB();
    $db->prepare("DELETE FROM twg_daily_log WHERE id = ?")->execute([$id]);
    jsonOut(['ok' => true]);
} catch (Exception $e) {
    jsonOut(['ok' => false, 'error' => $e->getMessage()], 500);
}
