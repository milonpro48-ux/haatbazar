<?php
declare(strict_types=1);

/**
 * HaatBazar admin panel for the existing InfinityFree/MySQL schema.
 * Uses the same PHP session and users/listings/orders tables as api/index.php.
 */
$configFile = dirname(__DIR__) . '/config.php';
if (!is_file($configFile)) {
    http_response_code(503);
    exit('Server setup incomplete. Configure infinityfree/config.php first.');
}
$config = require $configFile;
ini_set('session.use_strict_mode', '1');
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'httponly' => true,
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'samesite' => 'Lax',
        'path' => '/',
    ]);
    session_start();
}
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function h(mixed $value): string {
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
function adminDb(array $config): PDO {
    static $pdo = null;
    if (!$pdo) $pdo = new PDO($config['db_dsn'], $config['db_user'], $config['db_password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}
function adminCsrf(): string {
    if (empty($_SESSION['admin_csrf'])) $_SESSION['admin_csrf'] = bin2hex(random_bytes(32));
    return (string)$_SESSION['admin_csrf'];
}
function adminCsrfField(): string {
    return '<input type="hidden" name="csrf" value="' . h(adminCsrf()) . '">';
}
function adminRequireCsrf(): void {
    $token = $_POST['csrf'] ?? '';
    if (!is_string($token) || !hash_equals($_SESSION['admin_csrf'] ?? '', $token)) {
        http_response_code(419);
        exit('নিরাপত্তা যাচাই ব্যর্থ। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।');
    }
}
function adminFlash(string $message): never {
    $_SESSION['admin_flash'] = $message;
    header('Location: /admin/', true, 303);
    exit;
}
function adminUpload(array $file): string {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return '';
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) throw new RuntimeException('ছবি আপলোড ব্যর্থ হয়েছে।');
    if (($file['size'] ?? 0) > 2 * 1024 * 1024) throw new RuntimeException('ছবি সর্বোচ্চ ২ MB হতে পারবে।');
    $info = @getimagesize($file['tmp_name'] ?? '');
    $extension = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$info['mime'] ?? ''] ?? '';
    if ($extension === '') throw new RuntimeException('শুধু JPG, PNG বা WEBP ছবি দিন।');
    $dir = dirname(__DIR__) . '/uploads';
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) throw new RuntimeException('Upload folder তৈরি করা যায়নি।');
    $name = bin2hex(random_bytes(16)) . '.' . $extension;
    if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) throw new RuntimeException('ছবি সংরক্ষণ করা যায়নি।');
    return '/uploads/' . $name;
}

