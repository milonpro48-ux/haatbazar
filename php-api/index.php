<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = preg_replace('#/+#', '/', $path);
$action = trim((string)($_GET['action'] ?? ''), '/');
$pathAction = trim((string)preg_replace('#^/api/?#', '', $path), '/');
if ($action === '') $action = $pathAction;
if (str_ends_with($action, '.php')) $action = substr($action, 0, -4);
// Keep the existing frontend route contract (/api/listings and /api/listings/:id).
if ($action === 'listings') $action = ($method === 'POST') ? 'create_listing' : 'products';
if (preg_match('#^listings/([^/]+)$#', $action, $routeMatch)) {
    $_GET['id'] = rawurldecode($routeMatch[1]);
    $action = 'listing';
}
if ($action === 'listings' && $method === 'POST') $action = 'create_listing';
$body = null;
function hb_input(): array {
    global $body;
    if ($body !== null) return $body;
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') return $body = $_POST;
    $parsed = json_decode($raw, true);
    if (!is_array($parsed)) hb_json(['error'=>'invalid_json'], 400);
    return $body = $parsed;
}
function hb_str(mixed $v, int $max=200): string {
    if (!is_string($v) && !is_numeric($v)) return '';
    $s = trim((string)$v);
    return function_exists('mb_substr') ? mb_substr($s, 0, $max) : substr($s, 0, $max);
}
function hb_role(array $u, array $roles): void {
    if (!in_array((string)($u['role'] ?? ''), $roles, true)) hb_json(['error'=>'forbidden'], 403);
}
function hb_listing_payload(array $row): array {
    foreach (['images'] as $k) $row[$k] = is_array($row[$k] ?? null) ? $row[$k] : (json_decode((string)($row[$k] ?? '[]'), true) ?: []);
    foreach (['price','quantity','minOrderQuantity'] as $k) $row[$k] = (float)($row[$k] ?? 0);
    foreach (['negotiable','deliveryAvailable'] as $k) $row[$k] = (bool)($row[$k] ?? false);
    return $row;
}
function hb_listing_fields(array $b, array $u): array {
    $title=hb_str($b['title']??'',120); $category=hb_str($b['category']??'',100);
    $subcategory=hb_str($b['subcategory']??'',120); $district=hb_str($b['district']??'',100);
    $upazila=hb_str($b['upazila']??'',100); $unit=hb_str($b['unit']??'piece',24);
    $desc=hb_str($b['description']??'',4000); $phone=preg_replace('/[\\s-]/','',hb_str($b['phone']??($u['phone']??''),30));
    $price=filter_var($b['price']??null,FILTER_VALIDATE_FLOAT); $qty=filter_var($b['quantity']??null,FILTER_VALIDATE_FLOAT);
    $sale=hb_str($b['saleType']??'retail',20); $min=filter_var($b['minOrderQuantity']??1,FILTER_VALIDATE_FLOAT);
    $images=$b['images']??[];
    $units=['kg','maund','ton','piece','dozen','liter','bag','hali','box','set','hour','day','month'];
    if (strlen($title)<3 || $category==='' || $subcategory==='' || $district==='' ||
        $price===false || $price<0 || $price>100000000000 || $qty===false || $qty<0 ||
        $min===false || $min<1 || $min>$qty || !in_array($unit,$units,true) ||
        !in_array($sale,['retail','wholesale','both'],true) || strlen($desc)<5 ||
        !preg_match('/^(?:\\+?88)?01[3-9]\\d{8}$/',$phone) || !is_array($images) || count($images)>5) {
        hb_json(['error'=>'invalid_listing'],422);
    }
    if ($sale==='wholesale' && $min<1) hb_json(['error'=>'invalid_minimum_order'],422);
    foreach($images as $img) if(!is_string($img) || strlen($img)>500 || !preg_match('#^/uploads/products/[a-f0-9]{40}\\.(jpg|png|webp)$#',$img)) hb_json(['error'=>'invalid_image'],422);
    return [
      'title'=>$title,'category'=>$category,'subcategory'=>$subcategory,'district'=>$district,'upazila'=>$upazila,
      'price'=>(float)$price,'unit'=>$unit,'quantity'=>(float)$qty,'negotiable'=>empty($b['negotiable'])?0:1,
      'sellerName'=>hb_str($b['sellerName']??($u['name']??''),100),
      'businessName'=>hb_str($b['businessName']??'',160),'description'=>$desc,'images'=>json_encode(array_values($images),JSON_UNESCAPED_SLASHES),
      'phone'=>$phone,'saleType'=>$sale,'minOrderQuantity'=>(float)$min,'deliveryAvailable'=>empty($b['deliveryAvailable'])?0:1
    ];
}
try {
    if ($method==='GET' && $action==='healthz') hb_json(['status'=>'ok','service'=>'haatbazar-php','time'=>gmdate('c')]);
    if ($method==='GET' && $action==='csrf') {
        if(empty($_SESSION['csrf_token'])) $_SESSION['csrf_token']=bin2hex(random_bytes(32));
        hb_json(['csrfToken'=>$_SESSION['csrf_token'],'csrf'=>$_SESSION['csrf_token']]);
    }
    if ($method==='GET' && $action==='me') hb_json(['user'=>hb_user()]);
    if ($action==='register' && $method==='POST') {
        $b=hb_input(); $name=hb_str($b['name']??'',100); $email=strtolower(hb_str($b['email']??'',200));
        $phone=preg_replace('/[\\s-]/','',hb_str($b['phone']??'',30)); $password=$b['password']??'';
        $role=hb_str($b['role']??'buyer',30);
        if(strlen($name)<2 || !filter_var($email,FILTER_VALIDATE_EMAIL) || !preg_match('/^(?:\\+?88)?01[3-9]\\d{8}$/',$phone) ||
          !is_string($password) || strlen($password)<12 || strlen($password)>200 ||
          !in_array($role,['buyer','business_buyer','seller','wholesaler'],true)) hb_json(['error'=>'invalid_registration'],422);
        $st=$pdo->prepare('SELECT id FROM users WHERE email=? LIMIT 1'); $st->execute([$email]);
        if($st->fetch()) hb_json(['error'=>'email_already_registered'],409);
        $st=$pdo->prepare('INSERT INTO users(name,email,phone,password_hash,role) VALUES(?,?,?,?,?)');
        $st->execute([$name,$email,$phone,password_hash($password,PASSWORD_DEFAULT),$role]);
        session_regenerate_id(true);
        $_SESSION['user']=['id'=>(int)$pdo->lastInsertId(),'name'=>$name,'email'=>$email,'phone'=>$phone,'role'=>$role];
        $_SESSION['csrf_token']=bin2hex(random_bytes(32));
        hb_json(['user'=>$_SESSION['user'],'csrfToken'=>$_SESSION['csrf_token'],'csrf'=>$_SESSION['csrf_token']],201);
    }
    if ($action==='login' && $method==='POST') {
        $b=hb_input(); $email=strtolower(hb_str($b['email']??'',200)); $password=$b['password']??'';
        if(!filter_var($email,FILTER_VALIDATE_EMAIL) || !is_string($password)) hb_json(['error'=>'invalid_credentials'],401);
        $st=$pdo->prepare('SELECT id,name,email,phone,password_hash,role FROM users WHERE email=? LIMIT 1'); $st->execute([$email]); $row=$st->fetch();
        if(!$row || !password_verify($password,(string)$row['password_hash'])) hb_json(['error'=>'invalid_credentials'],401);
        session_regenerate_id(true);
        unset($row['password_hash']); $row['id']=(int)$row['id']; $_SESSION['user']=$row; $_SESSION['csrf_token']=bin2hex(random_bytes(32));
        hb_json(['user'=>$row,'csrfToken'=>$_SESSION['csrf_token'],'csrf'=>$_SESSION['csrf_token']]);
    }
    if ($action==='logout' && $method==='POST') {
        hb_require_user(); $_SESSION=[]; if(ini_get('session.use_cookies')) { $p=session_get_cookie_params(); setcookie(session_name(),'',(int)(time()-42000),$p['path'],$p['domain']??'',(bool)$p['secure'],(bool)$p['httponly']); }
        session_destroy(); hb_json(['ok'=>true]);
    }
    if ($action==='products' && $method==='GET') {
        $q=hb_str($_GET['q']??$_GET['search']??'',100); $cat=hb_str($_GET['category']??'',100);
        $district=hb_str($_GET['district']??'',100); $subcat=hb_str($_GET['subcategory']??'',120); $sale=hb_str($_GET['saleType']??'',20);
        $page=max(1,min(10000,(int)($_GET['page']??1))); $limit=max(1,min(50,(int)($_GET['limit']??20)));
        $where=["status='active'"]; $params=[];
        if($q!==''){ $where[]='(title LIKE ? OR description LIKE ? OR businessName LIKE ?)'; $term='%'.$q.'%'; array_push($params,$term,$term,$term); }
        if($cat!==''){ $where[]='category=?'; $params[]=$cat; } if($subcat!==''){ $where[]='subcategory=?'; $params[]=$subcat; } if($district!==''){ $where[]='district=?'; $params[]=$district; }
        if(in_array($sale,['retail','wholesale'],true)){ $where[]='saleType IN (?,?)'; array_push($params,$sale,'both'); }
        $w=implode(' AND ',$where); $c=$pdo->prepare("SELECT COUNT(*) FROM listings WHERE $w"); $c->execute($params); $total=(int)$c->fetchColumn();
        $st=$pdo->prepare("SELECT id,title,category,subcategory,district,upazila,price,unit,quantity,negotiable,sellerName,businessName,description,images,phone,saleType,minOrderQuantity,deliveryAvailable,created_at FROM listings WHERE $w ORDER BY created_at DESC LIMIT $limit OFFSET ".(($page-1)*$limit)); $st->execute($params);
        $items=array_map('hb_listing_payload',$st->fetchAll()); hb_json(['items'=>$items,'products'=>$items,'total'=>$total,'page'=>$page,'limit'=>$limit]);
    }
    if ($action==='listing' && $method==='GET') {
        $id=hb_str($_GET['id']??'',80); $st=$pdo->prepare("SELECT * FROM listings WHERE id=? AND status='active' LIMIT 1"); $st->execute([$id]); $row=$st->fetch();
        if(!$row) hb_json(['error'=>'not_found'],404); hb_json(hb_listing_payload($row));
    }
    if ($action==='create_listing' && $method==='POST') {
        $u=hb_require_user(); hb_role($u,['seller','wholesaler','admin']); $b=hb_input(); $v=hb_listing_fields($b,$u);
        $id=bin2hex(random_bytes(16));
        $sql='INSERT INTO listings(id,user_id,title,category,subcategory,district,upazila,price,unit,quantity,negotiable,sellerName,businessName,description,images,phone,saleType,minOrderQuantity,deliveryAvailable,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,\'active\')';
        $st=$pdo->prepare($sql); $st->execute([$id,(int)$u['id'],$v['title'],$v['category'],$v['subcategory'],$v['district'],$v['upazila'],$v['price'],$v['unit'],$v['quantity'],$v['negotiable'],$v['sellerName'],$v['businessName'],$v['description'],$v['images'],$v['phone'],$v['saleType'],$v['minOrderQuantity'],$v['deliveryAvailable']]);
        $v['id']=$id; $v['images']=json_decode($v['images'],true)?:[]; hb_json($v,201);
    }
    if ($action==='update_listing' && $method==='POST') {
        $u=hb_require_user(); hb_role($u,['seller','wholesaler','admin']); $b=hb_input(); $id=hb_str($b['id']??'',80);
        $find=$pdo->prepare('SELECT user_id FROM listings WHERE id=?'); $find->execute([$id]); $owner=$find->fetch();
        if(!$owner) hb_json(['error'=>'not_found'],404); if(($u['role']??'')!=='admin' && (int)$owner['user_id']!==(int)$u['id']) hb_json(['error'=>'forbidden'],403);
        $v=hb_listing_fields($b,$u); $st=$pdo->prepare('UPDATE listings SET title=?,category=?,subcategory=?,district=?,upazila=?,price=?,unit=?,quantity=?,negotiable=?,sellerName=?,businessName=?,description=?,images=?,phone=?,saleType=?,minOrderQuantity=?,deliveryAvailable=? WHERE id=?');
        $st->execute([$v['title'],$v['category'],$v['subcategory'],$v['district'],$v['upazila'],$v['price'],$v['unit'],$v['quantity'],$v['negotiable'],$v['sellerName'],$v['businessName'],$v['description'],$v['images'],$v['phone'],$v['saleType'],$v['minOrderQuantity'],$v['deliveryAvailable'],$id]);
        hb_json(['ok'=>true,'id'=>$id]);
    }
    if ($action==='orders' && $method==='POST') {
        $u=hb_require_user(); hb_role($u,['buyer','business_buyer']); $b=hb_input(); $listingId=hb_str($b['listingId']??'',80);
        $quantity=filter_var($b['quantity']??null,FILTER_VALIDATE_FLOAT); $address=hb_str($b['address']??'',500);
        if($quantity===false || $quantity<=0 || strlen($address)<5) hb_json(['error'=>'invalid_order'],422);
        $pdo->beginTransaction();
        try {
            $st=$pdo->prepare("SELECT id,user_id,price,quantity,minOrderQuantity,saleType,status FROM listings WHERE id=? FOR UPDATE"); $st->execute([$listingId]); $l=$st->fetch();
            if(!$l || $l['status']!=='active') { $pdo->rollBack(); hb_json(['error'=>'listing_unavailable'],404); }
            if($quantity<(float)$l['minOrderQuantity'] || $quantity>(float)$l['quantity']) { $pdo->rollBack(); hb_json(['error'=>'quantity_out_of_range'],422); }
            if($l['saleType']==='retail' && (float)$quantity < 1) { $pdo->rollBack(); hb_json(['error'=>'quantity_out_of_range'],422); }
            $id='HB'.gmdate('ymd').strtoupper(bin2hex(random_bytes(5)));
            $name=hb_str($b['buyerName']??$u['name'],100); $phone=preg_replace('/[\\s-]/','',hb_str($b['buyerPhone']??$u['phone'],30));
            $email=strtolower(hb_str($b['buyerEmail']??$u['email'],200));
            if($name==='' || !preg_match('/^(?:\\+?88)?01[3-9]\\d{8}$/',$phone) || !filter_var($email,FILTER_VALIDATE_EMAIL)) { $pdo->rollBack(); hb_json(['error'=>'invalid_buyer_details'],422); }
            $amount=round((float)$l['price']*(float)$quantity,2);
            $ins=$pdo->prepare("INSERT INTO orders(id,listing_id,buyer_id,quantity,buyer_name,buyer_phone,buyer_email,address,amount_bdt,status,payment_status,shipping_status) VALUES(?,?,?,?,?,?,?,?,?,'pending','unpaid','not_requested')");
            $ins->execute([$id,$listingId,(int)$u['id'],(float)$quantity,$name,$phone,$email,$address,$amount]);
            // Reserve stock in the same transaction as order creation to prevent overselling.
            $reserve=$pdo->prepare('UPDATE listings SET quantity=quantity-? WHERE id=? AND quantity>=?');
            $reserve->execute([(float)$quantity,$listingId,(float)$quantity]);
            if($reserve->rowCount()!==1) { $pdo->rollBack(); hb_json(['error'=>'quantity_out_of_range'],422); }
            $pdo->prepare('INSERT INTO order_status_history(order_id,old_status,new_status,actor_user_id,note) VALUES(?,NULL,?,?,?)')->execute([$id,'pending',(int)$u['id'],'Order created']);
            $pdo->commit(); hb_json(['id'=>$id,'status'=>'pending','amount_bdt'=>$amount],201);
        } catch(Throwable $e) { if($pdo->inTransaction())$pdo->rollBack(); throw $e; }
    }
    if ($action==='my_orders' && $method==='GET') {
        $u=hb_require_user(); hb_role($u,['buyer','business_buyer']);
        $st=$pdo->prepare('SELECT o.id,o.listing_id,l.title listingTitle,o.quantity,o.amount_bdt,o.status,o.payment_status,o.shipping_status,o.created_at,o.updated_at FROM orders o JOIN listings l ON l.id=o.listing_id WHERE o.buyer_id=? ORDER BY o.created_at DESC LIMIT 100');
        $st->execute([(int)$u['id']]); hb_json(['items'=>$st->fetchAll()]);
    }
    if ($action==='seller_orders' && $method==='GET') {
        $u=hb_require_user(); hb_role($u,['seller','wholesaler','admin']);
        if($u['role']==='admin') $st=$pdo->query('SELECT o.*,l.title listingTitle FROM orders o JOIN listings l ON l.id=o.listing_id ORDER BY o.created_at DESC LIMIT 200');
        else { $st=$pdo->prepare('SELECT o.*,l.title listingTitle FROM orders o JOIN listings l ON l.id=o.listing_id WHERE l.user_id=? ORDER BY o.created_at DESC LIMIT 200'); $st->execute([(int)$u['id']]); }
        hb_json(['items'=>$st->fetchAll()]);
    }
    if (str_starts_with($action,'admin_')) {
        $admin=hb_require_admin();
        if($action==='admin_orders' && $method==='GET') {
            $st=$pdo->query('SELECT o.*,l.title listingTitle FROM orders o JOIN listings l ON l.id=o.listing_id ORDER BY o.created_at DESC LIMIT 200'); hb_json(['items'=>$st->fetchAll()]);
        }
        if($action==='admin_order_status' && $method==='POST') {
            $b=hb_input(); $id=hb_str($b['order_id']??'',80); $status=hb_str($b['status']??'',40);
            $allowed=['pending','confirmed','processing','shipped','delivered','cancelled']; if(!in_array($status,$allowed,true)) hb_json(['error'=>'invalid_status'],422);
            $pdo->beginTransaction();
            try { $st=$pdo->prepare('SELECT status FROM orders WHERE id=? FOR UPDATE'); $st->execute([$id]); $o=$st->fetch(); if(!$o){$pdo->rollBack();hb_json(['error'=>'not_found'],404);}
                $old=$o['status'];
                if($status==='cancelled' && $old!=='cancelled') {
                    $restore=$pdo->prepare('SELECT listing_id,quantity FROM orders WHERE id=?'); $restore->execute([$id]); $line=$restore->fetch();
                    if($line) $pdo->prepare('UPDATE listings SET quantity=quantity+? WHERE id=?')->execute([(float)$line['quantity'],$line['listing_id']]);
                }
                $pdo->prepare('UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$status,$id]);
                $pdo->prepare('INSERT INTO order_status_history(order_id,old_status,new_status,actor_user_id,note) VALUES(?,?,?,?,?)')->execute([$id,$old,$status,(int)$admin['id'],hb_str($b['note']??'',500)]);
                $pdo->commit(); hb_json(['ok'=>true,'order_id'=>$id,'status'=>$status]);
            } catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        }
        if($action==='admin_products' && $method==='GET') {
            $st=$pdo->query('SELECT * FROM listings ORDER BY created_at DESC LIMIT 200'); hb_json(['items'=>array_map('hb_listing_payload',$st->fetchAll())]);
        }
        if($action==='admin_product_update' && $method==='POST') {
            $b=hb_input(); $id=hb_str($b['id']??'',80); $sets=[];$vals=[];
            foreach(['title'=>120,'category'=>100,'subcategory'=>120,'district'=>100,'status'=>20] as $key=>$max) if(array_key_exists($key,$b)) { $value=hb_str($b[$key],$max); if($key==='status'&&!in_array($value,['active','paused','sold','removed'],true))hb_json(['error'=>'invalid_status'],422); if($value==='')hb_json(['error'=>'invalid_'.$key],422);$sets[]="$key=?";$vals[]=$value; }
            foreach(['price','quantity','minOrderQuantity'] as $key) if(array_key_exists($key,$b)){ $n=filter_var($b[$key],FILTER_VALIDATE_FLOAT); if($n===false||$n<0||($key==='minOrderQuantity'&&$n<1))hb_json(['error'=>'invalid_'.$key],422);$sets[]="$key=?";$vals[]=$n; }
            if(!$sets||$id==='')hb_json(['error'=>'invalid_update'],422); $vals[]=$id; $st=$pdo->prepare('UPDATE listings SET '.implode(',',$sets).' WHERE id=?');$st->execute($vals); if($st->rowCount()===0){$check=$pdo->prepare('SELECT id FROM listings WHERE id=?');$check->execute([$id]);if(!$check->fetch())hb_json(['error'=>'not_found'],404);} hb_json(['ok'=>true,'id'=>$id]);
        }
        if($action==='admin_product_delete' && $method==='POST') { $b=hb_input();$id=hb_str($b['id']??'',80);$st=$pdo->prepare("UPDATE listings SET status='removed' WHERE id=?");$st->execute([$id]);if(!$st->rowCount())hb_json(['error'=>'not_found'],404);hb_json(['ok'=>true,'id'=>$id,'status'=>'removed']); }
        hb_json(['error'=>'not_found'],404);
    }
    hb_json(['error'=>'endpoint_not_migrated','message'=>'This endpoint is not enabled in the PHP migration yet.'],501);
} catch(Throwable $e) {
    error_log('HaatBazar PHP API error: '.$e->getMessage());
    hb_json(['error'=>'server_error'],500);
}
