export type AdminUser = { id: string; name: string; role: string; status: string; contact: string };
export type SellerApplication = { id: string; name: string; person: string; status: "Pending" | "Approved" | "Rejected" };
export type AdminMetric = { id: string; label: string; value: string; delta: string };
export type AdminRole = { id: string; name: string; permissions: string[] };
export type AdminWorkspace = {
  metrics: AdminMetric[];
  users: AdminUser[];
  applications: SellerApplication[];
  roles: AdminRole[];
  accessRules: { id: string; label: string; enabled: boolean }[];
  securityLogs: { id: string; action: string; actor: string; detail: string }[];
  categories: { id: string; label: string; enabled: boolean }[];
};
export const DEFAULT_ADMIN_WORKSPACE: AdminWorkspace = {
  metrics: [
    {id:"revenue",label:"মোট রাজস্ব",value:"৳৮৯,৫৬,২০০",delta:"+১২.৪% this month"},
    {id:"users",label:"মোট ব্যবহারকারী",value:"১,২৪,৮৫০",delta:"+৮.৫% this week"},
    {id:"sellers",label:"নিবন্ধিত বিক্রেতা",value:"১২,৮০০",delta:"সক্রিয় বিক্রেতা"},
    {id:"pending",label:"মূলতুবি আবেদন",value:"৩",delta:"পর্যালোচনা প্রয়োজন"}
  ],
  users: [
    {id:"u1",name:"মোঃ রাকিব",role:"বিক্রেতা",status:"সক্রিয়",contact:"admin@gmail.com"},
    {id:"u2",name:"আশা খানম",role:"বিক্রেতা",status:"সক্রিয়",contact:"+880 1629-152161"},
    {id:"u3",name:"মোঃ কামরান",role:"ক্রেতা",status:"যাচাই",contact:"buyer@gmail.com"},
    {id:"u4",name:"সাবিনা আক্তার",role:"ক্রেতা",status:"যাচাই",contact:"seller@gmail.com"}
  ],
  applications: [
    {id:"a1",name:"নির্ভরযোগ্য ট্রেডার্স",person:"রাকিব হাসান",status:"Pending"},
    {id:"a2",name:"আশা ফ্যাশন",person:"আশা খানম",status:"Pending"},
    {id:"a3",name:"বগুড়া দই-মিষ্টি",person:"সাইফুল ইসলাম",status:"Pending"}
  ],
  roles: [
    {id:"super-admin",name:"Super Admin",permissions:["dashboard","users","vendors","reports","access","security","roles","categories","settings"]},
    {id:"editor",name:"Editor",permissions:["dashboard","categories","settings"]},
    {id:"viewer",name:"Read only",permissions:["dashboard","reports"]}
  ],
  accessRules: [
    {id:"seller-registration",label:"বিক্রেতার নিবন্ধন চালু",enabled:true},
    {id:"seller-listing",label:"বিক্রেতার পণ্য পোস্ট করার অনুমতি",enabled:true},
    {id:"buyer-orders",label:"ক্রেতার অর্ডার চালু",enabled:true},
    {id:"public-catalog",label:"পাবলিক ক্যাটালগ দেখানো",enabled:true},
    {id:"maintenance",label:"মেইনটেন্যান্স মোড",enabled:false}
  ],
  securityLogs: [
    {id:"log1",action:"বিক্রেতা যাচাই",actor:"Super Admin Demo",detail:"ডেমো ইভেন্ট"},
    {id:"log2",action:"পেমেন্ট পর্যালোচনা",actor:"Super Admin Demo",detail:"ডেমো ইভেন্ট"},
    {id:"log3",action:"ক্যাটাগরি আপডেট",actor:"Super Admin Demo",detail:"ডেমো ইভেন্ট"}
  ],
  categories: [
    {id:"agri",label:"কৃষি",enabled:true},
    {id:"clothes",label:"পোশাক",enabled:true},
    {id:"food",label:"খাদ্য",enabled:true},
    {id:"electronics",label:"ইলেকট্রনিক্স",enabled:false},
    {id:"livestock",label:"মাছ ও পশু",enabled:true}
  ]
};
const STORAGE_KEY = "haatbazar-admin-workspace-v1";
export function getAdminWorkspace(): AdminWorkspace {
  if (typeof window === "undefined") return DEFAULT_ADMIN_WORKSPACE;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_ADMIN_WORKSPACE;
    const parsed = JSON.parse(saved) as Partial<AdminWorkspace>;
    return {
      metrics: Array.isArray(parsed.metrics) ? parsed.metrics : DEFAULT_ADMIN_WORKSPACE.metrics,
      users: Array.isArray(parsed.users) ? parsed.users : DEFAULT_ADMIN_WORKSPACE.users,
      applications: Array.isArray(parsed.applications) ? parsed.applications : DEFAULT_ADMIN_WORKSPACE.applications,
      roles: Array.isArray(parsed.roles) ? parsed.roles : DEFAULT_ADMIN_WORKSPACE.roles,
      accessRules: Array.isArray(parsed.accessRules) ? parsed.accessRules : DEFAULT_ADMIN_WORKSPACE.accessRules,
      securityLogs: Array.isArray(parsed.securityLogs) ? parsed.securityLogs : DEFAULT_ADMIN_WORKSPACE.securityLogs,
      categories: Array.isArray(parsed.categories) ? parsed.categories : DEFAULT_ADMIN_WORKSPACE.categories
    };
  } catch { return DEFAULT_ADMIN_WORKSPACE; }
}
export function saveAdminWorkspace(value: AdminWorkspace): void {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}
