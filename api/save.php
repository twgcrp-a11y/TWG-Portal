<?php
// TWG Portal — Save team/admissions/daily log to MySQL
require_once 'db.php';
corsHeaders();

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) jsonOut(['ok' => false, 'error' => 'Invalid JSON'], 400);

try {
    $db = getDB();

    // ── Save team actuals & targets ──────────────────────────────────────────
    if (!empty($input['team'])) {
        $stmt = $db->prepare("INSERT INTO twg_team (name, role, target, actual)
            VALUES (:name, :role, :target, :actual)
            ON DUPLICATE KEY UPDATE role=VALUES(role), target=VALUES(target), actual=VALUES(actual)");
        foreach ($input['team'] as $m) {
            $stmt->execute([
                ':name'   => $m['name'],
                ':role'   => $m['role'],
                ':target' => (float)($m['target'] ?? 0),
                ':actual' => (float)($m['actual'] ?? 0),
            ]);
        }
    }

    // ── Save admissions ──────────────────────────────────────────────────────
    if (!empty($input['admissions']) && !empty($input['month'])) {
        $stmt = $db->prepare("INSERT INTO twg_admissions (dept, month, value)
            VALUES (:dept, :month, :value)
            ON DUPLICATE KEY UPDATE value=VALUES(value)");
        foreach ($input['admissions'] as $dept => $val) {
            $stmt->execute([':dept' => $dept, ':month' => $input['month'], ':value' => (int)$val]);
        }
    }

    // ── Save daily log entries (only new ones — identified by id) ────────────
    if (!empty($input['dailyLog'])) {
        $stmt = $db->prepare("INSERT IGNORE INTO twg_daily_log
            (id, member, log_date, calls, meetings, leads, closures, collection, revenue, submitted_by, submitted_at)
            VALUES (:id, :member, :date, :calls, :meetings, :leads, :closures, :collection, :revenue, :by, :at)");
        foreach ($input['dailyLog'] as $e) {
            $stmt->execute([
                ':id'         => (int)$e['id'],
                ':member'     => $e['member'],
                ':date'       => $e['date'],
                ':calls'      => (int)($e['calls'] ?? 0),
                ':meetings'   => (int)($e['meetings'] ?? 0),
                ':leads'      => (int)($e['leads'] ?? 0),
                ':closures'   => (int)($e['closures'] ?? 0),
                ':orderIntake' => (float)($e['orderIntake'] ?? 0),
                ':sales'    => (float)($e['sales'] ?? 0),
                ':by'         => $e['submittedBy'] ?? '',
                ':at'         => $e['submittedAt'] ?? date('Y-m-d H:i:s'),
            ]);
        }
    }

    // ── Save settings (month, period) ────────────────────────────────────────
    if (!empty($input['month'])) {
        $db->prepare("INSERT INTO twg_settings (key_name, value) VALUES ('month', ?)
            ON DUPLICATE KEY UPDATE value=VALUES(value)")->execute([$input['month']]);
    }
    if (!empty($input['period'])) {
        $db->prepare("INSERT INTO twg_settings (key_name, value) VALUES ('period', ?)
            ON DUPLICATE KEY UPDATE value=VALUES(value)")->execute([$input['period']]);
    }
    $db->prepare("INSERT INTO twg_settings (key_name, value) VALUES ('last_updated_by', ?)
        ON DUPLICATE KEY UPDATE value=VALUES(value)")->execute([$input['user'] ?? 'unknown']);
    $db->prepare("INSERT INTO twg_settings (key_name, value) VALUES ('last_updated_at', NOW())
        ON DUPLICATE KEY UPDATE value=NOW()")->execute([]);

    jsonOut(['ok' => true, 'message' => 'Saved']);
} catch (Exception $e) {
    jsonOut(['ok' => false, 'error' => $e->getMessage()], 500);
}