$user = $_SESSION['user'] ?? null;
if (!is_array($user)) {
    header('Location: /api/login?returnTo=%2Fadmin%2F', true, 302);
    exit;
}
if (($user['role'] ?? '') !== 'admin') {
    http_response_code(403);
    exit('এই প্যানেলে প্রবেশের অনুমতি নেই।');
}
$pdo = adminDb($config);
$page = (string)($_GET['page'] ?? 'dashboard');
$allowedPages = ['dashboard', 'products', 'orders', 'users', 'sellers', 'reports', 'invoice'];
if (!in_array($page, $allowedPages, true)) $page = 'dashboard';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    adminRequireCsrf();
    $action = (string)($_POST['action'] ?? '');
    try {
        if ($action === 'save_product') {
            $id = trim((string)($_POST['id'] ?? ''));
            $title = trim((string)($_POST['title'] ?? ''));
            $category = trim((string)($_POST['category'] ?? ''));
            $subcategory = trim((string)($_POST['subcategory'] ?? ''));
            $district = trim((string)($_POST['district'] ?? ''));
            $price = filter_var($_POST['price'] ?? null, FILTER_VALIDATE_FLOAT);
            $quantity = filter_var($_POST['quantity'] ?? null, FILTER_VALIDATE_FLOAT);
            $unit = trim((string)($_POST['unit'] ?? 'piece'));
            $description = trim((string)($_POST['description'] ?? ''));
            $status = in_array($_POST['status'] ?? '', ['active','paused','sold','removed'], true) ? (string)$_POST['status'] : 'active';
            if ($title === '' || $category === '' || $district === '' || $price === false || $price < 0 || $quantity === false || $quantity < 0 || $unit === '') {
                throw new RuntimeException('পণ্যের নাম, ক্যাটাগরি, জেলা, সঠিক দাম ও মজুদ দিন।');
            }
            if (strlen($title) > 200 || strlen($category) > 100 || strlen($subcategory) > 100 || strlen($district) > 100 || strlen($unit) > 40) {
                throw new RuntimeException('এক বা একাধিক ঘরের লেখা অনুমোদিত সীমার চেয়ে বড়।');
            }
            $existing = null;
            if ($id !== '') {
                $st = $pdo->prepare('SELECT id, images FROM listings WHERE id=? LIMIT 1');
                $st->execute([$id]);
                $existing = $st->fetch() ?: null;
                if (!$existing) throw new RuntimeException('পণ্যটি পাওয়া যায়নি।');
            } else {
                $id = 'admin-' . bin2hex(random_bytes(12));
            }
            $images = json_decode((string)($existing['images'] ?? '[]'), true);
            if (!is_array($images)) $images = [];
            $uploaded = adminUpload($_FILES['image'] ?? []);
            if ($uploaded !== '') array_unshift($images, $uploaded);
            $images = array_values(array_filter($images, static fn($v) => is_string($v) && $v !== ''));
            $jsonImages = json_encode($images, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($existing) {
                $st = $pdo->prepare('UPDATE listings SET title=?,category=?,subcategory=?,district=?,price=?,unit=?,quantity=?,description=?,images=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?');
                $st->execute([$title,$category,$subcategory,$district,$price,$unit,$quantity,$description,$jsonImages,$status,$id]);
            } else {
                $st = $pdo->prepare("INSERT INTO listings(id,user_id,title,category,subcategory,district,upazila,price,unit,quantity,negotiable,sellerName,businessName,description,images,phone,saleType,minOrderQuantity,deliveryAvailable,status) VALUES(?,NULL,?,?,?,?, '',?,?,?,0,'HaatBazar Admin','HaatBazar',?,?, '', 'both',1,0,?)");
                $st->execute([$id,$title,$category,$subcategory,$district,$price,$unit,$quantity,$description,$jsonImages,$status]);
            }
            adminFlash('পণ্যের তথ্য সংরক্ষণ হয়েছে।');
        }
        if ($action === 'update_order') {
            $id = trim((string)($_POST['id'] ?? ''));
            $status = (string)($_POST['status'] ?? '');
            $payment = (string)($_POST['payment_status'] ?? '');
            $shipping = trim((string)($_POST['shipping_status'] ?? 'not_requested'));
            if (!in_array($status, ['pending','confirmed','processing','shipped','delivered','cancelled'], true)) throw new RuntimeException('অর্ডার স্ট্যাটাস সঠিক নয়।');
            if (!in_array($payment, ['unpaid','initiated','paid','failed','cancelled'], true)) throw new RuntimeException('পেমেন্ট স্ট্যাটাস সঠিক নয়।');
            if (!in_array($shipping, ['not_requested','pending','booked','picked_up','in_transit','delivered','failed','cancelled'], true)) throw new RuntimeException('ডেলিভারি স্ট্যাটাস সঠিক নয়।');
            $st = $pdo->prepare('UPDATE orders SET status=?,payment_status=?,shipping_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?');
            $st->execute([$status,$payment,$shipping,$id]);
            if ($st->rowCount() < 1) {
                $check = $pdo->prepare('SELECT id FROM orders WHERE id=?'); $check->execute([$id]);
                if (!$check->fetch()) throw new RuntimeException('অর্ডার পাওয়া যায়নি।');
            }
            adminFlash('অর্ডারের তথ্য আপডেট হয়েছে।');
        }
        if ($action === 'review_seller') {
            $id = filter_var($_POST['id'] ?? null, FILTER_VALIDATE_INT);
            $status = (string)($_POST['status'] ?? '');
            $note = trim((string)($_POST['admin_note'] ?? ''));
            if (!$id || !in_array($status, ['pending','approved','rejected'], true)) throw new RuntimeException('বিক্রেতা যাচাইয়ের তথ্য সঠিক নয়।');
            $st = $pdo->prepare('UPDATE seller_verifications SET status=?,admin_note=?,reviewed_at=CASE WHEN ?="pending" THEN NULL ELSE CURRENT_TIMESTAMP END WHERE id=?');
            $st->execute([$status,substr($note,0,500),$status,$id]);
            adminFlash('বিক্রেতার যাচাইয়ের অবস্থা সংরক্ষণ হয়েছে।');
        }
    } catch (Throwable $e) {
        $error = $e instanceof RuntimeException ? $e->getMessage() : 'কাজটি সম্পন্ন হয়নি। ডেটাবেস সেটআপ ও লগ পরীক্ষা করুন।';
    }
}

