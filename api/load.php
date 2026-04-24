<?php
// TWG Portal — Load all shared data from MySQL
require_once 'db.php';
corsHeaders();

try {
    $db = getDB();

    // Team
    $team = $db->query("SELECT name, role, target, actual FROM twg_team ORDER BY id")->fetchAll();

    // Admissions for current month (or all if needed)
    $month   = $_GET['month'] ?? date('F');
    $admRows = $db->prepare("SELECT dept, value FROM twg_admissions WHERE month = ?");
    $admRows->execute([$month]);
    $admissions = [];
    foreach ($admRows->fetchAll() as $r) $admissions[$r['dept']] = (int)$r['value'];

    // Daily log — all entries
    $logs = $db->query("SELECT id, member, DATE_FORMAT(log_date,'%Y-%m-%d') as date,
        calls, meetings, leads, closures, order_intake as orderIntake, sales,
        submitted_by as submittedBy, submitted_at as submittedAt
        FROM twg_daily_log ORDER BY submitted_at DESC")->fetchAll();

    // Settings
    $settings = [];
    foreach ($db->query("SELECT key_name, value FROM twg_settings")->fetchAll() as $r) {
        $settings[$r['key_name']] = $r['value'];
    }

    jsonOut([
        'ok'         => true,
        'team'       => $team,
        'admissions' => $admissions,
        'dailyLog'   => $logs,
        'settings'   => $settings,
    ]);
} catch (Exception $e) {
    jsonOut(['ok' => false, 'error' => $e->getMessage()], 500);
}
