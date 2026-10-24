<?php
declare(strict_types=1);
session_start();
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$configFile = dirname(__DIR__) . '/config.php';
if (!is_file($configFile)) {
    http_response_code(503);
    echo json_encode(['error' => 'Server setup incomplete. Copy config.example.php to config.php and configure it.']);
    exit;
}
$config = require $configFile;
if (!isset($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));

function out(array $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function body(): array {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw ?: '', true);
    return is_array($json) ? $json : $_POST;
}
function requirePost(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(['error' => 'POST required'], 405);
}
function csrf(): void {
    $b = body();
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($b['_csrf'] ?? '');
    if (!is_string($token) || !hash_equals($_SESSION['csrf'] ?? '', $token)) out(['error' => 'Invalid CSRF token'], 419);
}
function db(array $c): PDO {
    static $pdo = null;
    if (!$pdo) $pdo = new PDO($c['db_dsn'], $c['db_user'], $c['db_password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    return $pdo;
}
function currentUser(): ?array {
    return isset($_SESSION['user']) && is_array($_SESSION['user']) ? $_SESSION['user'] : null;
}
function needUser(): array {
    $u = currentUser();
    if (!$u) out(['error' => 'Please log in first'], 401);
    return $u;
}
function needAdmin(): array {
    $u = needUser();
    if (($u['role'] ?? '') !== 'admin') out(['error' => 'Admin access required'], 403);
    return $u;
}
function cleanString(mixed $v, int $max = 200): string {
    if (!is_string($v)) return '';
    return function_exists('mb_substr') ? mb_substr(trim($v), 0, $max) : substr(trim($v), 0, $max);
}
function sslBase(array $c): string {
    return !empty($c['sslcommerz_sandbox']) ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com';
}
function sslValidate(array $c, string $valId): array {
    $url = sslBase($c) . '/validator/api/validationserverAPI.php?' . http_build_query([
        'val_id' => $valId, 'store_id' => $c['sslcommerz_store_id'],
        'store_passwd' => $c['sslcommerz_store_password'], 'format' => 'json'
    ]);
    $ctx = stream_context_create(['http' => ['timeout' => 15, 'ignore_errors' => true]]);
    $raw = @file_get_contents($url, false, $ctx);
    if ($raw === false) throw new RuntimeException('Payment validation service unavailable');
    $data = json_decode($raw, true);
    if (!is_array($data)) throw new RuntimeException('Invalid payment validation response');
    return $data;
}

$action = cleanString($_GET['action'] ?? '', 60);
$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
// Compatibility alias for the existing React frontend's public listing endpoint.
if ($action === '' && preg_match('~/api/listings/?$~', $requestPath) && $_SERVER['REQUEST_METHOD'] === 'GET') $action = 'products';
try {
    $pdo = db($config);
    if ($action === 'csrf') out(['csrf' => $_SESSION['csrf']]);

    if ($action === 'products' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $q = cleanString($_GET['q'] ?? '', 100);
        $category = cleanString($_GET['category'] ?? '', 80);
        $sql = "SELECT id,title,category,subcategory,district,price,unit,quantity,description,images,sellerName,businessName,created_at FROM listings WHERE status='active'";
        $params = [];
        if ($q !== '') { $sql .= " AND (title LIKE ? OR description LIKE ?)"; $params[] = "%$q%"; $params[] = "%$q%"; }
        if ($category !== '') { $sql .= " AND category=?"; $params[] = $category; }
        $sql .= ' ORDER BY created_at DESC LIMIT 100';
        $st = $pdo->prepare($sql); $st->execute($params);
        $items = $st->fetchAll();
        foreach ($items as &$item) $item['images'] = json_decode($item['images'] ?: '[]', true) ?: [];
        out(['products' => $items, 'items' => $items, 'total' => count($items), 'page' => 1, 'limit' => 100]);
    }

    if ($action === 'me' && $_SERVER['REQUEST_METHOD'] === 'GET') out(['user' => currentUser(), 'csrf' => $_SESSION['csrf']]);

    // Browser pages for the InfinityFree deployment (the Node server is not available there).
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'login') {
        header('Content-Type: text/html; charset=utf-8');
        $csrfToken = htmlspecialchars($_SESSION['csrf'], ENT_QUOTES, 'UTF-8');
        $returnTo = cleanString($_GET['returnTo'] ?? '/api/account', 300);
        if ($returnTo === '' || $returnTo[0] !== '/' || str_starts_with($returnTo, '//')) $returnTo = '/api/account';
        $returnEsc = htmlspecialchars($returnTo, ENT_QUOTES, 'UTF-8');
        echo '<!doctype html><html lang="bn"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>লগইন | হাটবাজার</title><body style="font-family:system-ui,sans-serif;max-width:460px;margin:40px auto;padding:20px;color:#153c2a"><a href="/">← হাটবাজার</a><h1>লগইন করুন</h1><form method="post" action="/api/login"><input type="hidden" name="_csrf" value="'.$csrfToken.'"><input type="hidden" name="returnTo" value="'.$returnEsc.'"><label>ইমেইল<br><input style="box-sizing:border-box;width:100%;padding:12px;margin:8px 0 16px" name="email" type="email" required autocomplete="email"></label><label>পাসওয়ার্ড<br><input style="box-sizing:border-box;width:100%;padding:12px;margin:8px 0 16px" name="password" type="password" required autocomplete="current-password"></label><button style="padding:12px 20px;background:#166534;color:white;border:0;border-radius:8px">লগইন</button></form><p>নতুন ব্যবহারকারী? <a href="/api/register">সাইন আপ করুন</a></p></body></html>';
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'register') {
        header('Content-Type: text/html; charset=utf-8');
        $csrfToken = htmlspecialchars($_SESSION['csrf'], ENT_QUOTES, 'UTF-8');
        echo '<!doctype html><html lang="bn"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>সাইন আপ | হাটবাজার</title><body style="font-family:system-ui,sans-serif;max-width:460px;margin:40px auto;padding:20px;color:#153c2a"><a href="/">← হাটবাজার</a><h1>নতুন অ্যাকাউন্ট খুলুন</h1><form method="post" action="/api/register"><input type="hidden" name="_csrf" value="'.$csrfToken.'"><label>আপনার নাম<br><input style="box-sizing:border-box;width:100%;padding:12px;margin:8px 0 16px" name="name" required minlength="2" maxlength="100" autocomplete="name"></label><label>ইমেইল<br><input style="box-sizing:border-box;width:100%;padding:12px;margin:8px 0 16px" name="email" type="email" required maxlength="190" autocomplete="email"></label><label>মোবাইল নম্বর<br><input style="box-sizing:border-box;width:100%;padding:12px;margin:8px 0 16px" name="phone" type="tel" maxlength="30" autocomplete="tel"></label><label>পাসওয়ার্ড (কমপক্ষে ১০ অক্ষর)<br><input style="box-sizing:border-box;width:100%;padding:12px;margin:8px 0 16px" name="password" type="password" required minlength="10" autocomplete="new-password"></label><label>অ্যাকাউন্টের ধরন<br><select style="width:100%;padding:12px;margin:8px 0 16px" name="role"><option value="buyer">ক্রেতা</option><option value="seller">বিক্রেতা</option></select></label><button style="padding:12px 20px;background:#166534;color:white;border:0;border-radius:8px">অ্যাকাউন্ট তৈরি করুন</button></form><p>আগে অ্যাকাউন্ট আছে? <a href="/api/login">লগইন</a></p></body></html>';
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'account') {
        $u = currentUser();
        if (!$u) { header('Location: /api/login?returnTo=%2Fapi%2Faccount', true, 302); exit; }
        header('Content-Type: text/html; charset=utf-8');
        $name = htmlspecialchars((string)($u['name'] ?? ''), ENT_QUOTES, 'UTF-8');
        $email = htmlspecialchars((string)($u['email'] ?? ''), ENT_QUOTES, 'UTF-8');
        $role = htmlspecialchars((string)($u['role'] ?? 'buyer'), ENT_QUOTES, 'UTF-8');
        $csrfToken = htmlspecialchars($_SESSION['csrf'], ENT_QUOTES, 'UTF-8');
        echo '<!doctype html><html lang="bn"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>আমার অ্যাকাউন্ট | হাটবাজার</title><body style="font-family:system-ui,sans-serif;max-width:600px;margin:40px auto;padding:20px;color:#153c2a"><a href="/">← হাটবাজার</a><h1>আমার অ্যাকাউন্ট</h1><section style="border:1px solid #ddd;border-radius:12px;padding:20px"><p><strong>নাম:</strong> '.$name.'</p><p><strong>ইমেইল:</strong> '.$email.'</p><p><strong>অ্যাকাউন্ট:</strong> '.$role.'</p></section><p><a href="/">পণ্য দেখুন</a></p><form method="post" action="/api/logout"><input type="hidden" name="_csrf" value="'.$csrfToken.'"><button style="padding:10px 18px">লগআউট</button></form></body></html>';
        exit;
    }

    if ($action === 'register') {
        requirePost(); $b = body(); csrf();
        $name = cleanString($b['name'] ?? '', 100);
        $email = strtolower(cleanString($b['email'] ?? '', 190));
        $phone = cleanString($b['phone'] ?? '', 30);
        $password = is_string($b['password'] ?? null) ? $b['password'] : '';
        $role = in_array(($b['role'] ?? 'buyer'), ['buyer','seller'], true) ? (string)($b['role'] ?? 'buyer') : 'buyer';
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 10) out(['error' => 'Name, valid email and password of at least 10 characters are required'], 422);
        $hash = password_hash($password, PASSWORD_DEFAULT);
        try {
            $st = $pdo->prepare("INSERT INTO users(name,email,phone,password_hash,role) VALUES(?,?,?,?,?)");
            $st->execute([$name,$email,$phone,$hash,$role]);
        } catch (PDOException $e) {
            if ((string)$e->getCode() === '23000') out(['error' => 'An account with this email already exists'], 409);
            throw $e;
        }
        session_regenerate_id(true);
        $_SESSION['user'] = ['id'=>(int)$pdo->lastInsertId(),'name'=>$name,'email'=>$email,'role'=>$role];
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        if (!str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json')) { header('Location: /api/account', true, 303); exit; }
        out(['user'=>$_SESSION['user'],'csrf'=>$_SESSION['csrf']], 201);
    }

    if ($action === 'login') {
        requirePost(); $b = body(); csrf();
        $email = strtolower(cleanString($b['email'] ?? '', 190));
        $password = is_string($b['password'] ?? null) ? $b['password'] : '';
        $st = $pdo->prepare('SELECT id,name,email,password_hash,role FROM users WHERE email=? LIMIT 1');
        $st->execute([$email]); $row = $st->fetch();
        if (!$row || !password_verify($password, $row['password_hash'])) out(['error'=>'Email or password is incorrect'], 401);
        session_regenerate_id(true);
        $_SESSION['user'] = ['id'=>(int)$row['id'],'name'=>$row['name'],'email'=>$row['email'],'role'=>$row['role']];
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        if (!str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json')) {
            $returnTo = cleanString($b['returnTo'] ?? '/api/account', 300);
            if ($returnTo === '' || $returnTo[0] !== '/' || str_starts_with($returnTo, '//')) $returnTo = '/api/account';
            header('Location: '.$returnTo, true, 303); exit;
        }
        out(['user'=>$_SESSION['user'],'csrf'=>$_SESSION['csrf']]);
    }

    if ($action === 'logout') {
        requirePost(); csrf(); $_SESSION = [];
        if (ini_get('session.use_cookies')) { $p = session_get_cookie_params(); setcookie(session_name(), '', time()-42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']); }
        session_destroy();
        if (!str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json')) { header('Location: /', true, 303); exit; }
        out(['ok'=>true]);
    }

    if ($action === 'checkout') {
        requirePost(); $u = needUser(); $b = body(); csrf();
        $items = $b['items'] ?? [];
        $method = cleanString($b['payment_method'] ?? 'cod', 20);
        if (!is_array($items) || count($items) < 1 || count($items) > 30) out(['error'=>'Cart is empty or too large'], 422);
        if (!in_array($method, ['cod','sslcommerz'], true)) out(['error'=>'Unsupported payment method'], 422);
        $name = cleanString($b['buyer_name'] ?? $u['name'], 100);
        $phone = cleanString($b['buyer_phone'] ?? '', 30);
        $email = cleanString($b['buyer_email'] ?? $u['email'], 190);
        $address = cleanString($b['address'] ?? '', 500);
        if ($name === '' || $phone === '' || $address === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) out(['error'=>'Name, phone, valid email and delivery address are required'], 422);

        $verified = []; $total = 0.0;
        $find = $pdo->prepare("SELECT id,title,price,quantity FROM listings WHERE id=? AND status='active'");
        foreach ($items as $it) {
            $id = cleanString($it['id'] ?? '', 80); $qty = filter_var($it['quantity'] ?? null, FILTER_VALIDATE_FLOAT);
            if ($id === '' || $qty === false || $qty <= 0 || $qty > 100000) out(['error'=>'Invalid cart quantity'], 422);
            $find->execute([$id]); $p = $find->fetch();
            if (!$p || (float)$p['quantity'] < $qty) out(['error'=>'Product unavailable or insufficient quantity: '.$id], 422);
            $lineTotal = (float)$p['price'] * $qty; $total += $lineTotal;
            $verified[] = ['id'=>$id,'title'=>$p['title'],'price'=>(float)$p['price'],'quantity'=>$qty,'amount'=>$lineTotal];
        }
        if ($total <= 0) out(['error'=>'Invalid order total'], 422);
        if ($method === 'sslcommerz' && ($total < 10 || $total > 500000)) out(['error'=>'SSLCOMMERZ transaction amount must be between BDT 10 and BDT 500,000'], 422);
        if ($method === 'sslcommerz' && (empty($config['sslcommerz_store_id']) || empty($config['sslcommerz_store_password']))) out(['error'=>'SSLCOMMERZ credentials are not configured'], 503);

        $pdo->beginTransaction();
        try {
            $created = [];
            $st = $pdo->prepare("INSERT INTO orders(id,listing_id,buyer_id,quantity,buyer_name,buyer_phone,address,status,amount_bdt,buyer_email,payment_status,shipping_status) VALUES(?,?,?,?,?,?,?,'pending',?,?, 'unpaid','not_requested')");
            foreach ($verified as $line) {
                $lineId = 'HB'.gmdate('ymd').strtoupper(bin2hex(random_bytes(5))).'-'.substr(hash('sha256', $line['id']),0,6);
                $st->execute([$lineId,$line['id'],(int)$u['id'],$line['quantity'],$name,$phone,$address,$line['amount'],$email]);
                $created[] = ['id'=>$lineId,'listing_id'=>$line['id'],'amount'=>$line['amount']];
            }
            $pdo->commit();
        } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }

        if ($method === 'cod') out(['ok'=>true,'payment_method'=>'cod','orders'=>$created,'message'=>'Order placed. Pay cash on delivery.'], 201);
        if (count($created) !== 1) out(['error'=>'For online payment, checkout one product line at a time for now'], 422);
        $order = $created[0]; $base = rtrim($config['public_base_url'], '/');
        $payload = [
            'store_id'=>$config['sslcommerz_store_id'], 'store_passwd'=>$config['sslcommerz_store_password'],
            'total_amount'=>number_format((float)$order['amount'],2,'.',''), 'currency'=>'BDT', 'tran_id'=>$order['id'],
            'product_category'=>'marketplace', 'success_url'=>$base.'/api/?action=sslcommerz_success',
            'fail_url'=>$base.'/api/?action=sslcommerz_fail', 'cancel_url'=>$base.'/api/?action=sslcommerz_cancel',
            'ipn_url'=>$base.'/api/?action=sslcommerz_ipn', 'shipping_method'=>'YES',
            'cus_name'=>$name, 'cus_email'=>$email, 'cus_add1'=>$address, 'cus_city'=>'Bangladesh',
            'cus_postcode'=>'0000', 'cus_country'=>'Bangladesh', 'cus_phone'=>$phone,
            'ship_name'=>$name, 'ship_add1'=>$address, 'ship_city'=>'Bangladesh', 'ship_postcode'=>'0000', 'ship_country'=>'Bangladesh',
            'product_name'=>'HaatBazar order '.$order['id'], 'product_profile'=>'general'
        ];
        $opts = ['http'=>['method'=>'POST','header'=>"Content-Type: application/x-www-form-urlencoded\r\n",'content'=>http_build_query($payload),'timeout'=>20,'ignore_errors'=>true]];
        $raw = @file_get_contents(sslBase($config).'/gwprocess/v4/api.php', false, stream_context_create($opts));
        $resp = is_string($raw) ? json_decode($raw,true) : null;
        if (!is_array($resp) || empty($resp['GatewayPageURL'])) out(['error'=>'Could not create SSLCOMMERZ session. Check credentials and server connectivity.'], 502);
        $pdo->prepare("UPDATE orders SET payment_status='initiated' WHERE id=?")->execute([$order['id']]);
        out(['ok'=>true,'payment_method'=>'sslcommerz','redirect_url'=>$resp['GatewayPageURL'],'order'=>$order], 201);
    }

    if (in_array($action, ['sslcommerz_success','sslcommerz_fail','sslcommerz_cancel','sslcommerz_ipn'], true)) {
        requirePost();
        $tranId = cleanString($_POST['tran_id'] ?? '', 100);
        if ($tranId === '') out(['error'=>'Missing transaction ID'], 422);
        $st = $pdo->prepare('SELECT id,amount_bdt,payment_status FROM orders WHERE id=? LIMIT 1');
        $st->execute([$tranId]); $order = $st->fetch();
        if (!$order) out(['error'=>'Order not found'], 404);
        if ($action === 'sslcommerz_fail' || $action === 'sslcommerz_cancel') {
            if ($order['payment_status'] !== 'paid') $pdo->prepare("UPDATE orders SET payment_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")->execute([$action === 'sslcommerz_fail' ? 'failed' : 'cancelled',$tranId]);
            if ($action === 'sslcommerz_ipn') out(['ok'=>true]);
            out(['ok'=>false,'status'=>$action === 'sslcommerz_fail' ? 'failed' : 'cancelled']);
        }
        $valId = cleanString($_POST['val_id'] ?? '', 100);
        if ($valId === '') out(['error'=>'Missing payment validation ID'], 422);
        $validation = sslValidate($config, $valId);
        $validStatus = in_array($validation['status'] ?? '', ['VALID','VALIDATED'], true);
        $sameTran = hash_equals((string)$order['id'], (string)($validation['tran_id'] ?? ''));
        $sameAmount = abs((float)$order['amount_bdt'] - (float)($validation['amount'] ?? 0)) < 0.01;
        $sameCurrency = strtoupper((string)($validation['currency_type'] ?? 'BDT')) === 'BDT';
        if (!$validStatus || !$sameTran || !$sameAmount || !$sameCurrency || (int)($validation['risk_level'] ?? 0) === 1) out(['error'=>'Payment could not be verified; order remains unpaid'], 422);
        $pdo->prepare("UPDATE orders SET payment_status='paid', status='confirmed', updated_at=CURRENT_TIMESTAMP WHERE id=?")->execute([$tranId]);
        if ($action === 'sslcommerz_ipn') out(['ok'=>true]);
        out(['ok'=>true,'status'=>'paid','order_id'=>$tranId,'message'=>'Payment verified. You may return to the store.']);
    }

    if ($action === 'admin_orders' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        needAdmin();
        $st = $pdo->query('SELECT id,listing_id,buyer_id,quantity,buyer_name,buyer_phone,buyer_email,address,status,amount_bdt,payment_status,shipping_status,created_at FROM orders ORDER BY created_at DESC LIMIT 300');
        out(['orders'=>$st->fetchAll()]);
    }
    if ($action === 'admin_order_status') {
        requirePost(); needAdmin(); $b = body(); csrf();
        $id = cleanString($b['order_id'] ?? '', 100); $status = cleanString($b['status'] ?? '', 30);
        if (!in_array($status, ['pending','confirmed','processing','shipped','delivered','cancelled'], true)) out(['error'=>'Invalid order status'], 422);
        $st = $pdo->prepare('UPDATE orders SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'); $st->execute([$status,$id]);
        if (!$st->rowCount()) out(['error'=>'Order not found or unchanged'], 404);
        out(['ok'=>true]);
    }
    out(['error'=>'Unknown action'], 404);
} catch (Throwable $e) {
    error_log('[HaatBazar API] '.$e->getMessage());
    out(['error'=>'Server error. Check hosting error log.'], 500);
}