$flash = (string)($_SESSION['admin_flash'] ?? '');
unset($_SESSION['admin_flash']);
function moneyBdt(mixed $n): string { return '৳ ' . number_format((float)$n, 2); }
function statusLabel(string $s): string {
    return ['pending'=>'অপেক্ষমাণ','confirmed'=>'নিশ্চিত','processing'=>'প্রক্রিয়াধীন','shipped'=>'পাঠানো হয়েছে','delivered'=>'ডেলিভারি সম্পন্ন','cancelled'=>'বাতিল','unpaid'=>'বকেয়া','initiated'=>'শুরু হয়েছে','paid'=>'পরিশোধিত','failed'=>'ব্যর্থ','active'=>'চালু','paused'=>'স্থগিত','sold'=>'বিক্রি হয়েছে','removed'=>'সরানো হয়েছে','not_requested'=>'অনুরোধ করা হয়নি','booked'=>'বুক করা','picked_up'=>'পিকআপ হয়েছে','in_transit'=>'পথে','rejected'=>'প্রত্যাখ্যাত','approved'=>'অনুমোদিত'][$s] ?? $s;
}
function pageUrl(string $page, array $extra = []): string { return '/admin/?' . http_build_query(array_merge(['page'=>$page], $extra)); }

?><!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>অ্যাডমিন প্যানেল | HaatBazar</title>
<style>
:root{font-family:system-ui,-apple-system,"Noto Sans Bengali",sans-serif;color:#183324;background:#f4f7f2}*{box-sizing:border-box}body{margin:0}.top{background:#14532d;color:#fff;padding:16px 22px;display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.top a{color:#fff}.layout{max-width:1250px;margin:auto;padding:18px;display:grid;grid-template-columns:210px minmax(0,1fr);gap:18px}.nav,.panel,.stat{background:#fff;border:1px solid #dce6dc;border-radius:12px;padding:15px}.nav a{display:block;padding:10px;border-radius:8px;color:#14532d;text-decoration:none}.nav a.active,.nav a:hover{background:#e7f4e9}.content{min-width:0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.stat strong{display:block;font-size:1.5rem;margin-top:6px}.panel{margin-bottom:14px;overflow-wrap:anywhere}h1{font-size:1.5rem}h2{font-size:1.1rem}table{width:100%;border-collapse:collapse;min-width:650px}th,td{text-align:left;padding:10px;border-bottom:1px solid #e4ebe2;vertical-align:top}th{background:#f8faf7}.table-wrap{overflow:auto}input,select,textarea{width:100%;padding:9px;border:1px solid #bdcbbd;border-radius:7px;font:inherit;margin:4px 0 10px}label{font-size:.9rem;font-weight:600}button,.button{display:inline-block;border:0;border-radius:7px;padding:9px 12px;background:#166534;color:white;text-decoration:none;font:inherit;cursor:pointer}.muted{color:#607064;font-size:.9rem}.error{background:#fee2e2;color:#991b1b;padding:12px;border-radius:8px;margin-bottom:12px}.success{background:#dcfce7;color:#166534;padding:12px;border-radius:8px;margin-bottom:12px}.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.small{font-size:.85rem}.danger{background:#991b1b}@media(max-width:760px){.layout{grid-template-columns:1fr;padding:10px}.nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}.top{padding:14px}.row{grid-template-columns:1fr}}
</style>
</head>
<body>
<header class="top"><div><strong>🌾 HaatBazar Admin</strong><div class="small">অ্যাডমিন: <?=h($user['name'] ?? $user['email'] ?? 'Admin')?></div></div><div><a href="/">সাইট দেখুন</a> · <a href="/api/account">আমার অ্যাকাউন্ট</a></div></header>
<div class="layout">
<nav class="nav">
<a class="<?= $page==='dashboard'?'active':'' ?>" href="<?=h(pageUrl('dashboard'))?>">ড্যাশবোর্ড</a>
<a class="<?= $page==='products'?'active':'' ?>" href="<?=h(pageUrl('products'))?>">পণ্য ও স্টক</a>
<a class="<?= $page==='orders'?'active':'' ?>" href="<?=h(pageUrl('orders'))?>">অর্ডার</a>
<a class="<?= $page==='sellers'?'active':'' ?>" href="<?=h(pageUrl('sellers'))?>">বিক্রেতা যাচাই</a>
<a class="<?= $page==='users'?'active':'' ?>" href="<?=h(pageUrl('users'))?>">ক্রেতা ও বিক্রেতা</a>
<a class="<?= $page==='reports'?'active':'' ?>" href="<?=h(pageUrl('reports'))?>">রিপোর্ট</a>
</nav>
<main class="content">
<?php if ($flash !== ''): ?><div class="success"><?=h($flash)?></div><?php endif; ?>
<?php if ($error !== ''): ?><div class="error"><?=h($error)?></div><?php endif; ?>

<?php if ($page === 'dashboard'):
$stats = [
 'মোট পণ্য' => (int)$pdo->query("SELECT COUNT(*) FROM listings WHERE status<>'removed'")->fetchColumn(),
 'চালু পণ্য' => (int)$pdo->query("SELECT COUNT(*) FROM listings WHERE status='active'")->fetchColumn(),
 'মোট অর্ডার' => (int)$pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn(),
 'অপেক্ষমাণ অর্ডার' => (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE status='pending'")->fetchColumn(),
 'ক্রেতা' => (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='buyer'")->fetchColumn(),
 'বিক্রেতা' => (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='seller'")->fetchColumn(),
];
$revenue = (float)$pdo->query("SELECT COALESCE(SUM(amount_bdt),0) FROM orders WHERE payment_status='paid' AND status<>'cancelled'")->fetchColumn();
?>
<h1>ড্যাশবোর্ড</h1><div class="grid"><?php foreach ($stats as $label=>$value): ?><div class="stat"><?=h($label)?><strong><?=number_format($value)?></strong></div><?php endforeach; ?><div class="stat">পরিশোধিত অর্ডারের মোট<strong><?=h(moneyBdt($revenue))?></strong></div></div>
<div class="panel"><h2>দ্রুত কাজ</h2><p><a class="button" href="<?=h(pageUrl('products',['new'=>1]))?>">+ নতুন পণ্য</a> <a class="button" href="<?=h(pageUrl('orders'))?>">অর্ডার দেখুন</a> <a class="button" href="<?=h(pageUrl('reports'))?>">রিপোর্ট দেখুন</a></p><p class="muted">এই প্যানেলটি InfinityFree PHP/MySQL schema ব্যবহার করে। এখানে করা পরিবর্তন সেই একই ডেটাবেসে সংরক্ষিত হয়।</p></div>

<?php elseif ($page === 'products'):
$editId = (string)($_GET['edit'] ?? '');
$editing = null;
if ($editId !== '') { $st=$pdo->prepare('SELECT * FROM listings WHERE id=? LIMIT 1'); $st->execute([$editId]); $editing=$st->fetch() ?: null; }
$values = $editing ?: ['id'=>'','title'=>'','category'=>'','subcategory'=>'','district'=>'','price'=>'','unit'=>'piece','quantity'=>'0','description'=>'','status'=>'active','images'=>'[]'];
$images = json_decode((string)($values['images'] ?? '[]'),true); if (!is_array($images)) $images=[];
?>
<h1>পণ্য ও স্টক</h1><div class="panel"><h2><?=$editing?'পণ্য সম্পাদনা':'নতুন পণ্য যোগ করুন'?></h2><form method="post" enctype="multipart/form-data"><?=adminCsrfField()?><input type="hidden" name="action" value="save_product"><input type="hidden" name="id" value="<?=h($values['id'])?>">
<div class="row"><div><label>পণ্যের নাম</label><input name="title" maxlength="200" required value="<?=h($values['title'])?>"></div><div><label>ক্যাটাগরি</label><input name="category" maxlength="100" required value="<?=h($values['category'])?>" list="category-options"><datalist id="category-options"><?php foreach ($pdo->query("SELECT DISTINCT category FROM listings WHERE category<>'' ORDER BY category") as $c): ?><option value="<?=h($c['category'])?>"><?php endforeach; ?></datalist></div><div><label>সাবক্যাটাগরি</label><input name="subcategory" maxlength="100" value="<?=h($values['subcategory'])?>"></div><div><label>জেলা</label><input name="district" maxlength="100" required value="<?=h($values['district'])?>"></div><div><label>দাম (৳)</label><input type="number" name="price" min="0" step="0.01" required value="<?=h($values['price'])?>"></div><div><label>মজুদ</label><input type="number" name="quantity" min="0" step="0.001" required value="<?=h($values['quantity'])?>"></div><div><label>একক</label><input name="unit" maxlength="40" required value="<?=h($values['unit'])?>"></div><div><label>অবস্থা</label><select name="status"><?php foreach (['active','paused','sold','removed'] as $s): ?><option value="<?=h($s)?>" <?=$values['status']===$s?'selected':''?>><?=h(statusLabel($s))?></option><?php endforeach; ?></select></div></div>
<label>বিবরণ</label><textarea name="description" rows="4"><?=h($values['description'])?></textarea><label>ছবি (JPG/PNG/WEBP, সর্বোচ্চ ২ MB)</label><input type="file" name="image" accept="image/jpeg,image/png,image/webp">
<?php if ($images): ?><div class="muted">বর্তমান ছবি: <?php foreach ($images as $img): ?><a href="<?=h($img)?>" target="_blank" rel="noopener">ছবি দেখুন</a> · <?php endforeach; ?></div><?php endif; ?>
<button type="submit">সংরক্ষণ করুন</button> <?php if ($editing): ?><a class="button" href="<?=h(pageUrl('products'))?>">বাতিল</a><?php endif; ?></form></div>
<div class="panel"><h2>পণ্যের তালিকা</h2><div class="table-wrap"><table><thead><tr><th>পণ্য</th><th>ক্যাটাগরি/জেলা</th><th>দাম</th><th>মজুদ</th><th>অবস্থা</th><th>কাজ</th></tr></thead><tbody>
<?php foreach ($pdo->query("SELECT id,title,category,district,price,unit,quantity,status FROM listings ORDER BY created_at DESC LIMIT 200") as $p): ?><tr><td><?=h($p['title'])?><div class="muted small"><?=h($p['id'])?></div></td><td><?=h($p['category'])?><div class="muted"><?=h($p['district'])?></div></td><td><?=h(moneyBdt($p['price']))?> / <?=h($p['unit'])?></td><td><?=h($p['quantity'])?></td><td><?=h(statusLabel($p['status']))?></td><td><a class="button" href="<?=h(pageUrl('products',['edit'=>$p['id']]))?>">সম্পাদনা</a></td></tr><?php endforeach; ?>
</tbody></table></div></div>

<?php elseif ($page === 'orders'):
$filter = (string)($_GET['status'] ?? '');
$sql = "SELECT o.*,l.title listing_title,u.email buyer_email FROM orders o LEFT JOIN listings l ON l.id=o.listing_id LEFT JOIN users u ON u.id=o.buyer_id";
$params=[];
if (in_array($filter,['pending','confirmed','processing','shipped','delivered','cancelled'],true)) {$sql.=" WHERE o.status=?";$params[]=$filter;}
$sql.=" ORDER BY o.created_at DESC LIMIT 200";$st=$pdo->prepare($sql);$st->execute($params);
?>
<h1>অর্ডার ব্যবস্থাপনা</h1><div class="panel"><form method="get"><input type="hidden" name="page" value="orders"><label>স্ট্যাটাস অনুযায়ী ফিল্টার</label><select name="status"><option value="">সব অর্ডার</option><?php foreach (['pending','confirmed','processing','shipped','delivered','cancelled'] as $s): ?><option value="<?=h($s)?>" <?=$filter===$s?'selected':''?>><?=h(statusLabel($s))?></option><?php endforeach; ?></select><button>ফিল্টার</button></form></div>
<?php foreach ($st as $o): ?><div class="panel"><strong>#<?=h($o['id'])?> · <?=h($o['listing_title'] ?? 'পণ্য পাওয়া যায়নি')?></strong><p><?=h($o['buyer_name'])?> · <?=h($o['buyer_phone'])?> · <?=h($o['buyer_email'])?></p><p><?=h($o['address'])?></p><p>পরিমাণ: <?=h($o['quantity'])?> · মোট: <strong><?=h(moneyBdt($o['amount_bdt']))?></strong> · তৈরি: <?=h($o['created_at'])?></p><p>পেমেন্ট: <?=h(statusLabel($o['payment_status']))?> · ডেলিভারি: <?=h(statusLabel($o['shipping_status']))?></p><p><a class="button" href="<?=h(pageUrl('invoice',['id'=>$o['id']]))?>" target="_blank" rel="noopener">ইনভয়েস</a></p><form method="post" class="row"><?=adminCsrfField()?><input type="hidden" name="action" value="update_order"><input type="hidden" name="id" value="<?=h($o['id'])?>"><div><label>অর্ডার স্ট্যাটাস</label><select name="status"><?php foreach (['pending','confirmed','processing','shipped','delivered','cancelled'] as $s): ?><option value="<?=h($s)?>" <?=$o['status']===$s?'selected':''?>><?=h(statusLabel($s))?></option><?php endforeach; ?></select></div><div><label>পেমেন্ট স্ট্যাটাস</label><select name="payment_status"><?php foreach (['unpaid','initiated','paid','failed','cancelled'] as $s): ?><option value="<?=h($s)?>" <?=$o['payment_status']===$s?'selected':''?>><?=h(statusLabel($s))?></option><?php endforeach; ?></select></div><div><label>ডেলিভারি স্ট্যাটাস</label><select name="shipping_status"><?php foreach (['not_requested','pending','booked','picked_up','in_transit','delivered','failed','cancelled'] as $s): ?><option value="<?=h($s)?>" <?=$o['shipping_status']===$s?'selected':''?>><?=h(statusLabel($s))?></option><?php endforeach; ?></select></div><div><button>আপডেট</button></div></form></div><?php endforeach; ?>

<?php elseif ($page === 'users'):
?>
<h1>ক্রেতা ও বিক্রেতা</h1><div class="panel"><div class="table-wrap"><table><thead><tr><th>নাম</th><th>ইমেইল</th><th>ফোন</th><th>ধরন</th><th>যোগদান</th></tr></thead><tbody><?php foreach ($pdo->query("SELECT id,name,email,phone,role,created_at FROM users ORDER BY created_at DESC LIMIT 300") as $u): ?><tr><td><?=h($u['name'])?><div class="muted">#<?=h($u['id'])?></div></td><td><?=h($u['email'])?></td><td><?=h($u['phone'])?></td><td><?=h($u['role'])?></td><td><?=h($u['created_at'])?></td></tr><?php endforeach; ?></tbody></table></div></div>

<?php elseif ($page === 'sellers'):
?>
<h1>বিক্রেতা যাচাই</h1><div class="panel"><p class="muted">এই তালিকা দেখাতে database schema-তে seller_verifications migration চালানো থাকতে হবে। নতুন seller আবেদন API এখনো সংযুক্ত না হওয়ায় এখানে শুধু জমা হওয়া আবেদন দেখাবে।</p><div class="table-wrap"><table><thead><tr><th>বিক্রেতা</th><th>ব্যবসা</th><th>লাইসেন্স</th><th>অবস্থা</th><th>পর্যালোচনা</th></tr></thead><tbody><?php
try { $rows=$pdo->query("SELECT v.*,u.name,u.email FROM seller_verifications v JOIN users u ON u.id=v.user_id ORDER BY v.created_at DESC LIMIT 200"); foreach ($rows as $v): ?>
<tr><td><?=h($v['name'])?><div class="muted"><?=h($v['email'])?></div></td><td><?=h($v['business_name'])?></td><td><?=h($v['trade_license'] ?? '')?></td><td><?=h(statusLabel($v['status']))?></td><td><form method="post"><?=adminCsrfField()?><input type="hidden" name="action" value="review_seller"><input type="hidden" name="id" value="<?=h($v['id'])?>"><select name="status"><?php foreach (['pending','approved','rejected'] as $s): ?><option value="<?=h($s)?>" <?=$v['status']===$s?'selected':''?>><?=h(statusLabel($s))?></option><?php endforeach; ?></select><input name="admin_note" maxlength="500" value="<?=h($v['admin_note'] ?? '')?>" placeholder="অ্যাডমিন নোট"><button>সেভ</button></form></td></tr>
<?php endforeach; } catch (Throwable $e) { echo '<tr><td colspan="5">seller_verifications টেবিল নেই। database/admin-panel-migration.sql চালান।</td></tr>'; } ?></tbody></table></div></div>

<?php elseif ($page === 'reports'):
$totals=$pdo->query("SELECT COUNT(*) order_count,COALESCE(SUM(amount_bdt),0) order_total,COALESCE(SUM(CASE WHEN payment_status='paid' THEN amount_bdt ELSE 0 END),0) paid_total,COALESCE(SUM(CASE WHEN payment_status<>'paid' AND status<>'cancelled' THEN amount_bdt ELSE 0 END),0) unpaid_total FROM orders")->fetch();
?>
<h1>বিক্রির রিপোর্ট</h1><div class="grid"><div class="stat">মোট অর্ডার<strong><?=number_format((int)$totals['order_count'])?></strong></div><div class="stat">অর্ডারের মোট মূল্য<strong><?=h(moneyBdt($totals['order_total']))?></strong></div><div class="stat">পরিশোধিত<strong><?=h(moneyBdt($totals['paid_total']))?></strong></div><div class="stat">বকেয়া/অপরিশোধিত<strong><?=h(moneyBdt($totals['unpaid_total']))?></strong></div></div><div class="panel"><h2>সাম্প্রতিক অর্ডার</h2><div class="table-wrap"><table><thead><tr><th>তারিখ</th><th>অর্ডার</th><th>স্ট্যাটাস</th><th>মূল্য</th></tr></thead><tbody><?php foreach ($pdo->query("SELECT id,status,amount_bdt,created_at FROM orders ORDER BY created_at DESC LIMIT 30") as $o): ?><tr><td><?=h($o['created_at'])?></td><td><a href="<?=h(pageUrl('invoice',['id'=>$o['id']]))?>">#<?=h($o['id'])?></a></td><td><?=h(statusLabel($o['status']))?></td><td><?=h(moneyBdt($o['amount_bdt']))?></td></tr><?php endforeach; ?></tbody></table></div></div>

<?php elseif ($page === 'invoice'):
$id=trim((string)($_GET['id'] ?? ''));$st=$pdo->prepare("SELECT o.*,l.title listing_title,u.email buyer_email FROM orders o LEFT JOIN listings l ON l.id=o.listing_id LEFT JOIN users u ON u.id=o.buyer_id WHERE o.id=? LIMIT 1");$st->execute([$id]);$o=$st->fetch();
?>
<h1>ইনভয়েস</h1><?php if (!$o): ?><div class="panel">অর্ডার পাওয়া যায়নি।</div><?php else: ?><div class="panel"><h2>HaatBazar — অর্ডার ইনভয়েস</h2><p>অর্ডার নম্বর: <strong><?=h($o['id'])?></strong></p><p>তারিখ: <?=h($o['created_at'])?></p><hr><p>ক্রেতা: <?=h($o['buyer_name'])?></p><p>ফোন: <?=h($o['buyer_phone'])?> · ইমেইল: <?=h($o['buyer_email'])?></p><p>ঠিকানা: <?=h($o['address'])?></p><hr><p>পণ্য: <?=h($o['listing_title'] ?? 'পণ্য পাওয়া যায়নি')?></p><p>পরিমাণ: <?=h($o['quantity'])?></p><p>মোট: <strong><?=h(moneyBdt($o['amount_bdt']))?></strong></p><p>পেমেন্ট: <?=h(statusLabel($o['payment_status']))?> · অর্ডার: <?=h(statusLabel($o['status']))?></p><button onclick="window.print()">প্রিন্ট / PDF</button></div><style>@media print{.top,.nav,button{display:none!important}.layout{display:block;padding:0}.panel{border:0}}</style><?php endif; ?>
<?php endif; ?>
</main></div></body></html>
