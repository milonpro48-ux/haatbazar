import { CATEGORIES, DISTRICTS } from "./data";

export const DISTRICT_SLUGS: Record<string, string> = {
  "ঢাকা":"dhaka","ফরিদপুর":"faridpur","গাজীপুর":"gazipur","গোপালগঞ্জ":"gopalganj","কিশোরগঞ্জ":"kishoreganj","মাদারীপুর":"madaripur","মানিকগঞ্জ":"manikganj","মুন্সিগঞ্জ":"munshiganj","নারায়ণগঞ্জ":"narayanganj","নরসিংদী":"narsingdi","রাজবাড়ী":"rajbari","শরীয়তপুর":"shariatpur","টাঙ্গাইল":"tangail",
  "ব্রাহ্মণবাড়িয়া":"brahmanbaria","চাঁদপুর":"chandpur","চট্টগ্রাম":"chattogram","কুমিল্লা":"cumilla","কক্সবাজার":"coxsbazar","ফেনী":"feni","খাগড়াছড়ি":"khagrachhari","লক্ষ্মীপুর":"lakshmipur","নোয়াখালী":"noakhali","রাঙামাটি":"rangamati","বান্দরবান":"bandarban",
  "বগুড়া":"bogura","জয়পুরহাট":"joypurhat","নওগাঁ":"naogaon","নাটোর":"natore","চাঁপাইনবাবগঞ্জ":"chapainawabganj","পাবনা":"pabna","রাজশাহী":"rajshahi","সিরাজগঞ্জ":"sirajganj",
  "হবিগঞ্জ":"habiganj","মৌলভীবাজার":"moulvibazar","সুনামগঞ্জ":"sunamganj","সিলেট":"sylhet","দিনাজপুর":"dinajpur","গাইবান্ধা":"gaibandha","কুড়িগ্রাম":"kurigram","লালমনিরহাট":"lalmonirhat","নীলফামারী":"nilphamari","পঞ্চগড়":"panchagarh","রংপুর":"rangpur","ঠাকুরগাঁও":"thakurgaon",
  "জামালপুর":"jamalpur","ময়মনসিংহ":"mymensingh","নেত্রকোনা":"netrokona","শেরপুর":"sherpur","বাগেরহাট":"bagerhat","চুয়াডাঙ্গা":"chuadanga","যশোর":"jashore","ঝিনাইদহ":"jhenaidah","খুলনা":"khulna","কুষ্টিয়া":"kushtia","মাগুরা":"magura","মেহেরপুর":"meherpur","নড়াইল":"narail","সাতক্ষীরা":"satkhira","বরগুনা":"barguna","বরিশাল":"barishal","ভোলা":"bhola","ঝালকাঠি":"jhalokati","পটুয়াখালী":"patuakhali","পিরোজপুর":"pirojpur"
};

export const SEO_CATEGORY_PAGES = CATEGORIES.map(c => ({
  path: `/category/${c.slug}`,
  title: `${c.label} কিনুন ও বিক্রি করুন | হাটবাজার`,
  description: `বাংলাদেশে ${c.label} খুচরা ও পাইকারি দামে খুঁজুন। নির্ভরযোগ্য বিক্রেতা, পণ্যের বিবরণ, লোকেশন ও সরাসরি যোগাযোগ—হাটবাজারে।`,
  keywords: [...c.keywords, `${c.label} বাংলাদেশ`, `${c.label} পাইকারি`, `${c.label} খুচরা`],
  subcategories: c.subcategories,
}));

export const SEO_DISTRICT_PAGES = DISTRICTS.map(d => ({
  path: `/district/${DISTRICT_SLUGS[d]}`,
  title: `${d} জেলার পণ্য কেনাবেচা ও পাইকারি সরবরাহকারী | হাটবাজার`,
  description: `${d} জেলার খুচরা ও পাইকারি পণ্য, স্থানীয় দোকান এবং সরবরাহকারী খুঁজুন। পণ্য ও বিক্রেতার অবস্থান মিলিয়ে সরাসরি যোগাযোগ করুন।`,
  keywords: [`${d} অনলাইন বাজার`, `${d} পণ্য কিনুন`, `${d} পাইকারি বাজার`, `${d} দোকান`, `${d} সরবরাহকারী`],
}));

export function productSeo(title: string, category: string, district: string, price: number) {
  return {
    title: `${title} দাম ${price} টাকা | ${district} | হাটবাজার`,
    description: `${district} থেকে ${title} কিনুন। ক্যাটাগরি: ${category}; প্রদর্শিত দাম ৳${price}। বিক্রেতার সাথে যোগাযোগ করে স্টক, ডেলিভারি ও চূড়ান্ত দাম নিশ্চিত করুন।`,
  };
}
