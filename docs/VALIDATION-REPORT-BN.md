# এই ZIP-এর যাচাই প্রতিবেদন

এই release তৈরির সময় চালানো হয়েছে:

- `node --check server.js` — সফল
- `node --check scripts/seo-audit.mjs` — সফল
- `node --check scripts/check-integrations.mjs` — সফল
- TypeScript/TSX parser syntax scan — ১০টি source file, syntax error নেই
- `npm run validate:catalog` — ১২ ক্যাটাগরি, ১০২ সাবক্যাটাগরি, ৬৪ জেলা OK
- ZIP integrity — release archive তৈরি হওয়ার পরে `unzip -t` চালিয়ে যাচাই করতে হবে

`npm install --no-audit --no-fund` এই পরিবেশে সময়সীমা অতিক্রম করেছে। ফলে `npm run build`, live database startup, gateway sandbox transaction, SMS delivery, courier sandbox shipment এবং live Google Search Console validation সম্পন্ন হয়েছে বলে দাবি করা হচ্ছে না। Deployment-এ এগুলো চালিয়ে যাচাই করতে হবে।

Live payment/SMS/courier integration credentials এই ZIP-এ অন্তর্ভুক্ত নেই; নিরাপত্তার কারণে merchant credentials নিজের `.env`/hosting secrets-এ দিতে হবে। Google organic traffic বা ranking নিশ্চিত করা সম্ভব নয়।
