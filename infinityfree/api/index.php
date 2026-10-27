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
    $pdo->exec("CREATE TABLE IF NOT EXISTS courier_shipments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(120) NOT NULL UNIQUE,
        provider VARCHAR(40) NOT NULL DEFAULT 'steadfast',
        consignment_id VARCHAR(100) NULL,
        tracking_code VARCHAR(150) NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'requested',
        response_json LONGTEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_courier_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS order_status_audit (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(120) NOT NULL,
        admin_user_id BIGINT UNSIGNED NOT NULL,
        old_status VARCHAR(40) NOT NULL,
        new_status VARCHAR(40) NOT NULL,
        old_shipping_status VARCHAR(40) NOT NULL,
        new_shipping_status VARCHAR(40) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order_audit_order(order_id,created_at),
        CONSTRAINT fk_order_audit_order_runtime FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
        CONSTRAINT fk_order_audit_admin_runtime FOREIGN KEY(admin_user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    if ($action === 'csrf') out(['csrf' => $_SESSION['csrf']]);

    if ($action === 'upload_product_image' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        requirePost(); $u = needUser();
        if (!in_array(($u['role'] ?? ''), ['seller','admin'], true)) out(['error'=>'Seller account required'], 403);
        csrf();
        if (!isset($_FILES['image']) || !is_array($_FILES['image'])) out(['error'=>'Image file is required'], 422);
        $file = $_FILES['image'];
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) out(['error'=>'Image upload failed'], 422);
        if ((int)($file['size'] ?? 0) < 1 || (int)$file['size'] > 4 * 1024 * 1024 || !is_uploaded_file($file['tmp_name'])) out(['error'=>'Image must be smaller than 4 MB'], 422);
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        $extensions = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
        if (!isset($extensions[$mime]) || @getimagesize($file['tmp_name']) === false) out(['error'=>'Only valid JPG, PNG or WebP images are accepted'], 422);
        $folder = dirname(__DIR__) . '/uploads/products';
        if (!is_dir($folder) && !mkdir($folder, 0755, true) && !is_dir($folder)) out(['error'=>'Image storage is unavailable'], 503);
        $name = bin2hex(random_bytes(20)) . '.' . $extensions[$mime];
        if (!move_uploaded_file($file['tmp_name'], $folder . '/' . $name)) out(['error'=>'Could not store image'], 503);
        out(['url'=>'/uploads/products/' . $name], 201);
    }

    if ($action === 'update_listing_images' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        requirePost(); $u = needUser();
        if (!in_array(($u['role'] ?? ''), ['seller','admin'], true)) out(['error'=>'Seller account required'], 403);
        $b = body(); csrf(); $id = cleanString($b['id'] ?? '', 80); $images = $b['images'] ?? null;
        if ($id === '' || !is_array($images) || count($images) > 5) out(['error'=>'Invalid listing images'], 422);
        foreach ($images as $image) if (!is_string($image) || !preg_match('~^/uploads/products/[a-f0-9]{40}\\.(?:jpg|png|webp)$~', $image)) out(['error'=>'Invalid image URL'], 422);
        $find = $pdo->prepare('SELECT user_id FROM listings WHERE id=? LIMIT 1'); $find->execute([$id]); $owner = $find->fetch();
        if (!$owner) out(['error'=>'Listing not found'], 404);
        if (($u['role'] ?? '') !== 'admin' && (int)$owner['user_id'] !== (int)$u['id']) out(['error'=>'You cannot edit this listing'], 403);
        $pdo->prepare('UPDATE listings SET images=? WHERE id=?')->execute([json_encode(array_values($images), JSON_UNESCAPED_SLASHES), $id]);
        out(['ok'=>true,'id'=>$id,'images'=>array_values($images)]);
    }

    if ($action === 'create_listing' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        requirePost();
        $u = needUser();
        if (!in_array(($u['role'] ?? ''), ['seller','admin'], true)) out(['error'=>'Seller account required'], 403);
        $b = body(); csrf();
        $title = cleanString($b['title'] ?? '', 120);
        $category = cleanString($b['category'] ?? '', 80);
        $subcategory = cleanString($b['subcategory'] ?? '', 100);
        $district = cleanString($b['district'] ?? '', 100);
        $upazila = cleanString($b['upazila'] ?? '', 100);
        $unit = cleanString($b['unit'] ?? 'piece', 20);
        $sellerName = cleanString($b['sellerName'] ?? ($u['name'] ?? ''), 120);
        $businessName = cleanString($b['businessName'] ?? '', 180);
        $description = cleanString($b['description'] ?? '', 2000);
        $phone = preg_replace('/[\s-]/', '', cleanString($b['phone'] ?? '', 30));
        $price = filter_var($b['price'] ?? null, FILTER_VALIDATE_FLOAT);
        $quantity = filter_var($b['quantity'] ?? null, FILTER_VALIDATE_FLOAT);
        $minimum = 1; // HaatBazar policy: every listing can be ordered from one unit
        $saleType = cleanString($b['saleType'] ?? 'both', 20);
        $images = $b['images'] ?? [];
        $allowedCategories = ['electronics','fashion','home-kitchen','grocery','agriculture','livestock-poultry-fish','machinery','vehicles','construction','beauty','books-office','services-rentals','bogra-doi-mishti'];
        $allowedUnits = ['kg','maund','ton','piece','dozen','liter','bag','hali','box','set','hour','day','month'];
        if (strlen($title) < 3 || $category === '' || !in_array($category, $allowedCategories, true) || $subcategory === '' || $district === '' ||
            $price === false || $price < 0 || $price > 100000000000 || $quantity === false || $quantity < 0 || $quantity > 100000000 ||
            $minimum === false || $minimum < 1 || !in_array($unit, $allowedUnits, true) ||
            !in_array($saleType, ['retail','wholesale','both'], true) || strlen($description) < 10 ||
            !preg_match('/^(?:\\+?88)?01[3-9]\d{8}$/', $phone) || !is_array($images) || count($images) > 5) {
            out(['error'=>'Invalid listing details'], 422);
        }
        foreach ($images as $image) {
            if (!is_string($image) || strlen($image) > 500 || !preg_match('~^/uploads/products/[a-f0-9]{40}\\.(?:jpg|png|webp)$~', $image)) {
                out(['error'=>'Product images are not yet supported by this hosting adapter; submit without images for now'], 422);
            }
        }
        $id = bin2hex(random_bytes(16));
        $st = $pdo->prepare('INSERT INTO listings(id,user_id,title,category,subcategory,district,upazila,price,unit,quantity,negotiable,sellerName,businessName,description,images,phone,saleType,minOrderQuantity,deliveryAvailable,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,\'active\')');
        $st->execute([$id,(int)$u['id'],$title,$category,$subcategory,$district,$upazila,(float)$price,$unit,(float)$quantity,!empty($b['negotiable'])?1:0,$sellerName,$businessName,$description,json_encode(array_values($images), JSON_UNESCAPED_SLASHES),$phone,$saleType,(float)$minimum,!empty($b['deliveryAvailable'])?1:0]);
        out(['id'=>$id,'title'=>$title,'category'=>$category,'subcategory'=>$subcategory,'district'=>$district,'upazila'=>$upazila,'price'=>(float)$price,'unit'=>$unit,'quantity'=>(float)$quantity,'negotiable'=>!empty($b['negotiable']),'sellerName'=>$sellerName,'businessName'=>$businessName,'description'=>$description,'images'=>array_values($images),'saleType'=>$saleType,'minOrderQuantity'=>(float)$minimum,'deliveryAvailable'=>!empty($b['deliveryAvailable']),'sellerVerified'=>false], 201);
    }

    if ($action === 'listing' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $id = cleanString($_GET['id'] ?? '', 80);
        $st = $pdo->prepare("SELECT id,title,category,subcategory,district,upazila,price,unit,quantity,negotiable,description,images,sellerName,businessName,saleType,minOrderQuantity,deliveryAvailable,created_at FROM listings WHERE id=? AND status='active' LIMIT 1");
        $st->execute([$id]); $item = $st->fetch();
        if (!$item) out(['error'=>'not_found'], 404);
        $item['images'] = json_decode((string)($item['images'] ?? '[]'), true) ?: [];
        $item['price'] = (float)$item['price']; $item['quantity'] = (float)$item['quantity'];
        $item['minOrderQuantity'] = 1;
        $item['negotiable'] = (bool)$item['negotiable']; $item['deliveryAvailable'] = (bool)$item['deliveryAvailable'];
        $item['sellerVerified'] = false;
        out($item);
    }

    if ($action === 'orders' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        requirePost();
        $b = body(); csrf();
        $listingId = cleanString($b['listingId'] ?? '', 80);
        $quantity = filter_var($b['quantity'] ?? null, FILTER_VALIDATE_FLOAT);
        $buyerName = cleanString($b['buyerName'] ?? '', 100);
        $buyerPhone = preg_replace('/[\s-]/', '', cleanString($b['buyerPhone'] ?? '', 30));
        $buyerEmail = strtolower(cleanString($b['buyerEmail'] ?? '', 190));
        $address = cleanString($b['address'] ?? '', 500);
        if ($listingId === '' || $quantity === false || $quantity < 1 || $buyerName === '' ||
            !preg_match('/^(?:\\+?88)?01[3-9]\d{8}$/', $buyerPhone) ||
            !filter_var($buyerEmail, FILTER_VALIDATE_EMAIL) || $address === '' || strlen($address) < 5) {
            out(['error'=>'Invalid order details'], 422);
        }
        $pdo->beginTransaction();
        try {
            $find = $pdo->prepare("SELECT id,price,quantity,minOrderQuantity FROM listings WHERE id=? AND status='active' FOR UPDATE");
            $find->execute([$listingId]); $listing = $find->fetch();
            if (!$listing) { $pdo->rollBack(); out(['error'=>'listing_unavailable'], 404); }
            if ($quantity < 1) { $pdo->rollBack(); out(['error'=>'below_minimum_order'], 422); }
            if ($quantity > (float)$listing['quantity']) { $pdo->rollBack(); out(['error'=>'quantity_unavailable'], 422); }
            $id = 'HB'.gmdate('ymd').strtoupper(bin2hex(random_bytes(5))).'-'.substr(hash('sha256', $listingId),0,6);
            $amount = (float)$listing['price'] * (float)$quantity;
            $u = currentUser();
            $st = $pdo->prepare("INSERT INTO orders(id,listing_id,buyer_id,quantity,buyer_name,buyer_phone,buyer_email,address,amount_bdt,status,payment_status,shipping_status) VALUES(?,?,?,?,?,?,?,?,?,'pending','unpaid','not_requested')");
            $st->execute([$id,$listingId,$u ? (int)$u['id'] : null,(float)$quantity,$buyerName,$buyerPhone,$buyerEmail,$address,$amount]);
            $pdo->commit();
            out(['id'=>$id,'status'=>'pending'], 201);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    }

    if ($action === 'my_orders' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $u=needUser();
        $st=$pdo->prepare('SELECT o.id,o.listing_id,l.title listingTitle,o.quantity,o.amount_bdt,o.status,o.payment_status,o.shipping_status,o.created_at,o.updated_at,cs.consignment_id,cs.tracking_code FROM orders o JOIN listings l ON l.id=o.listing_id LEFT JOIN courier_shipments cs ON cs.order_id=o.id WHERE o.buyer_id=? ORDER BY o.created_at DESC LIMIT 100');
        $st->execute([(int)$u['id']]); out(['items'=>$st->fetchAll()]);
    }
    if ($action === 'seller_orders' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $u = needUser();
        if (!in_array(($u['role'] ?? ''), ['seller','admin'], true)) out(['error'=>'Seller account required'], 403);
        $st = $pdo->prepare('SELECT o.*,l.title listingTitle FROM orders o JOIN listings l ON l.id=o.listing_id WHERE l.user_id=? ORDER BY o.created_at DESC LIMIT 200');
        $st->execute([(int)$u['id']]);
        out(['items'=>$st->fetchAll()]);
    }

    if ($action === 'products' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $q = cleanString($_GET['search'] ?? ($_GET['q'] ?? ''), 100);
        $category = cleanString($_GET['category'] ?? '', 80);
        $subcategory = cleanString($_GET['subcategory'] ?? '', 100);
        $district = cleanString($_GET['district'] ?? '', 100);
        $saleType = cleanString($_GET['saleType'] ?? '', 20);
        $page = max(1, min(10000, (int)($_GET['page'] ?? 1)));
        $limit = max(1, min(50, (int)($_GET['limit'] ?? 20)));
        $where = ["status='active'"]; $params = [];
        if ($q !== '') { $where[] = '(title LIKE ? OR description LIKE ? OR businessName LIKE ? OR sellerName LIKE ?)'; $term = "%$q%"; array_push($params,$term,$term,$term,$term); }
        if ($category !== '') { $where[] = 'category=?'; $params[] = $category; }
        if ($subcategory !== '') { $where[] = 'subcategory=?'; $params[] = $subcategory; }
        if ($district !== '') { $where[] = 'district=?'; $params[] = $district; }
        if (in_array($saleType, ['retail','wholesale','both'], true)) { $where[] = '(saleType=? OR saleType=?)'; $params[] = $saleType; $params[] = 'both'; }
        $whereSql = implode(' AND ', $where);
        $sort = cleanString($_GET['sort'] ?? 'newest', 20);
        $orderBy = $sort === 'price_asc' ? 'price ASC' : ($sort === 'price_desc' ? 'price DESC' : 'created_at DESC');
        $count = $pdo->prepare("SELECT COUNT(*) FROM listings WHERE $whereSql"); $count->execute($params); $total = (int)$count->fetchColumn();
        $sql = "SELECT id,title,category,subcategory,district,upazila,price,unit,quantity,description,images,sellerName,businessName,saleType,minOrderQuantity,deliveryAvailable,created_at FROM listings WHERE $whereSql ORDER BY $orderBy LIMIT $limit OFFSET ".(($page-1)*$limit);
        $st = $pdo->prepare($sql); $st->execute($params);
        $items = $st->fetchAll();
        foreach ($items as &$item) { $item['images'] = json_decode((string)($item['images'] ?? '[]'), true) ?: []; $item['price'] = (float)$item['price']; $item['quantity'] = (float)$item['quantity']; $item['minOrderQuantity'] = 1; $item['negotiable'] = (bool)$item['negotiable']; $item['deliveryAvailable'] = (bool)$item['deliveryAvailable']; $item['sellerVerified'] = false; }
        unset($item);
        out(['products'=>$items,'items'=>$items,'total'=>$total,'page'=>$page,'limit'=>$limit]);
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
        if ($method === 'sslcommerz' && (empty($config['enable_online_payments']) || empty($config['sslcommerz_sandbox']))) out(['error'=>'Online payments are disabled until sandbox end-to-end tests are approved'], 503);
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

    if ($action === 'admin_product_create') {
        requirePost(); $admin=needAdmin(); $b=body(); csrf();
        $title=cleanString($b['title']??'',120); $category=cleanString($b['category']??'',80); $subcategory=cleanString($b['subcategory']??'',100);
        $district=cleanString($b['district']??'',100); $upazila=cleanString($b['upazila']??'',100); $unit=cleanString($b['unit']??'piece',20);
        $price=filter_var($b['price']??null,FILTER_VALIDATE_FLOAT); $quantity=filter_var($b['quantity']??null,FILTER_VALIDATE_FLOAT);
        $description=cleanString($b['description']??'',2000); $phone=preg_replace('/[\\s-]/','',cleanString($b['phone']??'',30));
        $allowedCategories=['electronics','fashion','home-kitchen','grocery','agriculture','livestock-poultry-fish','machinery','vehicles','construction','beauty','books-office','services-rentals','bogra-doi-mishti'];
        $allowedUnits=['kg','maund','ton','piece','dozen','liter','bag','hali','box','set','hour','day','month'];
        if(strlen($title)<3 || $category==='' || !in_array($category,$allowedCategories,true) || $subcategory==='' || $district==='' || $price===false || $price<0 || $price>100000000000 || $quantity===false || $quantity<0 || $quantity>100000000 || !in_array($unit,$allowedUnits,true) || strlen($description)<10 || !preg_match('/^(?:\\+?88)?01[3-9]\\d{8}$/',$phone)) out(['error'=>'Invalid product fields; check category, district, phone, price, quantity and description'],422);
        $id=bin2hex(random_bytes(16));
        $st=$pdo->prepare("INSERT INTO listings(id,user_id,title,category,subcategory,district,upazila,price,unit,quantity,negotiable,sellerName,businessName,description,images,phone,saleType,minOrderQuantity,deliveryAvailable,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,'active')");
        $st->execute([$id,(int)$admin['id'],$title,$category,$subcategory,$district,$upazila,(float)$price,$unit,(float)$quantity,!empty($b['negotiable'])?1:0,cleanString($b['sellerName']??$admin['name']??'HaatBazar Admin',120),cleanString($b['businessName']??'',180),$description,'[]',$phone,in_array(($b['saleType']??'both'),['retail','wholesale','both'],true)?($b['saleType']??'both'):'both',!empty($b['deliveryAvailable'])?1:0]);
        out(['ok'=>true,'id'=>$id,'title'=>$title,'price'=>(float)$price,'quantity'=>(float)$quantity,'status'=>'active'],201);
    }
    if ($action === 'admin_products' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        needAdmin();
        $page = max(1, min(10000, (int)($_GET['page'] ?? 1)));
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 100)));
        $status = cleanString($_GET['status'] ?? '', 20);
        $where = ''; $params = [];
        if ($status !== '') {
            if (!in_array($status, ['active','paused','sold','removed'], true)) out(['error'=>'Invalid product status filter'], 422);
            $where = ' WHERE l.status=?'; $params[] = $status;
        }
        $count = $pdo->prepare('SELECT COUNT(*) FROM listings l'.$where); $count->execute($params); $total = (int)$count->fetchColumn();
        $st = $pdo->prepare('SELECT l.id,l.title,l.category,l.subcategory,l.district,l.upazila,l.price,l.unit,l.quantity,l.negotiable,l.sellerName,l.businessName,l.description,l.images,l.phone,l.saleType,l.minOrderQuantity,l.deliveryAvailable,l.status,l.created_at,l.updated_at,u.email sellerEmail FROM listings l LEFT JOIN users u ON u.id=l.user_id'.$where.' ORDER BY l.created_at DESC LIMIT '.$limit.' OFFSET '.(($page-1)*$limit));
        $st->execute($params); $items = $st->fetchAll();
        foreach ($items as &$item) { $item['images'] = json_decode((string)($item['images'] ?? '[]'), true) ?: []; $item['price']=(float)$item['price']; $item['quantity']=(float)$item['quantity']; $item['minOrderQuantity']=1; $item['negotiable']=(bool)$item['negotiable']; $item['deliveryAvailable']=(bool)$item['deliveryAvailable']; }
        unset($item);
        out(['items'=>$items,'total'=>$total,'page'=>$page,'limit'=>$limit]);
    }
    if ($action === 'admin_product_update') {
        requirePost(); needAdmin(); $b=body(); csrf();
        $id=cleanString($b['id']??'',80); $title=cleanString($b['title']??'',120);
        $price=filter_var($b['price']??null,FILTER_VALIDATE_FLOAT); $quantity=filter_var($b['quantity']??null,FILTER_VALIDATE_FLOAT);
        $status=cleanString($b['status']??'',20);
        if ($id==='' || strlen($title)<3 || $price===false || $price<0 || $price>100000000000 || $quantity===false || $quantity<0 || $quantity>100000000 || !in_array($status,['active','paused','sold','removed'],true)) out(['error'=>'Invalid product update fields'],422);
        $st=$pdo->prepare('UPDATE listings SET title=?,price=?,quantity=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?');
        $st->execute([$title,(float)$price,(float)$quantity,$status,$id]);
        if ($st->rowCount()===0) { $find=$pdo->prepare('SELECT id FROM listings WHERE id=?'); $find->execute([$id]); if (!$find->fetch()) out(['error'=>'Product not found'],404); }
        out(['ok'=>true,'id'=>$id,'title'=>$title,'price'=>(float)$price,'quantity'=>(float)$quantity,'status'=>$status]);
    }
    if ($action === 'admin_product_delete') {
        requirePost(); needAdmin(); $b=body(); csrf(); $id=cleanString($b['id']??'',80);
        if ($id==='') out(['error'=>'Product ID is required'],422);
        $st=$pdo->prepare("UPDATE listings SET status='removed',updated_at=CURRENT_TIMESTAMP WHERE id=?"); $st->execute([$id]);
        if ($st->rowCount()===0) { $find=$pdo->prepare('SELECT id,status FROM listings WHERE id=?'); $find->execute([$id]); if (!$find->fetch()) out(['error'=>'Product not found'],404); }
        out(['ok'=>true,'id'=>$id,'status'=>'removed']);
    }
    if ($action === 'admin_orders' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        needAdmin(); $page = max(1, min(10000, (int)($_GET['page'] ?? 1))); $limit = max(1, min(100, (int)($_GET['limit'] ?? 50)));
        $status = cleanString($_GET['status'] ?? '', 30); $where = ''; $params = [];
        if ($status !== '') { if (!in_array($status, ['pending','confirmed','processing','shipped','delivered','cancelled'], true)) out(['error'=>'Invalid status filter'], 422); $where = ' WHERE o.status=?'; $params[] = $status; }
        $count = $pdo->prepare('SELECT COUNT(*) FROM orders o'.$where); $count->execute($params); $total = (int)$count->fetchColumn();
        $st = $pdo->prepare('SELECT o.*,l.title listingTitle,cs.consignment_id,cs.tracking_code FROM orders o JOIN listings l ON l.id=o.listing_id LEFT JOIN courier_shipments cs ON cs.order_id=o.id'.$where.' ORDER BY o.created_at DESC LIMIT '.$limit.' OFFSET '.(($page-1)*$limit));
        $st->execute($params); $items = $st->fetchAll(); out(['orders'=>$items,'items'=>$items,'total'=>$total,'page'=>$page,'limit'=>$limit]);
    }
    if ($action === 'admin_order_status') {
        requirePost(); $admin = needAdmin(); $b = body(); csrf(); $id = cleanString($b['order_id'] ?? '', 100);
        $status = cleanString($b['status'] ?? '', 30); $shipping = cleanString($b['shipping_status'] ?? '', 40);
        if ($id === '') out(['error'=>'Order ID is required'], 422);
        if ($status !== '' && !in_array($status, ['pending','confirmed','processing','shipped','delivered','cancelled'], true)) out(['error'=>'Invalid order status'], 422);
        if ($shipping !== '' && !in_array($shipping, ['not_requested','requested','booked','picked_up','in_transit','delivered','returned','failed','cancelled'], true)) out(['error'=>'Invalid shipping status'], 422);
        if ($status === '' && $shipping === '') out(['error'=>'No order changes supplied'], 422);
        $find = $pdo->prepare('SELECT status,shipping_status FROM orders WHERE id=? LIMIT 1'); $find->execute([$id]); $before = $find->fetch();
        if (!$before) out(['error'=>'Order not found'], 404);
        $newStatus = $status !== '' ? $status : $before['status']; $newShipping = $shipping !== '' ? $shipping : $before['shipping_status'];
        $sets = []; $params = [];
        if ($status !== '') { $sets[] = 'status=?'; $params[] = $status; }
        if ($shipping !== '') { $sets[] = 'shipping_status=?'; $params[] = $shipping; }
        $params[] = $id; $pdo->prepare('UPDATE orders SET '.implode(',',$sets).',updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute($params);
        $log = $pdo->prepare('INSERT INTO order_status_audit(order_id,admin_user_id,old_status,new_status,old_shipping_status,new_shipping_status) VALUES(?,?,?,?,?,?)');
        $log->execute([$id,(int)$admin['id'],$before['status'],$newStatus,$before['shipping_status'],$newShipping]);
        out(['ok'=>true,'order_id'=>$id,'status'=>$newStatus,'shipping_status'=>$newShipping]);
    }
    if ($action === 'admin_ship_order') {
        requirePost(); needAdmin(); $b=body(); csrf();
        $id=cleanString($b['order_id']??'',100);
        if ($id==='') out(['error'=>'Order ID is required'],422);
        $apiKey=trim((string)($config['steadfast_api_key']??'')); $secret=trim((string)($config['steadfast_secret_key']??''));
        $base=rtrim((string)($config['steadfast_base_url']??'https://portal.packzy.com/api/v1'),'/');
        if ($apiKey==='' || $secret==='') out(['error'=>'Steadfast API credentials are not configured in private hosting config'],503);
        if (!preg_match('~^https://[a-zA-Z0-9.-]+(?::[0-9]+)?(?:/[^?#]*)?$~',$base)) out(['error'=>'Invalid Steadfast API base URL'],503);
        $st=$pdo->prepare('SELECT o.*,l.title listingTitle,cs.consignment_id,cs.tracking_code FROM orders o JOIN listings l ON l.id=o.listing_id LEFT JOIN courier_shipments cs ON cs.order_id=o.id WHERE o.id=? LIMIT 1');
        $st->execute([$id]); $order=$st->fetch();
        if (!$order) out(['error'=>'Order not found'],404);
        if (($order['status']??'')==='cancelled') out(['error'=>'Cancelled orders cannot be shipped'],422);
        $existing=$pdo->prepare('SELECT status,consignment_id,tracking_code FROM courier_shipments WHERE order_id=? LIMIT 1'); $existing->execute([$id]); $shipment=$existing->fetch();
        if ($shipment) out(['error'=>'A courier booking attempt already exists for this order. Check the Steadfast merchant panel before retrying to avoid duplicate parcels.','consignment_id'=>$shipment['consignment_id'],'tracking_code'=>$shipment['tracking_code'],'booking_status'=>$shipment['status']],409);
        // Reserve this order before calling the provider to block double-clicks/concurrent duplicate bookings.
        $reserve=$pdo->prepare("INSERT INTO courier_shipments(order_id,provider,status,response_json) VALUES(?,'steadfast','requested','{}')");
        try { $reserve->execute([$id]); } catch (PDOException $e) { out(['error'=>'A courier booking attempt already exists for this order. Check the Steadfast merchant panel before retrying.'],409); }
        $cod=($order['payment_status']??'')==='paid' ? 0 : (float)$order['amount_bdt'];
        $payload=['invoice'=>(string)$order['id'],'recipient_name'=>(string)$order['buyer_name'],'recipient_phone'=>(string)$order['buyer_phone'],'recipient_address'=>(string)$order['address'],'cod_amount'=>$cod,'delivery_type'=>0,'note'=>'HaatBazar order '.(string)$order['id'].' - '.(string)$order['listingTitle']];
        $opts=['http'=>['method'=>'POST','header'=>"Content-Type: application/json\r\nApi-Key: ".$apiKey."\r\nSecret-Key: ".$secret."\r\nAccept: application/json\r\n",'content'=>json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),'timeout'=>20,'ignore_errors'=>true]];
        $raw=@file_get_contents($base.'/create_order',false,stream_context_create($opts));
        $response=is_string($raw)?json_decode($raw,true):null;
        if (!is_array($response)) { $pdo->prepare("UPDATE courier_shipments SET status='unknown',response_json=? WHERE order_id=?")->execute([json_encode(['error'=>'invalid_json_or_network_timeout']),$id]); out(['error'=>'Steadfast response could not be confirmed. Check the merchant panel before retrying; the booking was not automatically repeated.'],502); }
        $httpStatus=0; foreach (($http_response_header??[]) as $header) if (preg_match('~^HTTP/\S+\s+(\d{3})~',$header,$m)) $httpStatus=(int)$m[1];
        $consignment=(string)($response['consignment']['consignment_id']??$response['consignment_id']??'');
        $tracking=(string)($response['consignment']['tracking_code']??$response['tracking_code']??'');
        $apiStatus=(int)($response['status']??0);
        if ($httpStatus<200 || $httpStatus>=300 || ($apiStatus!==0 && $apiStatus!==200) || (!$consignment && !$tracking)) {
            error_log('[HaatBazar Steadfast] '.json_encode(['http'=>$httpStatus,'response'=>$response],JSON_UNESCAPED_SLASHES));
            $pdo->prepare("UPDATE courier_shipments SET status='unknown',response_json=? WHERE order_id=?")->execute([json_encode($response,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$id]);
            out(['error'=>'Steadfast booking could not be confirmed. Check the merchant panel before retrying to avoid duplicate parcels.'],502);
        }
        $save=$pdo->prepare("UPDATE courier_shipments SET consignment_id=?,tracking_code=?,status='booked',response_json=? WHERE order_id=?");
        $save->execute([$consignment?:null,$tracking?:null,json_encode($response,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$id]);
        $pdo->prepare("UPDATE orders SET shipping_status='booked',updated_at=CURRENT_TIMESTAMP WHERE id=?")->execute([$id]);
        out(['ok'=>true,'order_id'=>$id,'consignment_id'=>$consignment,'tracking_code'=>$tracking,'shipping_status'=>'booked']);
    }
    out(['error'=>'Unknown action'], 404);
} catch (Throwable $e) {
    error_log('[HaatBazar API] '.$e->getMessage());
    out(['error'=>'Server error. Check hosting error log.'], 500);
}
