<?php
// TWG Portal — Run once to create all tables
// Visit: https://portal.technoworldgroup.com/api/setup.php
// DELETE this file after running!
require_once 'db.php';
corsHeaders();

try {
    $db = getDB();

    $db->exec("CREATE TABLE IF NOT EXISTS twg_team (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(150) NOT NULL UNIQUE,
        role       VARCHAR(150),
        target     DECIMAL(10,2) DEFAULT 0,
        actual     DECIMAL(10,2) DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    $db->exec("CREATE TABLE IF NOT EXISTS twg_admissions (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        dept       VARCHAR(50) NOT NULL,
        month      VARCHAR(20) NOT NULL,
        value      INT DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY dept_month (dept, month)
    )");

    $db->exec("CREATE TABLE IF NOT EXISTS twg_daily_log (
        id           BIGINT PRIMARY KEY,
        member       VARCHAR(150) NOT NULL,
        log_date     DATE NOT NULL,
        calls        INT DEFAULT 0,
        meetings     INT DEFAULT 0,
        leads        INT DEFAULT 0,
        closures     INT DEFAULT 0,
        order_intake DECIMAL(12,2) DEFAULT 0,
        sales        DECIMAL(12,2) DEFAULT 0,
        submitted_by VARCHAR(50),
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    $db->exec("CREATE TABLE IF NOT EXISTS twg_settings (
        key_name   VARCHAR(50) PRIMARY KEY,
        value      TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    jsonOut(['ok' => true, 'message' => 'All tables created successfully. Delete setup.php now!']);
} catch (Exception $e) {
    jsonOut(['ok' => false, 'error' => $e->getMessage()], 500);
}
