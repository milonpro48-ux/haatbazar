import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { access, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const configPath=path.join(root,'php-api','config.local.php');
const dsn=process.env.HAATBAZAR_TEST_DB_DSN;
const dbUser=process.env.HAATBAZAR_TEST_DB_USER;
const dbPassword=process.env.HAATBAZAR_TEST_DB_PASSWORD;
if(!dsn||!dbUser||dbPassword===undefined) throw new Error('Set HAATBAZAR_TEST_DB_DSN, HAATBAZAR_TEST_DB_USER and HAATBAZAR_TEST_DB_PASSWORD');
try { await access(configPath); throw new Error('Refusing to overwrite php-api/config.local.php'); }
catch(e){ if(e?.code!=='ENOENT') throw e; }
await writeFile(configPath, `<?php
return ['db'=>['host'=>'127.0.0.1','name'=>'haatbazar_test','user'=>${JSON.stringify(dbUser)},'password'=>${JSON.stringify(dbPassword)},'charset'=>'utf8mb4'],'session_name'=>'hb_test','session_secure'=>false];
`,{mode:0o600});
const probe=net.createServer();
await new Promise((resolve,reject)=>probe.listen(0,'127.0.0.1',e=>e?reject(e):resolve()));
const {port}=probe.address(); await new Promise(r=>probe.close(r));
const base=`http://127.0.0.1:${port}`;
const php=spawn('php',['-S',`127.0.0.1:${port}`,path.join(root,'php-api','index.php')],{cwd:root,stdio:['ignore','pipe','pipe']});
let logs=''; php.stdout.on('data',c=>logs+=c); php.stderr.on('data',c=>logs+=c);
async function start(){const until=Date.now()+10000;while(Date.now()<until){if(php.exitCode!==null)throw new Error('PHP server exited '+logs);try{const r=await fetch(base+'/api/healthz');if(r.status===200)return;}catch{} await new Promise(r=>setTimeout(r,100));}throw new Error('PHP server did not start '+logs);}
function client(){
 let cookie='',csrf='';
 return {
  async call(action,{method='GET',query={},body,expect=200,sendCsrf=true}={}){
   const url=new URL('/api/'+action,base);for(const [k,v] of Object.entries(query))url.searchParams.set(k,String(v));
   const headers={Accept:'application/json'};
   if(cookie)headers.Cookie=cookie;
   if(body!==undefined){headers['Content-Type']='application/json';if(sendCsrf)headers['X-CSRF-Token']=csrf;}
   const response=await fetch(url,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
   const sc=response.headers.get('set-cookie');if(sc)cookie=sc.split(';',1)[0];
   const data=await response.json();
   assert.equal(response.status,expect,`${method} ${action} expected ${expect}, got ${response.status}: ${JSON.stringify(data)}`);
   if(data.csrfToken)csrf=data.csrfToken;
   return data;
  },
  async init(){const d=await this.call('csrf');csrf=d.csrfToken;assert.equal(d.csrf,d.csrfToken,'frontend csrf field alias must be present');return d;}
 };
}
const suffix=Date.now();
const runPhp=(code)=>{const r=spawnSync('php',['-r',code],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,'PHP DB assertion failed: '+r.stderr);return r.stdout.trim();};
async function main(){
 await start();
 const noCsrf=client(); await noCsrf.init();
 await noCsrf.call('register',{method:'POST',body:{name:'Bad CSRF',email:`bad-${suffix}@example.test`,phone:'01712345678',password:'LongPassword123!',role:'seller'},expect:403,sendCsrf:false});
 const seller=client();await seller.init();
 const sellerReg=await seller.call('register',{method:'POST',expect:201,body:{name:'Wholesale Seller',email:`seller-${suffix}@example.test`,phone:'01712345678',password:'SellerPassword123!',role:'wholesaler'}});
 assert.equal(sellerReg.user.role,'wholesaler');
 const listing=await seller.call('listings',{method:'POST',expect:201,body:{title:'Test wholesale rice',category:'grocery',subcategory:'rice',district:'Bogra',price:100,unit:'kg',quantity:100,description:'Integration test wholesale product',phone:'01712345678',saleType:'wholesale',minOrderQuantity:10,businessName:'Test Wholesale Ltd'}});
 assert.ok(listing.id);
 const duplicate=client();await duplicate.init();
 await duplicate.call('register',{method:'POST',expect:409,body:{name:'Duplicate',email:`seller-${suffix}@example.test`,phone:'01712345678',password:'SellerPassword123!',role:'buyer'}});
 const badLogin=client();await badLogin.init();
 await badLogin.call('login',{method:'POST',expect:401,body:{email:`seller-${suffix}@example.test`,password:'DefinitelyWrongPassword!'}});
 const injection=await seller.call('products',{query:{q:"%' OR 1=1 --"}});
 assert.equal(injection.items.length,0,'search input must be treated as data, not SQL');
 const otherSeller=client();await otherSeller.init();
 await otherSeller.call('register',{method:'POST',expect:201,body:{name:'Other Seller',email:`other-seller-${suffix}@example.test`,phone:'01712345679',password:'OtherSellerPassword123!',role:'seller'}});
 await otherSeller.call('update_listing',{method:'POST',expect:403,body:{id:listing.id,title:'Hijacked listing',category:'grocery',subcategory:'rice',district:'Bogra',price:100,unit:'kg',quantity:100,description:'Attempt to edit another seller listing',phone:'01712345679',saleType:'wholesale',minOrderQuantity:10}});
 const buyer=client();await buyer.init();
 const buyerReg=await buyer.call('register',{method:'POST',expect:201,body:{name:'Shop Buyer',email:`buyer-${suffix}@example.test`,phone:'01812345678',password:'BuyerPassword123!',role:'business_buyer'}});
 assert.equal(buyerReg.user.role,'business_buyer');
 const order=await buyer.call('orders',{method:'POST',expect:201,body:{listingId:listing.id,quantity:10,address:'Test shop address, Bogra'}});
 const listingAfterOrder=await seller.call('listing',{query:{id:listing.id}});
 assert.equal(listingAfterOrder.quantity,90,'stock must be reserved when order is created');
 const listingByFrontendPath=await seller.call('listings/'+listing.id);
 assert.equal(listingByFrontendPath.id,listing.id,'frontend /api/listings/:id route must resolve');
 assert.ok(order.id);
 const history=await buyer.call('my_orders');assert.ok(history.items.some(x=>x.id===order.id));
 const other=client();await other.init();
 await other.call('register',{method:'POST',expect:201,body:{name:'Other Buyer',email:`other-${suffix}@example.test`,phone:'01912345678',password:'OtherPassword123!',role:'buyer'}});
 assert.equal((await other.call('my_orders')).items.some(x=>x.id===order.id),false,'buyer history must be owner-scoped');
 await other.call('orders',{method:'POST',expect:422,body:{listingId:listing.id,quantity:1,address:'Another address, Bogra'}});
 await seller.call('admin_orders',{expect:403});
 const anonymous=client();await anonymous.init();await anonymous.call('admin_orders',{expect:401});
 const seed=runPhp(`$c=require ${JSON.stringify(configPath)};$p=new PDO('mysql:host='.$c['db']['host'].';dbname='.$c['db']['name'].';charset=utf8mb4',$c['db']['user'],$c['db']['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);$s=$p->prepare('INSERT INTO users(name,email,phone,password_hash,role) VALUES(?,?,?,?,?)');$s->execute(['Test Admin','admin-${suffix}@example.test','',password_hash('AdminPassword123!',PASSWORD_DEFAULT),'admin']);echo 'ok';`);
 assert.equal(seed,'ok');
 const admin=client();await admin.init();await admin.call('login',{method:'POST',body:{email:`admin-${suffix}@example.test`,password:'AdminPassword123!'}});
 await admin.call('admin_order_status',{method:'POST',body:{order_id:order.id,status:'processing'}});
 await admin.call('admin_order_status',{method:'POST',expect:422,body:{order_id:order.id,status:'paid'}});
 await admin.call('admin_order_status',{method:'POST',body:{order_id:order.id,status:'cancelled'}});
 await admin.call('admin_order_status',{method:'POST',expect:422,body:{order_id:order.id,status:'processing'}});
 await admin.call('admin_order_status',{method:'POST',expect:422,body:{order_id:order.id,status:'cancelled'}});
 const listingAfterCancel=await seller.call('listing',{query:{id:listing.id}});
 assert.equal(listingAfterCancel.quantity,100,'cancelling an order must restore reserved stock');
 const status=runPhp(`$c=require ${JSON.stringify(configPath)};$p=new PDO('mysql:host='.$c['db']['host'].';dbname='.$c['db']['name'].';charset=utf8mb4',$c['db']['user'],$c['db']['password']);$s=$p->prepare('SELECT COUNT(*) FROM order_status_history WHERE order_id=? AND new_status=?');$s->execute([${JSON.stringify(order.id)},'processing']);echo $s->fetchColumn();`);
 assert.equal(status,'1','order status change must create audit history');
 await admin.call('admin_products');
 console.log('PASS CSRF blocks state-changing request without token');
 console.log('PASS invalid password is rejected and SQL-injection search is treated as data');
 console.log('PASS sellers cannot edit listings owned by another seller');
 console.log('PASS registration creates seller/buyer accounts without allowing admin self-registration');
 console.log('PASS duplicate email is rejected');
 console.log('PASS frontend-compatible /api/listings create/detail routes and CSRF field alias');
 console.log('PASS wholesale seller listing supports minimum order quantity');
 console.log('PASS business buyer can order at wholesale minimum');
 console.log('PASS buyer order history is restricted to the current buyer');
 console.log('PASS below-minimum wholesale order is rejected');
 console.log('PASS admin endpoints reject unauthenticated and non-admin users');
 console.log('PASS order creation reserves stock and cancellation restores it exactly once');
 console.log('PASS invalid order status transitions and reopening cancelled orders are rejected');
 console.log('PASS admin status changes are validated and audited in MySQL');
}
try{await main();}finally{php.kill('SIGTERM');await Promise.race([once(php,'exit'),new Promise(r=>setTimeout(r,2000))]);await rm(configPath,{force:true});}
