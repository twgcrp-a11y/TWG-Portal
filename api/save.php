<?php
// TWG Portal — Save all data to MySQL
require_once 'db.php';
corsHeaders();

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) jsonOut(['ok' => false, 'error' => 'Invalid JSON'], 400);

try {
    $db = getDB();

    // ── Team targets ─────────────────────────────────────────────────────────
    if (!empty($input['team'])) {
        $stmt = $db->prepare("INSERT INTO twg_team (name, role, target, actual)
            VALUES (:name, :role, :target, :actual)
            ON DUPLICATE KEY UPDATE role=VALUES(role), target=VALUES(target), actual=VALUES(actual)");
        foreach ($input['team'] as $m) {
            $stmt->execute([
                ':name'   => $m['name'],
                ':role'   => $m['role']   ?? '',
                ':target' => (float)($m['target'] ?? 0),
                ':actual' => (float)($m['actual']  ?? 0),
            ]);
        }
    }

    // ── Admissions ────────────────────────────────────────────────────────────
    if (!empty($input['admissions']) && !empty($input['month'])) {
        $stmt = $db->prepare("INSERT INTO twg_admissions (dept, month, value)
            VALUES (:dept, :month, :value)
            ON DUPLICATE KEY UPDATE value=VALUES(value)");
        foreach ($input['admissions'] as $dept => $val) {
            $stmt->execute([':dept' => $dept, ':month' => $input['month'], ':value' => (int)$val]);
        }
    }

    // ── Daily log ─────────────────────────────────────────────────────────────
    if (!empty($input['dailyLog'])) {
        $stmt = $db->prepare("INSERT INTO twg_daily_log
            (id, member, log_date, calls, meetings, leads, closures, order_intake, sales, submitted_by, submitted_at)
            VALUES (:id, :member, :date, :calls, :meetings, :leads, :closures, :orderIntake, :sales, :by, :at)
            ON DUPLICATE KEY UPDATE
                calls=VALUES(calls), meetings=VALUES(meetings), leads=VALUES(leads),
                closures=VALUES(closures), order_intake=VALUES(order_intake), sales=VALUES(sales)");
        foreach ($input['dailyLog'] as $e) {
            $stmt->execute([
                ':id'          => (int)($e['id'] ?? 0),
                ':member'      => $e['member']      ?? '',
                ':date'        => $e['date']         ?? date('Y-m-d'),
                ':calls'       => (int)($e['calls']      ?? 0),
                ':meetings'    => (int)($e['meetings']   ?? 0),
                ':leads'       => (int)($e['leads']      ?? 0),
                ':closures'    => (int)($e['closures']   ?? 0),
                ':orderIntake' => (float)($e['orderIntake'] ?? $e['collection'] ?? 0),
                ':sales'       => (float)($e['sales']       ?? $e['revenue']    ?? 0),
                ':by'          => $e['submittedBy']  ?? '',
                ':at'          => $e['submittedAt']  ?? date('Y-m-d H:i:s'),
            ]);
        }
    }

    // ── Settings ──────────────────────────────────────────────────────────────
    $settings = [
        'month'           => $input['month']  ?? '',
        'period'          => $input['period'] ?? '',
        'last_updated_by' => $input['user']   ?? '',
        'last_updated_at' => date('Y-m-d H:i:s'),
    ];
    $stmt = $db->prepare("INSERT INTO twg_settings (key_name, value)
        VALUES (:k, :v) ON DUPLICATE KEY UPDATE value=VALUES(value)");
    foreach ($settings as $k => $v) {
        if ($v) $stmt->execute([':k' => $k, ':v' => $v]);
    }

    jsonOut(['ok' => true, 'message' => 'Saved']);
} catch (Exception $e) {
    jsonOut(['ok' => false, 'error' => $e->getMessage()], 500);
}
