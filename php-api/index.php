<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = preg_replace('#/+#', '/', $path);

if ($method === 'GET' && $path === '/api/healthz') {
    hb_json(['status' => 'ok', 'service' => 'haatbazar-php', 'time' => gmdate('c')]);
}
if ($method === 'GET' && $path === '/api/me') {
    hb_json(['user' => hb_user()]);
}
if ($method === 'GET' && $path === '/api/csrf') {
    if (empty($_SESSION['csrf_token'])) $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    hb_json(['csrfToken' => $_SESSION['csrf_token']]);
}

// Deliberately fail closed until each endpoint has parity/security tests.
// Never route unsupported writes to a permissive fallback.
hb_json(['error' => 'endpoint_not_migrated', 'message' => 'This endpoint is not enabled in the PHP migration yet.'], 501);
