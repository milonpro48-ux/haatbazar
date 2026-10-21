import fs from 'node:fs';
const required = ['SSLCOMMERZ_STORE_ID','SSLCOMMERZ_STORE_PASSWORD','SMS_API_URL','SMS_API_KEY','COURIER_API_URL','COURIER_API_KEY'];
const env = fs.existsSync('.env') ? fs.readFileSync('.env','utf8') : '';
const keys = new Map(env.split(/\r?\n/).filter(x=>/^\s*[A-Z0-9_]+=/.test(x)).map(x=>{const i=x.indexOf('=');return [x.slice(0,i).trim(),x.slice(i+1).trim()]}));
let missing=0;
for (const key of required) {
 const val=keys.get(key) || process.env[key] || '';
 const configured=!!val && !/^(replace-|your-|changeme|placeholder)/i.test(val);
 console.log(`${configured?'CONFIGURED':'NOT CONFIGURED'} ${key}`);
 if(!configured) missing++;
}
console.log('\nThis checks only whether credentials are present, not whether merchant approval or live API calls succeed.');
if(missing) console.log(`${missing} integration setting(s) need setup before live use.`);
