<?php
declare(strict_types=1);

// PHP API bootstrap for InfinityFree. Never commit config.local.php or real credentials.
$configFile = __DIR__ . '/config.local.php';
if (!is_file($configFile)) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'server_not_configured'], JSON_UNESCAPED_SLASHES);
    exit;
}
$config = require $configFile;
$db = $config['db'] ?? [];
foreach (['host', 'name', 'user', 'password'] as $key) {
    if (!isset($db[$key]) || $db[$key] === '') {
        http_response_code(503);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'database_not_configured'], JSON_UNESCAPED_SLASHES);
        exit;
    }
}
$dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $db['host'], $db['name'], $db['charset'] ?? 'utf8mb4');
try {
    $pdo = new PDO($dsn, $db['user'], $db['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (Throwable $e) {
    error_log('HaatBazar database connection failed.');
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'database_unavailable'], JSON_UNESCAPED_SLASHES);
    exit;
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name((string)($config['session_name'] ?? 'hb.sid'));
    session_set_cookie_params([
        'lifetime' => 60 * 60 * 24 * 7,
        'path' => '/',
        'secure' => (bool)($config['session_secure'] ?? true),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function hb_json(array $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}
function hb_body(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return $_POST;
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) hb_json(['error' => 'invalid_json'], 400);
    return $decoded;
}
function hb_user(): ?array {
    return isset($_SESSION['user']) && is_array($_SESSION['user']) ? $_SESSION['user'] : null;
}
function hb_require_user(): array {
    $user = hb_user();
    if (!$user) hb_json(['error' => 'login_required'], 401);
    return $user;
}
function hb_require_admin(): array {
    $user = hb_require_user();
    if (($user['role'] ?? '') !== 'admin') hb_json(['error' => 'admin_required'], 403);
    return $user;
}
function hb_csrf_check(): void {
    if (in_array(strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')), ['GET', 'HEAD', 'OPTIONS'], true)) return;
    $sent = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    $expected = (string)($_SESSION['csrf_token'] ?? '');
    if ($sent === '' || $expected === '' || !hash_equals($expected, $sent)) hb_json(['error' => 'csrf_failed'], 403);
}

// Enforce CSRF on state-changing requests before the router handles them.
hb_csrf_check();
