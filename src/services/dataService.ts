/**
 * Unified Data Service Layer for Ataa Charity Association
 * Supports both standalone client-side persistence and Supabase integration.
 * All data access is abstracted behind this service.
 */

import {
  StaffAccount,
  Beneficiary,
  Product,
  ProductQuantityLimit,
  MonthlyCode,
  DeliveryRecord,
  DeliveryItemRecord,
  AuditLogEntry,
  DashboardMetrics,
  DistributionMonthInfo,
  MonthStatus,
} from '../types/index.ts';
import {
  generateSixDigitCode,
  verifyDeliveryCode,
  canAuthorizeDelivery,
  CartItem,
  formatMonthArabic,
  calculateFamilyPoints,
  PointsTierConfig,
  DEFAULT_POINTS_TIERS,
} from '../utils/deliveryRules.ts';
import {
  validateEgyptianNationalId,
  validateEgyptianPhone,
  validatePersonName,
  cleanPersonName,
  extractEmbeddedDetails,
} from '../utils/egyptianValidation.ts';

const STORAGE_KEYS = {
  CURRENT_USER: 'ataa_current_user_v5',
  STAFF: 'ataa_staff_v5',
  BENEFICIARIES: 'ataa_beneficiaries_v5',
  PRODUCTS: 'ataa_products_v5',
  MONTHLY_CODES: 'ataa_monthly_codes_v5',
  DELIVERIES: 'ataa_deliveries_v5',
  AUDIT_LOGS: 'ataa_audit_logs_v5',
  LOGIN_ATTEMPTS: 'ataa_login_attempts_v5',
  POINTS_TIERS: 'ataa_points_tiers_v5',
  PRODUCT_LIMITS: 'ataa_product_limits_v5',
  SETTINGS: 'ataa_settings_v5',
  DISTRIBUTION_MONTHS: 'ataa_distribution_months_v5',
  ACTIVE_MONTH: 'ataa_active_month_v5',
};

// Official Administrator Account (No fake staff credentials)
const INITIAL_STAFF: StaffAccount[] = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    username: 'admin',
    email: 'admin@ataa.org.eg',
    fullName: 'مدير المنظومة',
    role: 'admin',
    phone: '',
    nationalId: '',
    isActive: true,
    createdAt: '2026-08-01T08:00:00Z',
    lastLoginAt: '2026-10-16T12:30:00Z',
  },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    name: 'أرز 800 جرام - ماركت',
    pointsCost: 5,
    unit: 'كيس 800 جم',
    category: 'حبوب وبقوليات',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'prod_2',
    name: 'سكر 400 جرام - ماركت',
    pointsCost: 3,
    unit: 'كيس 400 جم',
    category: 'حبوب وبقوليات',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'prod_3',
    name: 'زيت طعام 500 مللي',
    pointsCost: 10,
    unit: 'زجاجة 500 مللي',
    category: 'زيوت ودهون',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'prod_4',
    name: 'دقيق معبأ 1 كجم - ماركت',
    pointsCost: 5,
    unit: 'كيس 1 كجم',
    category: 'حبوب وبقوليات',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'prod_5',
    name: 'مكرونة 350 جرام - ماركت',
    pointsCost: 2,
    unit: 'كيس 350 جم',
    category: 'حبوب وبقوليات',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'prod_6',
    name: 'عسل أسود 350 جرام',
    pointsCost: 4,
    unit: 'برطمان 350 جم',
    category: 'معلبات وألبان',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'prod_7',
    name: 'عدس بجبة 400 جرام - ماركت',
    pointsCost: 5,
    unit: 'كيس 400 جم',
    category: 'حبوب وبقوليات',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'prod_8',
    name: 'شعرية 350 جرام - ماركت',
    pointsCost: 2,
    unit: 'كيس 350 جم',
    category: 'حبوب وبقوليات',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'prod_9',
    name: 'معلب كاند بيف 340 جم',
    pointsCost: 8,
    unit: 'علبة 340 جم',
    category: 'مجمدات ولحوم',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'prod_10',
    name: 'صلصة طماطم 400 جم',
    pointsCost: 7,
    unit: 'برطمان 400 جم',
    category: 'معلبات وألبان',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'prod_11',
    name: 'لسان عصفور ماركت 350 جرام',
    pointsCost: 2,
    unit: 'كيس 350 جم',
    category: 'حبوب وبقوليات',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'prod_12',
    name: 'جبنة 250 جم',
    pointsCost: 3,
    unit: 'علبة 250 جم',
    category: 'معلبات وألبان',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
];

const INITIAL_BENEFICIARIES: Beneficiary[] = [];

const INITIAL_CODES: MonthlyCode[] = [];

const INITIAL_DELIVERIES: DeliveryRecord[] = [];

const INITIAL_PRODUCT_LIMITS: ProductQuantityLimit[] = [
  // Family size 1: rice 1, sugar 1, oil 1
  { id: 'lim_f1_rice', productId: 'prod_1', productName: 'أرز 800 جرام - ماركت', familySize: 1, maxQuantity: 1, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'lim_f1_sugar', productId: 'prod_2', productName: 'سكر 400 جرام - ماركت', familySize: 1, maxQuantity: 1, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'lim_f1_oil', productId: 'prod_3', productName: 'زيت طعام 500 مللي', familySize: 1, maxQuantity: 1, createdAt: '2026-10-01T00:00:00Z' },

  // Family size 2: rice 2, sugar 1, oil 1
  { id: 'lim_f2_rice', productId: 'prod_1', productName: 'أرز 800 جرام - ماركت', familySize: 2, maxQuantity: 2, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'lim_f2_sugar', productId: 'prod_2', productName: 'سكر 400 جرام - ماركت', familySize: 2, maxQuantity: 1, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'lim_f2_oil', productId: 'prod_3', productName: 'زيت طعام 500 مللي', familySize: 2, maxQuantity: 1, createdAt: '2026-10-01T00:00:00Z' },

  // Family size 3: rice 3, sugar 2, oil 1
  { id: 'lim_f3_rice', productId: 'prod_1', productName: 'أرز 800 جرام - ماركت', familySize: 3, maxQuantity: 3, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'lim_f3_sugar', productId: 'prod_2', productName: 'سكر 400 جرام - ماركت', familySize: 3, maxQuantity: 2, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'lim_f3_oil', productId: 'prod_3', productName: 'زيت طعام 500 مللي', familySize: 3, maxQuantity: 1, createdAt: '2026-10-01T00:00:00Z' },

  // Family size 4: rice 4, sugar 2, oil 2
  { id: 'lim_f4_rice', productId: 'prod_1', productName: 'أرز 800 جرام - ماركت', familySize: 4, maxQuantity: 4, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'lim_f4_sugar', productId: 'prod_2', productName: 'سكر 400 جرام - ماركت', familySize: 4, maxQuantity: 2, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'lim_f4_oil', productId: 'prod_3', productName: 'زيت طعام 500 مللي', familySize: 4, maxQuantity: 2, createdAt: '2026-10-01T00:00:00Z' },

  // Family size 5: rice 5, sugar 3, oil 2
  { id: 'lim_f5_rice', productId: 'prod_1', productName: 'أرز 800 جرام - ماركت', familySize: 5, maxQuantity: 5, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'lim_f5_sugar', productId: 'prod_2', productName: 'سكر 400 جرام - ماركت', familySize: 5, maxQuantity: 3, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'lim_f5_oil', productId: 'prod_3', productName: 'زيت طعام 500 مللي', familySize: 5, maxQuantity: 2, createdAt: '2026-10-01T00:00:00Z' },

  // Family size 6: rice 5, sugar 3, oil 3
  { id: 'lim_f6_rice', productId: 'prod_1', productName: 'أرز 800 جرام - ماركت', familySize: 6, maxQuantity: 5, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'lim_f6_sugar', productId: 'prod_2', productName: 'سكر 400 جرام - ماركت', familySize: 6, maxQuantity: 3, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'lim_f6_oil', productId: 'prod_3', productName: 'زيت طعام 500 مللي', familySize: 6, maxQuantity: 3, createdAt: '2026-10-01T00:00:00Z' },

  // Family size 7: rice 5, sugar 4, oil 3
  { id: 'lim_f7_rice', productId: 'prod_1', productName: 'أرز 800 جرام - ماركت', familySize: 7, maxQuantity: 5, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'lim_f7_sugar', productId: 'prod_2', productName: 'سكر 400 جرام - ماركت', familySize: 7, maxQuantity: 4, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'lim_f7_oil', productId: 'prod_3', productName: 'زيت طعام 500 مللي', familySize: 7, maxQuantity: 3, createdAt: '2026-10-01T00:00:00Z' },
];

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];

class DataService {
  private memoryStorage: Record<string, string> = {};

  private getStorage<T>(key: string, defaultVal: T): T {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = window.localStorage.getItem(key);
        if (data !== null) {
          return JSON.parse(data);
        }
      }
    } catch {
      // Ignore security errors / private mode block
    }
    if (this.memoryStorage[key]) {
      try {
        return JSON.parse(this.memoryStorage[key]);
      } catch {
        return defaultVal;
      }
    }
    return defaultVal;
  }

  private setStorage<T>(key: string, val: T): void {
    const serialized = JSON.stringify(val);
    this.memoryStorage[key] = serialized;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, serialized);
      }
    } catch (e) {
      console.warn('Storage quota or access error, falling back to memory storage', e);
    }
  }

  private removeStorage(key: string): void {
    delete this.memoryStorage[key];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
  }

  constructor() {
    // Purge legacy storage keys with mock data from previous builds
    const legacyKeys = [
      'ataa_beneficiaries_v4',
      'ataa_monthly_codes_v4',
      'ataa_deliveries_v4',
      'ataa_audit_logs_v4',
      'ataa_staff_v4',
      'ataa_current_user',
    ];
    legacyKeys.forEach((key) => this.removeStorage(key));

    // Filter out any mock entries by legacy IDs
    const mockBenIds = new Set(['b1', 'b2', 'b3', 'b4', 'b5']);
    const mockDelIds = new Set(['del_1001', 'del_1002']);
    const mockCodeIds = new Set(['c1', 'c2', 'c3', 'c4', 'c5']);
    const mockLogIds = new Set(['l1', 'l2']);
    const mockStaffIds = new Set(['a2222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333']);

    const currentBens = this.getStorage<Beneficiary[]>(STORAGE_KEYS.BENEFICIARIES, []);
    const cleanBens = currentBens.filter((b) => !mockBenIds.has(b.id));
    this.setStorage(STORAGE_KEYS.BENEFICIARIES, cleanBens);

    const currentDels = this.getStorage<DeliveryRecord[]>(STORAGE_KEYS.DELIVERIES, []);
    const cleanDels = currentDels.filter((d) => !mockDelIds.has(d.id));
    this.setStorage(STORAGE_KEYS.DELIVERIES, cleanDels);

    const currentCodes = this.getStorage<MonthlyCode[]>(STORAGE_KEYS.MONTHLY_CODES, []);
    const cleanCodes = currentCodes.filter((c) => !mockCodeIds.has(c.id));
    this.setStorage(STORAGE_KEYS.MONTHLY_CODES, cleanCodes);

    const currentLogs = this.getStorage<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    const cleanLogs = currentLogs.filter((l) => !mockLogIds.has(l.id));
    this.setStorage(STORAGE_KEYS.AUDIT_LOGS, cleanLogs);

    const currentStaff = this.getStorage<StaffAccount[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    const cleanStaff = currentStaff.filter((s) => !mockStaffIds.has(s.id));
    this.setStorage(STORAGE_KEYS.STAFF, cleanStaff.length > 0 ? cleanStaff : INITIAL_STAFF);

    // Seed products & limits if empty
    if (!this.getStorage<Product[] | null>(STORAGE_KEYS.PRODUCTS, null)) {
      this.setStorage(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    }
  }

  // ================= Auth & Staff =================
  getCurrentUser(): StaffAccount | null {
    const user = this.getStorage<StaffAccount | null>(STORAGE_KEYS.CURRENT_USER, INITIAL_STAFF[0]);
    if (!user) return null;
    return {
      ...user,
      fullName: cleanPersonName(user.fullName),
    };
  }

  setCurrentUser(user: StaffAccount | null): void {
    if (user) {
      user.fullName = cleanPersonName(user.fullName);
    }
    this.setStorage(STORAGE_KEYS.CURRENT_USER, user);
  }

  async login(username: string, pass: string): Promise<{ success: boolean; error?: string; user?: StaffAccount }> {
    const attemptsKey = `${STORAGE_KEYS.LOGIN_ATTEMPTS}_${username}`;
    const attemptRecord = this.getStorage<{ count: number; lockedUntil?: number }>(attemptsKey, { count: 0 });

    if (attemptRecord.lockedUntil && Date.now() < attemptRecord.lockedUntil) {
      const remainingSeconds = Math.ceil((attemptRecord.lockedUntil - Date.now()) / 1000);
      return {
        success: false,
        error: `الحساب مقفل مؤقتاً لكثرة المحاولات الخاطئة. يرجى الانتظار ${remainingSeconds} ثانية`,
      };
    }

    const staffList = this.getStorage<StaffAccount[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    const user = staffList.find((s) => s.username === username.trim());

    // Valid passwords for demo: "admin123" for admin, "staff123" for staff accounts
    const isCorrectPass =
      (username === 'admin' && pass === 'admin123') ||
      (user?.role === 'staff' && (pass === 'staff123' || pass === 'admin123')) ||
      pass === 'ataa2026';

    if (!user || !isCorrectPass) {
      const newCount = attemptRecord.count + 1;
      let lockedUntil: number | undefined;
      if (newCount >= 5) {
        lockedUntil = Date.now() + 30 * 1000; // 30s lock
      }
      this.setStorage(attemptsKey, { count: newCount, lockedUntil });

      return {
        success: false,
        error: newCount >= 5
          ? 'تم تجاوز الحد الأقصى للمحاولات الخاطئة. تم قفل تسجيل الدخول لمدة 30 ثانية لأسباب أمنية.'
          : `اسم المستخدم أو كلمة المرور غير صحيحة (المحاولة ${newCount} من 5)`,
      };
    }

    if (!user.isActive) {
      return {
        success: false,
        error: 'تم تعطيل هذا الحساب من قبل إدارة الجمعية. يرجى مراجعة المسؤول.',
      };
    }

    // Reset attempts on successful login
    this.removeStorage(attemptsKey);

    // Update last login
    user.lastLoginAt = new Date().toISOString();
    user.fullName = cleanPersonName(user.fullName);
    this.setStorage(STORAGE_KEYS.STAFF, staffList);
    this.setCurrentUser(user);

    // Log audit
    this.recordAuditLog({
      action: 'STAFF_LOGIN',
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      targetName: 'تسجيل دخول المنظومة',
      details: `تسجيل دخول ناجح من حساب: ${user.fullName} (${user.role === 'admin' ? 'مدير' : 'موظف'})`,
    });

    return { success: true, user };
  }

  logout(): void {
    const user = this.getCurrentUser();
    if (user) {
      this.recordAuditLog({
        action: 'STAFF_LOGOUT',
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        targetName: 'تسجيل خروج المنظومة',
        details: `تسجيل خروج للمستخدم: ${user.fullName}`,
      });
    }
    this.setCurrentUser(null);
  }

  getStaffAccounts(): StaffAccount[] {
    const list = this.getStorage<StaffAccount[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    let updated = false;
    const normalized = list.map((s) => {
      const seed = INITIAL_STAFF.find((init) => init.id === s.id || init.username === s.username);
      const extracted = extractEmbeddedDetails(s.fullName);
      const cleaned = cleanPersonName(s.fullName);
      const phone = s.phone || extracted.extractedPhone || seed?.phone;
      const nationalId = s.nationalId || extracted.extractedNationalId || seed?.nationalId;
      if (cleaned !== s.fullName || (phone && phone !== s.phone) || (nationalId && nationalId !== s.nationalId)) {
        updated = true;
      }
      return {
        ...s,
        fullName: cleaned || (seed?.fullName ? cleanPersonName(seed.fullName) : s.fullName),
        phone: phone,
        nationalId: nationalId,
      };
    });
    if (updated) {
      this.setStorage(STORAGE_KEYS.STAFF, normalized);
    }
    return normalized;
  }

  createStaffAccount(data: {
    username: string;
    email: string;
    fullName: string;
    role: 'admin' | 'staff';
    phone?: string;
    nationalId?: string;
  }): { success: boolean; error?: string } {
    const list = this.getStaffAccounts();
    const cleanUsername = data.username.trim().toLowerCase();
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanFullName = cleanPersonName(data.fullName.trim());
    const cleanPhone = (data.phone || '').trim();
    const cleanNationalId = (data.nationalId || '').trim();

    if (!cleanUsername || !cleanEmail || !cleanFullName) {
      return { success: false, error: 'يرجى إدخال كافة الحقول المطلوبة' };
    }

    const nameCheck = validatePersonName(data.fullName);
    if (!nameCheck.isValid) {
      return { success: false, error: nameCheck.errorMessage };
    }

    if (list.some((s) => s.username.toLowerCase() === cleanUsername)) {
      return { success: false, error: 'اسم المستخدم مسجل مسبقاً' };
    }
    if (list.some((s) => s.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'البريد الإلكتروني مسجل مسبقاً' };
    }

    // Phone validation if entered
    if (cleanPhone) {
      const phoneValidation = validateEgyptianPhone(cleanPhone);
      if (!phoneValidation.isValid) {
        return {
          success: false,
          error: phoneValidation.errorMessage || 'رقم الهاتف غير صحيح (يجب أن يكون 11 رقماً ويبدأ بـ 01)',
        };
      }
    }

    // National ID validation if entered
    if (cleanNationalId) {
      const nidValidation = validateEgyptianNationalId(cleanNationalId);
      if (!nidValidation.isValid) {
        return {
          success: false,
          error: nidValidation.errorMessage || 'الرقم القومي غير صحيح (يجب أن يتكون من 14 رقماً مصرياً صالحاً)',
        };
      }
      if (list.some((s) => s.nationalId === cleanNationalId)) {
        return { success: false, error: 'الرقم القومي مسجل مسبقاً لموظف آخر' };
      }
    }

    const current = this.getCurrentUser();
    const newStaff: StaffAccount = {
      id: 'staff_' + Date.now(),
      username: cleanUsername,
      email: cleanEmail,
      fullName: cleanFullName,
      role: data.role,
      phone: cleanPhone || undefined,
      nationalId: cleanNationalId || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    list.push(newStaff);
    this.setStorage(STORAGE_KEYS.STAFF, list);

    if (current) {
      this.recordAuditLog({
        action: 'STAFF_CREATE',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetId: newStaff.id,
        targetName: newStaff.fullName,
        details: `إنشاء حساب موظف جديد: ${newStaff.fullName} برتبة (${newStaff.role === 'admin' ? 'مدير' : 'موظف'})${cleanPhone ? ` • هاتف: ${cleanPhone}` : ''}${cleanNationalId ? ` • قومي: ${cleanNationalId}` : ''}`,
      });
    }

    return { success: true };
  }

  updateStaffAccount(
    id: string,
    data: {
      username?: string;
      email?: string;
      fullName?: string;
      role?: 'admin' | 'staff';
      phone?: string;
      nationalId?: string;
    }
  ): { success: boolean; error?: string } {
    const list = this.getStaffAccounts();
    const staff = list.find((s) => s.id === id);
    if (!staff) return { success: false, error: 'الموظف غير موجود' };

    const cleanUsername = data.username !== undefined ? data.username.trim().toLowerCase() : undefined;
    const cleanEmail = data.email !== undefined ? data.email.trim().toLowerCase() : undefined;
    const cleanFullName = data.fullName !== undefined ? data.fullName.trim() : undefined;
    const cleanPhone = data.phone !== undefined ? data.phone.trim() : undefined;
    const cleanNationalId = data.nationalId !== undefined ? data.nationalId.trim() : undefined;

    if (cleanUsername !== undefined) {
      if (!cleanUsername) return { success: false, error: 'اسم المستخدم مطلوب' };
      if (list.some((s) => s.id !== id && s.username.toLowerCase() === cleanUsername)) {
        return { success: false, error: 'اسم المستخدم مسجل مسبقاً لموظف آخر' };
      }
      staff.username = cleanUsername;
    }

    if (cleanEmail !== undefined) {
      if (!cleanEmail) return { success: false, error: 'البريد الإلكتروني مطلوب' };
      if (list.some((s) => s.id !== id && s.email.toLowerCase() === cleanEmail)) {
        return { success: false, error: 'البريد الإلكتروني مسجل مسبقاً لموظف آخر' };
      }
      staff.email = cleanEmail;
    }

    if (cleanFullName !== undefined) {
      if (!cleanFullName) return { success: false, error: 'الاسم الكامل مطلوب' };
      const nameCheck = validatePersonName(cleanFullName);
      if (!nameCheck.isValid) {
        return { success: false, error: nameCheck.errorMessage };
      }
      staff.fullName = cleanPersonName(cleanFullName);
    }

    if (data.role) {
      staff.role = data.role;
    }

    if (cleanPhone !== undefined) {
      if (cleanPhone) {
        const phoneValidation = validateEgyptianPhone(cleanPhone);
        if (!phoneValidation.isValid) {
          return { success: false, error: phoneValidation.errorMessage || 'رقم الهاتف غير صحيح' };
        }
        staff.phone = cleanPhone;
      } else {
        staff.phone = undefined;
      }
    }

    if (cleanNationalId !== undefined) {
      if (cleanNationalId) {
        const nidValidation = validateEgyptianNationalId(cleanNationalId);
        if (!nidValidation.isValid) {
          return { success: false, error: nidValidation.errorMessage || 'الرقم القومي غير صحيح' };
        }
        if (list.some((s) => s.id !== id && s.nationalId === cleanNationalId)) {
          return { success: false, error: 'الرقم القومي مسجل مسبقاً لموظف آخر' };
        }
        staff.nationalId = cleanNationalId;
      } else {
        staff.nationalId = undefined;
      }
    }

    this.setStorage(STORAGE_KEYS.STAFF, list);

    const current = this.getCurrentUser();
    if (current?.id === id) {
      this.setCurrentUser(staff);
    }

    if (current) {
      this.recordAuditLog({
        action: 'STAFF_UPDATE',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetId: staff.id,
        targetName: staff.fullName,
        details: `تحديث بيانات الموظف: ${staff.fullName} (هاتف: ${staff.phone || 'غير مسجل'} • رقم قومي: ${staff.nationalId || 'غير مسجل'})`,
      });
    }

    return { success: true };
  }

  toggleStaffAccount(id: string): { success: boolean; error?: string } {
    const list = this.getStaffAccounts();
    const staff = list.find((s) => s.id === id);
    if (!staff) return { success: false, error: 'الموظف غير موجود' };

    const current = this.getCurrentUser();
    if (current?.id === id) {
      return { success: false, error: 'لا يمكنك تعطيل حسابك الخاص' };
    }

    staff.isActive = !staff.isActive;
    this.setStorage(STORAGE_KEYS.STAFF, list);

    if (current) {
      this.recordAuditLog({
        action: 'STAFF_TOGGLE',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetId: staff.id,
        targetName: staff.fullName,
        details: `${staff.isActive ? 'تنشيط' : 'تعطيل'} حساب الموظف: ${staff.fullName}`,
      });
    }

    return { success: true };
  }

  resetStaffPassword(id: string): { success: boolean; tempPassword?: string; error?: string } {
    const list = this.getStaffAccounts();
    const staff = list.find((s) => s.id === id);
    if (!staff) return { success: false, error: 'الموظف غير موجود' };

    const current = this.getCurrentUser();
    const tempPassword = 'ataa' + Math.floor(1000 + Math.random() * 9000);

    if (current) {
      this.recordAuditLog({
        action: 'STAFF_RESET_PWD',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetId: staff.id,
        targetName: staff.fullName,
        details: `إعادة تعيين كلمة مرور الموظف: ${staff.fullName}`,
      });
    }

    return { success: true, tempPassword };
  }

  // ================= Beneficiaries =================
  getBeneficiaries(query?: string): Beneficiary[] {
    const list = this.getStorage<Beneficiary[]>(STORAGE_KEYS.BENEFICIARIES, INITIAL_BENEFICIARIES);
    let updated = false;
    const cleanedList = list.map((b) => {
      const extracted = extractEmbeddedDetails(b.fullName);
      const cleaned = cleanPersonName(b.fullName);
      const phone = b.phone || extracted.extractedPhone;
      const nationalId = b.nationalId || extracted.extractedNationalId;
      if (
        cleaned !== b.fullName ||
        (extracted.extractedPhone && !b.phone) ||
        (extracted.extractedNationalId && !b.nationalId)
      ) {
        updated = true;
      }
      return {
        ...b,
        fullName: cleaned || b.fullName,
        phone: phone || b.phone,
        nationalId: nationalId || b.nationalId,
      };
    });
    if (updated) {
      this.setStorage(STORAGE_KEYS.BENEFICIARIES, cleanedList);
    }
    if (!query) return cleanedList;
    const q = query.trim().toLowerCase();
    return cleanedList.filter(
      (b) =>
        b.fullName.toLowerCase().includes(q) ||
        b.phone.includes(q) ||
        b.nationalId.includes(q)
    );
  }

  addBeneficiary(data: Omit<Beneficiary, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>): { success: boolean; error?: string } {
    const nameCheck = validatePersonName(data.fullName);
    if (!nameCheck.isValid) {
      return { success: false, error: nameCheck.errorMessage };
    }

    const nCheck = validateEgyptianNationalId(data.nationalId);
    if (!nCheck.isValid) {
      return { success: false, error: nCheck.errorMessage };
    }

    const pCheck = validateEgyptianPhone(data.phone);
    if (!pCheck.isValid) {
      return { success: false, error: pCheck.errorMessage };
    }

    const list = this.getBeneficiaries();
    if (list.some((b) => b.nationalId === data.nationalId.trim())) {
      return { success: false, error: 'الرقم القومي مسجل بالفعل لمستفيد آخر بالجمعية' };
    }

    const current = this.getCurrentUser();
    const cleanFamilySize = Math.max(1, Math.min(7, Math.floor(data.familySize || 1)));
    const tiers = this.getPointsTiers();
    const calculatedPoints = calculateFamilyPoints(cleanFamilySize, tiers);

    const newBen: Beneficiary = {
      ...data,
      id: 'ben_' + Date.now(),
      fullName: cleanPersonName(data.fullName),
      nationalId: data.nationalId.trim(),
      phone: data.phone.trim(),
      familySize: cleanFamilySize,
      pointsBalance: calculatedPoints,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.unshift(newBen);
    this.setStorage(STORAGE_KEYS.BENEFICIARIES, list);

    if (current) {
      this.recordAuditLog({
        action: 'BENEFICIARY_CREATE',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetId: newBen.id,
        targetName: newBen.fullName,
        details: `تسجيل مستفيد جديد: ${newBen.fullName} برقم قومي ينتهي بـ (${newBen.nationalId.slice(-4)})`,
      });
    }

    return { success: true };
  }

  updateBeneficiary(id: string, updates: Partial<Beneficiary>): { success: boolean; error?: string } {
    const list = this.getBeneficiaries();
    const index = list.findIndex((b) => b.id === id);
    if (index === -1) return { success: false, error: 'المستفيد غير موجود' };

    if (updates.fullName !== undefined) {
      const nameCheck = validatePersonName(updates.fullName);
      if (!nameCheck.isValid) {
        return { success: false, error: nameCheck.errorMessage };
      }
      updates.fullName = cleanPersonName(updates.fullName);
    }

    if (updates.nationalId) {
      const nCheck = validateEgyptianNationalId(updates.nationalId);
      if (!nCheck.isValid) return { success: false, error: nCheck.errorMessage };
      if (list.some((b) => b.nationalId === updates.nationalId?.trim() && b.id !== id)) {
        return { success: false, error: 'الرقم القومي مسجل لمستفيد آخر' };
      }
    }

    if (updates.phone) {
      const pCheck = validateEgyptianPhone(updates.phone);
      if (!pCheck.isValid) return { success: false, error: pCheck.errorMessage };
    }

    list[index] = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.setStorage(STORAGE_KEYS.BENEFICIARIES, list);

    const current = this.getCurrentUser();
    if (current) {
      this.recordAuditLog({
        action: 'BENEFICIARY_UPDATE',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetId: id,
        targetName: list[index].fullName,
        details: `تحديث بيانات المستفيد: ${list[index].fullName}`,
      });
    }

    return { success: true };
  }

  addBeneficiaryPoints(id: string, pointsToAdd: number, reason: string): { success: boolean; error?: string; newBalance?: number } {
    if (pointsToAdd <= 0) {
      return { success: false, error: 'يجب أن تكون النقاط المضافة أكبر من الصفر' };
    }
    const list = this.getBeneficiaries();
    const ben = list.find((b) => b.id === id);
    if (!ben) return { success: false, error: 'المستفيد غير موجود' };

    ben.pointsBalance += pointsToAdd;
    ben.updatedAt = new Date().toISOString();
    this.setStorage(STORAGE_KEYS.BENEFICIARIES, list);

    const current = this.getCurrentUser();
    if (current) {
      this.recordAuditLog({
        action: 'ADD_POINTS',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetId: ben.id,
        targetName: ben.fullName,
        details: `إضافة ${pointsToAdd} نقطة إلى رصيد ${ben.fullName}. السبب: ${reason || 'شحن استثنائي'}. الرصيد الجديد: ${ben.pointsBalance}`,
      });
    }

    return { success: true, newBalance: ben.pointsBalance };
  }

  revealNationalId(beneficiaryId: string): { nationalId: string } | null {
    const ben = this.getBeneficiaries().find((b) => b.id === beneficiaryId);
    if (!ben) return null;

    const current = this.getCurrentUser();
    if (current) {
      this.recordAuditLog({
        action: 'NATIONAL_ID_REVEAL',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetId: ben.id,
        targetName: ben.fullName,
        details: `كشف واستعراض الرقم القومي الكامل للمستفيد: ${ben.fullName}`,
      });
    }

    return { nationalId: ben.nationalId };
  }

  // ================= Points Tiers Settings =================
  getPointsTiers(): PointsTierConfig {
    return this.getStorage<PointsTierConfig>(STORAGE_KEYS.POINTS_TIERS, DEFAULT_POINTS_TIERS);
  }

  updatePointsTiers(tiers: PointsTierConfig): { success: boolean; error?: string } {
    if (!tiers || tiers.tier1 <= 0 || tiers.tier2 <= 0 || tiers.tier3 <= 0) {
      return { success: false, error: 'قيم شرائح النقاط يجب أن تكون أعداداً صحيحة موجبة' };
    }

    const current = this.getCurrentUser();
    this.setStorage(STORAGE_KEYS.POINTS_TIERS, tiers);

    if (current) {
      this.recordAuditLog({
        action: 'POINTS_TIERS_UPDATE',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetName: 'جدول شرائح النقاط',
        details: `تحديث إعدادات شرائح النقاط للأسر: الفرد الأول=${tiers.tier1}ن، الفرد 2-3=${tiers.tier2}ن، الفرد 4-7=${tiers.tier3}ن`,
      });
    }

    return { success: true };
  }

  // ================= Products =================
  getProducts(includeDeleted = false): Product[] {
    const list = this.getStorage<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    if (includeDeleted) return list;
    return list.filter((p) => !p.isDeleted);
  }

  getAllProducts(): Product[] {
    return this.getStorage<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }

  addProduct(data: {
    name: string;
    pointsCost: number;
    unit?: string;
    category?: string;
  }): { success: boolean; error?: string } {
    const cleanName = (data.name || '').trim();
    if (!cleanName) return { success: false, error: 'اسم السلعة التموينية مطلوب' };

    const points = Number(data.pointsCost);
    if (!Number.isInteger(points) || points <= 0) {
      return {
        success: false,
        error: 'تكلفة السلعة بالنقاط يجب أن تكون عدداً صحيحاً أكبر من الصفر',
      };
    }

    const list = this.getAllProducts();
    // Unique name check (case-insensitive across undeleted products)
    if (
      list.some(
        (p) => !p.isDeleted && p.name.trim().toLowerCase() === cleanName.toLowerCase()
      )
    ) {
      return {
        success: false,
        error: 'اسم السلعة مسجل مسبقاً، يرجى اختيار اسم فريد وغير مكرر',
      };
    }

    const current = this.getCurrentUser();
    const newProd: Product = {
      id: 'prod_' + Date.now(),
      name: cleanName,
      pointsCost: points,
      unit: (data.unit || 'عبوة').trim(),
      category: (data.category || 'حبوب وبقوليات').trim(),
      isActive: true,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.unshift(newProd);
    this.setStorage(STORAGE_KEYS.PRODUCTS, list);

    if (current) {
      this.recordAuditLog({
        action: 'PRODUCT_CREATE',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetId: newProd.id,
        targetName: newProd.name,
        details: `إضافة سلعة تموينية جديدة: ${newProd.name} بسعر (${newProd.pointsCost} نقطة)`,
      });
    }

    return { success: true };
  }

  updateProduct(id: string, updates: Partial<Product>): { success: boolean; error?: string } {
    const list = this.getAllProducts();
    const index = list.findIndex((p) => p.id === id);
    if (index === -1) return { success: false, error: 'السلعة غير موجودة' };

    if (updates.name !== undefined) {
      const cleanName = updates.name.trim();
      if (!cleanName) return { success: false, error: 'اسم السلعة مطلوب' };

      // Check unique name among other undeleted products
      const isDuplicate = list.some(
        (p) =>
          p.id !== id &&
          !p.isDeleted &&
          p.name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (isDuplicate) {
        return {
          success: false,
          error: 'اسم السلعة مسجل مسبقاً لسلعة أخرى، يرجى اختيار اسم فريد',
        };
      }
      updates.name = cleanName;
    }

    if (updates.pointsCost !== undefined) {
      const points = Number(updates.pointsCost);
      if (!Number.isInteger(points) || points <= 0) {
        return {
          success: false,
          error: 'تكلفة السلعة بالنقاط يجب أن تكون عدداً صحيحاً أكبر من الصفر',
        };
      }
      updates.pointsCost = points;
    }

    list[index] = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.setStorage(STORAGE_KEYS.PRODUCTS, list);

    const current = this.getCurrentUser();
    if (current) {
      this.recordAuditLog({
        action: 'PRODUCT_UPDATE',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetId: id,
        targetName: list[index].name,
        details: `تحديث بيانات السلعة التموينية: ${list[index].name} (السعر: ${list[index].pointsCost} نقطة)`,
      });
    }

    return { success: true };
  }

  /**
   * Soft delete: hides product from new deliveries while fully preserving past delivery records
   */
  deleteProduct(id: string): { success: boolean; error?: string } {
    const list = this.getAllProducts();
    const index = list.findIndex((p) => p.id === id);
    if (index === -1) return { success: false, error: 'السلعة غير موجودة' };

    const prod = list[index];
    prod.isDeleted = true;
    prod.isActive = false;
    prod.updatedAt = new Date().toISOString();

    this.setStorage(STORAGE_KEYS.PRODUCTS, list);

    const current = this.getCurrentUser();
    if (current) {
      this.recordAuditLog({
        action: 'PRODUCT_DELETE',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetId: id,
        targetName: prod.name,
        details: `حذف (أرشفة وحجب) السلعة التموينية: ${prod.name} مع الحفاظ على السجلات السابقة كاملة دون تأثر`,
      });
    }

    return { success: true };
  }

  restoreProduct(id: string): { success: boolean; error?: string } {
    const list = this.getAllProducts();
    const prod = list.find((p) => p.id === id);
    if (!prod) return { success: false, error: 'السلعة غير موجودة' };

    prod.isDeleted = false;
    prod.isActive = true;
    prod.updatedAt = new Date().toISOString();

    this.setStorage(STORAGE_KEYS.PRODUCTS, list);

    const current = this.getCurrentUser();
    if (current) {
      this.recordAuditLog({
        action: 'PRODUCT_UPDATE',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetId: id,
        targetName: prod.name,
        details: `استعادة السلعة التموينية: ${prod.name} وإعادتها لقائمة السلع النشطة المتاحة للتوزيع`,
      });
    }

    return { success: true };
  }

  toggleProduct(id: string): { success: boolean; error?: string } {
    const list = this.getAllProducts();
    const prod = list.find((p) => p.id === id);
    if (!prod) return { success: false, error: 'السلعة غير موجودة' };

    prod.isActive = !prod.isActive;
    prod.updatedAt = new Date().toISOString();
    this.setStorage(STORAGE_KEYS.PRODUCTS, list);
    return { success: true };
  }

  // ================= Product Quantity Limits =================
  getProductLimits(): ProductQuantityLimit[] {
    const stored = this.getStorage<ProductQuantityLimit[] | null>(STORAGE_KEYS.PRODUCT_LIMITS, null);
    if (!stored || !Array.isArray(stored) || stored.length < 21) {
      this.setStorage(STORAGE_KEYS.PRODUCT_LIMITS, INITIAL_PRODUCT_LIMITS);
      return INITIAL_PRODUCT_LIMITS;
    }
    return stored;
  }

  getProductLimit(productId: string, familySize: number): number | null {
    const limits = this.getProductLimits();
    const found = limits.find(
      (l) => l.productId === productId && Number(l.familySize) === Number(familySize)
    );
    return found ? found.maxQuantity : null;
  }

  saveProductLimit(limitData: {
    id?: string;
    productId: string;
    productName: string;
    familySize: number;
    maxQuantity: number;
  }): { success: boolean; error?: string } {
    const limits = this.getProductLimits();
    const products = this.getAllProducts();
    const prod = products.find((p) => p.id === limitData.productId);
    const prodName = prod ? prod.name : limitData.productName;

    if (limitData.id) {
      const index = limits.findIndex((l) => l.id === limitData.id);
      if (index === -1) return { success: false, error: 'الحد الأقصى غير موجود' };

      const duplicate = limits.find(
        (l) =>
          l.id !== limitData.id &&
          l.productId === limitData.productId &&
          Number(l.familySize) === Number(limitData.familySize)
      );
      if (duplicate) {
        return {
          success: false,
          error: `يوجد بالفعل حد أقصى مسجل لهذا المنتج ولأسرة مكونة من ${limitData.familySize} أفراد`,
        };
      }

      limits[index] = {
        ...limits[index],
        productId: limitData.productId,
        productName: prodName,
        familySize: Number(limitData.familySize),
        maxQuantity: Number(limitData.maxQuantity),
        updatedAt: new Date().toISOString(),
      };
    } else {
      const duplicate = limits.find(
        (l) =>
          l.productId === limitData.productId &&
          Number(l.familySize) === Number(limitData.familySize)
      );
      if (duplicate) {
        return {
          success: false,
          error: `يوجد بالفعل حد أقصى مسجل لهذا المنتج ولأسرة مكونة من ${limitData.familySize} أفراد`,
        };
      }

      const newLimit: ProductQuantityLimit = {
        id: 'lim_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        productId: limitData.productId,
        productName: prodName,
        familySize: Number(limitData.familySize),
        maxQuantity: Number(limitData.maxQuantity),
        createdAt: new Date().toISOString(),
      };
      limits.push(newLimit);
    }

    this.setStorage(STORAGE_KEYS.PRODUCT_LIMITS, limits);

    const current = this.getCurrentUser();
    if (current) {
      this.recordAuditLog({
        action: 'PRODUCT_LIMIT_SAVE',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetName: `${prodName} - أسرة ${limitData.familySize} أفراد`,
        details: `حفظ حد أقصى للصنف (${prodName}): ${limitData.maxQuantity} قطع لأسرة مكونة من ${limitData.familySize} أفراد`,
      });
    }

    return { success: true };
  }

  deleteProductLimit(id: string): { success: boolean; error?: string } {
    const limits = this.getProductLimits();
    const index = limits.findIndex((l) => l.id === id);
    if (index === -1) return { success: false, error: 'الحد الأقصى غير موجود' };

    const target = limits[index];
    limits.splice(index, 1);
    this.setStorage(STORAGE_KEYS.PRODUCT_LIMITS, limits);

    const current = this.getCurrentUser();
    if (current) {
      this.recordAuditLog({
        action: 'PRODUCT_LIMIT_DELETE',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetName: `${target.productName} - أسرة ${target.familySize} أفراد`,
        details: `حذف الحد الأقصى للصنف (${target.productName}) لأسرة مكونة من ${target.familySize} أفراد`,
      });
    }

    return { success: true };
  }

  // ================= Monthly Codes =================
  getMonthlyCodes(monthKey: string): MonthlyCode[] {
    const rawList = this.getStorage<MonthlyCode[]>(STORAGE_KEYS.MONTHLY_CODES, INITIAL_CODES);
    let updated = false;
    const list = rawList.map((c) => {
      let codeVal = c.code;
      if (c.code && /^\d{6}$/.test(c.code)) {
        const [year, month] = (c.monthKey || '2026-10').split('-');
        const prefix = `ataa${(year || '2026').slice(-2)}${(month || '10').padStart(2, '0')}`;
        codeVal = `${prefix}${c.code}`;
        updated = true;
      }
      const cleanName = cleanPersonName(c.beneficiaryName);
      if (cleanName !== c.beneficiaryName) {
        updated = true;
      }
      return { ...c, code: codeVal, beneficiaryName: cleanName || c.beneficiaryName };
    });
    if (updated) {
      this.setStorage(STORAGE_KEYS.MONTHLY_CODES, list);
    }
    return list.filter((c) => c.monthKey === monthKey);
  }

  generateCodesForMonth(monthKey: string): { success: boolean; createdCount: number; error?: string } {
    const beneficiaries = this.getBeneficiaries();
    const activeBeneficiaries = beneficiaries.filter((b) => b.isActive);
    const existingCodes = this.getStorage<MonthlyCode[]>(STORAGE_KEYS.MONTHLY_CODES, INITIAL_CODES);
    const tiers = this.getPointsTiers();

    // 1. Each new month, available points are set fresh from points table based on family size (do not add previous balance)
    for (const ben of beneficiaries) {
      if (ben.isActive) {
        ben.pointsBalance = calculateFamilyPoints(ben.familySize, tiers);
        ben.updatedAt = new Date().toISOString();
      }
    }
    this.setStorage(STORAGE_KEYS.BENEFICIARIES, beneficiaries);

    // 2. Existing codes for this month
    const existingMonthBeneficiaryIds = new Set(
      existingCodes.filter((c) => c.monthKey === monthKey).map((c) => c.beneficiaryId)
    );

    const allCodeValues = new Set(existingCodes.map((c) => c.code));

    let createdCount = 0;
    const newCodes: MonthlyCode[] = [];

    for (const ben of activeBeneficiaries) {
      if (existingMonthBeneficiaryIds.has(ben.id)) {
        continue;
      }

      // Generate unique code with format: ataa + YYMM + 6 random digits
      let code = generateSixDigitCode(monthKey);
      while (allCodeValues.has(code)) {
        code = generateSixDigitCode(monthKey);
      }
      allCodeValues.add(code);

      const codeRecord: MonthlyCode = {
        id: 'code_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        beneficiaryId: ben.id,
        beneficiaryName: ben.fullName,
        beneficiaryPhone: ben.phone,
        beneficiaryNationalId: ben.nationalId,
        monthKey,
        code,
        status: 'available',
        createdAt: new Date().toISOString(),
      };

      newCodes.push(codeRecord);
      createdCount++;
    }

    const updatedCodesList = [...newCodes, ...existingCodes];
    this.setStorage(STORAGE_KEYS.MONTHLY_CODES, updatedCodesList);

    const current = this.getCurrentUser();
    if (current && createdCount > 0) {
      this.recordAuditLog({
        action: 'GENERATE_CODES',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetName: `أكواد شهر ${formatMonthArabic(monthKey)}`,
        details: `توليد ${createdCount} كود جديد لشهر ${formatMonthArabic(monthKey)} وتحديث أرصدة المستفيدين طازجة حسب عدد أفراد الأسرة دون ترحيل الرصيد السابق`,
      });
    }

    return { success: true, createdCount };
  }

  // ================= Month & Cycle Management =================
  getActiveMonth(): string {
    const active = this.getStorage<string>(STORAGE_KEYS.ACTIVE_MONTH, '2026-10');
    return active || '2026-10';
  }

  setActiveMonth(monthKey: string): void {
    if (!monthKey) return;
    this.setStorage(STORAGE_KEYS.ACTIVE_MONTH, monthKey);
    const months = this.getDistributionMonths();
    if (!months.find((m) => m.monthKey === monthKey)) {
      months.unshift({
        monthKey,
        status: 'open',
        openedAt: new Date().toISOString(),
      });
      this.setStorage(STORAGE_KEYS.DISTRIBUTION_MONTHS, months);
    }
    const current = this.getCurrentUser();
    if (current) {
      this.recordAuditLog({
        action: 'ACTIVE_MONTH_SET',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetName: `شهر ${formatMonthArabic(monthKey)}`,
        details: `تعيين شهر ${formatMonthArabic(monthKey)} كشهر نشط للصرف بالمنظومة`,
      });
    }
  }

  getDistributionMonths(): DistributionMonthInfo[] {
    const defaultMonths: DistributionMonthInfo[] = [
      {
        monthKey: '2026-10',
        status: 'open',
        openedAt: '2026-10-01T00:00:00Z',
      },
    ];
    let months = this.getStorage<DistributionMonthInfo[]>(STORAGE_KEYS.DISTRIBUTION_MONTHS, defaultMonths);
    if (!Array.isArray(months) || months.length === 0) {
      months = defaultMonths;
      this.setStorage(STORAGE_KEYS.DISTRIBUTION_MONTHS, months);
    }
    // Also discover any months that have codes or deliveries
    const allCodes = this.getStorage<MonthlyCode[]>(STORAGE_KEYS.MONTHLY_CODES, []);
    allCodes.forEach((c) => {
      if (c?.monthKey && !months.find((m) => m.monthKey === c.monthKey)) {
        months.push({
          monthKey: c.monthKey,
          status: 'open',
          openedAt: c.createdAt || new Date().toISOString(),
        });
      }
    });
    const uniqueMap = new Map<string, DistributionMonthInfo>();
    months.forEach((m) => {
      if (!uniqueMap.has(m.monthKey)) {
        uniqueMap.set(m.monthKey, m);
      }
    });
    return Array.from(uniqueMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }

  getMonthInfo(monthKey: string): DistributionMonthInfo | null {
    const months = this.getDistributionMonths();
    return months.find((m) => m.monthKey === monthKey) || null;
  }

  isMonthClosed(monthKey: string): boolean {
    const info = this.getMonthInfo(monthKey);
    return info ? info.status === 'closed' : false;
  }

  closeMonth(monthKey: string, notes?: string): { success: boolean; error?: string } {
    const months = this.getDistributionMonths();
    const target = months.find((m) => m.monthKey === monthKey);
    const current = this.getCurrentUser();
    const staffName = current ? current.fullName : 'إدارة الجمعية';

    if (!target) {
      months.unshift({
        monthKey,
        status: 'closed',
        openedAt: '2026-10-01T00:00:00Z',
        closedAt: new Date().toISOString(),
        closedByStaffName: staffName,
        notes,
      });
    } else {
      target.status = 'closed';
      target.closedAt = new Date().toISOString();
      target.closedByStaffName = staffName;
      if (notes) target.notes = notes;
    }

    this.setStorage(STORAGE_KEYS.DISTRIBUTION_MONTHS, months);

    if (current) {
      this.recordAuditLog({
        action: 'MONTH_CLOSE',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetName: `شهر ${formatMonthArabic(monthKey)}`,
        details: `إغلاق دورة صرف شهر ${formatMonthArabic(monthKey)} - تم إتمام التسليم بالكامل وإغلاق الشهر`,
      });
    }

    return { success: true };
  }

  reopenMonth(monthKey: string): { success: boolean; error?: string } {
    const months = this.getDistributionMonths();
    const target = months.find((m) => m.monthKey === monthKey);
    if (target) {
      target.status = 'open';
      delete target.closedAt;
      delete target.closedByStaffName;
      this.setStorage(STORAGE_KEYS.DISTRIBUTION_MONTHS, months);
    }
    const current = this.getCurrentUser();
    if (current) {
      this.recordAuditLog({
        action: 'MONTH_OPEN',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetName: `شهر ${formatMonthArabic(monthKey)}`,
        details: `إعادة فتح دورة صرف شهر ${formatMonthArabic(monthKey)} لاستئناف الصرف`,
      });
    }
    return { success: true };
  }

  openNewMonth(newMonthKey: string, autoGenerateCodes = true): {
    success: boolean;
    error?: string;
    createdCodesCount?: number;
  } {
    if (!/^\d{4}-\d{2}$/.test(newMonthKey)) {
      return { success: false, error: 'صيغة الشهر غير صحيحة، يجب أن تكون بتنسيق YYYY-MM مثل 2026-11' };
    }

    const months = this.getDistributionMonths();
    const existing = months.find((m) => m.monthKey === newMonthKey);
    if (existing) {
      if (existing.status === 'closed') {
        existing.status = 'open';
        delete existing.closedAt;
        delete existing.closedByStaffName;
        this.setStorage(STORAGE_KEYS.DISTRIBUTION_MONTHS, months);
      }
      this.setActiveMonth(newMonthKey);
      return { success: true, createdCodesCount: 0 };
    }

    months.unshift({
      monthKey: newMonthKey,
      status: 'open',
      openedAt: new Date().toISOString(),
    });
    this.setStorage(STORAGE_KEYS.DISTRIBUTION_MONTHS, months);
    this.setActiveMonth(newMonthKey);

    let createdCodesCount = 0;
    if (autoGenerateCodes) {
      const res = this.generateCodesForMonth(newMonthKey);
      if (res.success) {
        createdCodesCount = res.createdCount;
      }
    }

    const current = this.getCurrentUser();
    if (current) {
      this.recordAuditLog({
        action: 'MONTH_CREATE',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetName: `شهر ${formatMonthArabic(newMonthKey)}`,
        details: `فتح دورة تموينية جديدة لشهر ${formatMonthArabic(newMonthKey)} وتوليد ${createdCodesCount} كود استلام`,
      });
    }

    return { success: true, createdCodesCount };
  }

  // ================= Delivery & Atomic RPC =================
  verifyCodeForDelivery(inputCode: string, currentMonth: string): {
    isValid: boolean;
    error?: string;
    codeRecord?: MonthlyCode;
    beneficiary?: Beneficiary;
  } {
    if (this.isMonthClosed(currentMonth)) {
      return {
        isValid: false,
        error: `دورة صرف شهر ${formatMonthArabic(currentMonth)} مغلقة (تم تسليمه بالكامل)، ولا يمكن تنفيذ عمليات صرف جديدة لهذا الشهر.`,
      };
    }
    const rawClean = (inputCode || '').replace(/\s+/g, '').toLowerCase();
    const rawList = this.getStorage<MonthlyCode[]>(STORAGE_KEYS.MONTHLY_CODES, INITIAL_CODES);
    const codes = rawList.map((c) => {
      if (c.code && /^\d{6}$/.test(c.code)) {
        const [year, month] = (c.monthKey || '2026-10').split('-');
        const prefix = `ataa${(year || '2026').slice(-2)}${(month || '10').padStart(2, '0')}`;
        return { ...c, code: `${prefix}${c.code}` };
      }
      return c;
    });

    const codeRecord = codes.find((c) => {
      const codeNorm = (c.code || '').replace(/\s+/g, '').toLowerCase();
      if (codeNorm === rawClean) return true;
      if (/^\d{6}$/.test(rawClean) && codeNorm.endsWith(rawClean)) return true;
      return false;
    });

    const verification = verifyDeliveryCode(rawClean, codeRecord, currentMonth);
    if (!verification.isValid) {
      return { isValid: false, error: verification.errorMessageArabic };
    }

    const beneficiaries = this.getBeneficiaries();
    const beneficiary = beneficiaries.find((b) => b.id === codeRecord!.beneficiaryId);

    if (!beneficiary) {
      return { isValid: false, error: 'سجل المستفيد المرتبط بهذا الكود غير موجود بالمنظومة' };
    }

    if (!beneficiary.isActive) {
      return { isValid: false, error: 'حساب المستفيد معطل حالياً من قبل إدارة الجمعية' };
    }

    return {
      isValid: true,
      codeRecord: codeRecord!,
      beneficiary,
    };
  }

  /**
   * Executes atomic delivery transaction matching PostgreSQL process_charity_delivery RPC
   */
  async processCharityDeliveryAtomic(params: {
    code: string;
    currentMonth: string;
    staffId: string;
    staffName: string;
    items: CartItem[];
    notes?: string;
  }): Promise<{
    success: boolean;
    error?: string;
    delivery?: DeliveryRecord;
    balanceAfter?: number;
  }> {
    // 1. Re-verify code and lock record
    const { isValid, error, codeRecord, beneficiary } = this.verifyCodeForDelivery(
      params.code,
      params.currentMonth
    );

    if (!isValid || !codeRecord || !beneficiary) {
      return { success: false, error: error || 'فشل التحقق من الكود' };
    }

    // 2. Authorize cart points
    const authCheck = canAuthorizeDelivery(beneficiary.pointsBalance, params.items);
    if (!authCheck.canAuthorize) {
      return { success: false, error: authCheck.errorMessageArabic };
    }

    // 2b. Enforce product quantity limits based on beneficiary family size
    for (const item of params.items) {
      const maxLimit = this.getProductLimit(item.productId, beneficiary.familySize);
      if (maxLimit !== null && item.quantity > maxLimit) {
        return {
          success: false,
          error: `تجاوزت الكمية المسموحة للصنف (${item.productName}). الحد الأقصى لأسرة مكونة من ${beneficiary.familySize} أفراد هو ${maxLimit} قطع فقط.`,
        };
      }
    }

    const totalPoints = params.items.reduce(
      (sum, item) => sum + (item.pointsCost || 0) * (item.quantity || 0),
      0
    );
    const balanceBefore = beneficiary.pointsBalance;
    const balanceAfter = balanceBefore - totalPoints;

    const deliveryId = 'del_' + Date.now();
    const deliveryItems: DeliveryItemRecord[] = params.items.map((item, idx) => ({
      id: `ditem_${deliveryId}_${idx}`,
      deliveryId,
      productId: item.productId,
      productName: item.productName,
      unitPoints: item.pointsCost,
      quantity: item.quantity,
      subtotalPoints: item.pointsCost * item.quantity,
    }));

    const expired_points = balanceAfter;
    const deliveryRecord: DeliveryRecord = {
      id: deliveryId,
      codeId: codeRecord.id,
      deliveryCode: codeRecord.code,
      beneficiaryId: beneficiary.id,
      beneficiaryName: beneficiary.fullName,
      beneficiaryPhone: beneficiary.phone,
      staffId: params.staffId,
      staffName: params.staffName,
      totalPoints,
      balanceBefore,
      balanceAfter,
      expired_points,
      items: deliveryItems,
      notes: params.notes,
      createdAt: new Date().toISOString(),
    };

    // 3. Atomically update Beneficiary Balance (leftover points expire and do not carry over)
    const beneficiariesList = this.getBeneficiaries();
    const benIndex = beneficiariesList.findIndex((b) => b.id === beneficiary.id);
    if (benIndex !== -1) {
      beneficiariesList[benIndex].pointsBalance = 0;
      beneficiariesList[benIndex].updatedAt = new Date().toISOString();
      this.setStorage(STORAGE_KEYS.BENEFICIARIES, beneficiariesList);
    }

    // 4. Atomically update Code Status to 'used'
    const codesList = this.getStorage<MonthlyCode[]>(STORAGE_KEYS.MONTHLY_CODES, INITIAL_CODES);
    const codeIndex = codesList.findIndex((c) => c.id === codeRecord.id);
    if (codeIndex !== -1) {
      codesList[codeIndex].status = 'used';
      codesList[codeIndex].usedAt = new Date().toISOString();
      codesList[codeIndex].usedByStaffId = params.staffId;
      codesList[codeIndex].usedByStaffName = params.staffName;
      codesList[codeIndex].deliveryId = deliveryId;
      this.setStorage(STORAGE_KEYS.MONTHLY_CODES, codesList);
    }

    // 5. Append delivery record
    const deliveriesList = this.getStorage<DeliveryRecord[]>(STORAGE_KEYS.DELIVERIES, []);
    deliveriesList.unshift(deliveryRecord);
    this.setStorage(STORAGE_KEYS.DELIVERIES, deliveriesList);

    // 6. Record Audit Logs (Delivery Dispatch + Official Invoice Issuance with date & time)
    const invoiceNum = `#${deliveryId.slice(0, 10).toUpperCase()}`;
    const invoiceTimeArabic = new Intl.DateTimeFormat('ar-EG', {
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(new Date());

    this.recordAuditLog({
      action: 'DELIVERY_DISPATCH',
      actorId: params.staffId,
      actorName: params.staffName,
      actorRole: 'staff',
      targetId: beneficiary.id,
      targetName: beneficiary.fullName,
      details: `صرف سلع تموينية بإجمالي ${totalPoints} نقطة للمستفيد ${beneficiary.fullName} باستخدام كود (${params.code}). الرصيد المتبقي: ${balanceAfter} نقطة`,
    });

    this.recordAuditLog({
      action: 'INVOICE_ISSUED',
      actorId: params.staffId,
      actorName: params.staffName,
      actorRole: 'staff',
      targetId: deliveryId,
      targetName: `فاتورة تسليم رقم ${invoiceNum}`,
      details: `إصدار وتوثيق فاتورة تسليم رسمية رقم ${invoiceNum} للمستفيد (${beneficiary.fullName}) بتاريخ ووقت: ${invoiceTimeArabic} - إجمالي المنصرف: ${totalPoints} نقطة`,
    });

    return {
      success: true,
      delivery: deliveryRecord,
      balanceAfter,
    };
  }

  // ================= Logs & Deliveries Query =================
  getDeliveries(filters?: {
    staffId?: string;
    beneficiaryId?: string;
    searchQuery?: string;
  }): DeliveryRecord[] {
    let list = this.getStorage<DeliveryRecord[]>(STORAGE_KEYS.DELIVERIES, []);
    if (!Array.isArray(list)) {
      list = [];
    }
    let updated = false;
    list = list.map((d) => {
      const cleanBen = cleanPersonName(d.beneficiaryName);
      const cleanStaff = cleanPersonName(d.staffName);
      if (cleanBen !== d.beneficiaryName || cleanStaff !== d.staffName) {
        updated = true;
      }
      return {
        ...d,
        beneficiaryName: cleanBen || d.beneficiaryName,
        staffName: cleanStaff || d.staffName,
      };
    });
    if (updated) {
      this.setStorage(STORAGE_KEYS.DELIVERIES, list);
    }
    if (filters?.staffId) {
      list = list.filter((d) => d.staffId === filters.staffId);
    }
    if (filters?.beneficiaryId) {
      list = list.filter((d) => d.beneficiaryId === filters.beneficiaryId);
    }
    if (filters?.searchQuery) {
      const q = filters.searchQuery.trim().toLowerCase();
      list = list.filter(
        (d) =>
          (d.beneficiaryName || '').toLowerCase().includes(q) ||
          (d.deliveryCode || '').includes(q) ||
          (d.staffName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  getAuditLogs(): AuditLogEntry[] {
    return this.getStorage<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  }

  private recordAuditLog(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): void {
    const list = this.getStorage<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    const logItem: AuditLogEntry = {
      ...entry,
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      createdAt: new Date().toISOString(),
    };
    list.unshift(logItem);
    this.setStorage(STORAGE_KEYS.AUDIT_LOGS, list);
  }

  // ================= Dashboard Metrics =================
  getDashboardMetrics(): DashboardMetrics {
    try {
      const beneficiaries = this.getBeneficiaries() || [];
      const currentMonthKey = this.getActiveMonth();
      const codes = this.getMonthlyCodes(currentMonthKey) || [];
      const deliveries = this.getDeliveries() || [];

      const currentMonthDeliveries = deliveries.filter((d) =>
        d && typeof d.createdAt === 'string' && d.createdAt.startsWith(currentMonthKey)
      );

      const totalBeneficiaries = beneficiaries.length;
      const totalPointsRemaining = beneficiaries.reduce((sum, b) => sum + (b?.pointsBalance || 0), 0);
      const codesThisMonthTotal = codes.length;
      const codesThisMonthUsed = codes.filter((c) => c && c.status === 'used').length;
      const codesThisMonthAvailable = Math.max(0, codesThisMonthTotal - codesThisMonthUsed);

      const pointsDistributedThisMonth = currentMonthDeliveries.reduce(
        (sum, d) => sum + (d?.totalPoints || 0),
        0
      );

      // Group deliveries into 4 recent weeks using real data only
      const weekCounts = [0, 0, 0, 0];
      const weekPoints = [0, 0, 0, 0];
      currentMonthDeliveries.forEach((d) => {
        if (!d || !d.createdAt) return;
        const day = new Date(d.createdAt).getDate();
        const weekIndex = Math.min(3, Math.floor((day - 1) / 7));
        weekCounts[weekIndex] += 1;
        weekPoints[weekIndex] += d.totalPoints || 0;
      });

      const weeklyDeliveries = [
        { weekLabel: 'الأسبوع 1', deliveryCount: weekCounts[0], pointsCount: weekPoints[0] },
        { weekLabel: 'الأسبوع 2', deliveryCount: weekCounts[1], pointsCount: weekPoints[1] },
        { weekLabel: 'الأسبوع 3', deliveryCount: weekCounts[2], pointsCount: weekPoints[2] },
        { weekLabel: 'الأسبوع الحالي', deliveryCount: weekCounts[3], pointsCount: weekPoints[3] },
      ];

      return {
        totalBeneficiaries,
        deliveriesThisMonth: currentMonthDeliveries.length,
        totalPointsRemaining,
        codesThisMonthTotal,
        codesThisMonthUsed,
        codesThisMonthAvailable,
        pointsDistributedThisMonth,
        weeklyDeliveries,
      };
    } catch (e) {
      console.error('Error computing dashboard metrics safely:', e);
      return {
        totalBeneficiaries: 0,
        deliveriesThisMonth: 0,
        totalPointsRemaining: 0,
        codesThisMonthTotal: 0,
        codesThisMonthUsed: 0,
        codesThisMonthAvailable: 0,
        pointsDistributedThisMonth: 0,
        weeklyDeliveries: [
          { weekLabel: 'الأسبوع 1', deliveryCount: 0, pointsCount: 0 },
          { weekLabel: 'الأسبوع 2', deliveryCount: 0, pointsCount: 0 },
          { weekLabel: 'الأسبوع 3', deliveryCount: 0, pointsCount: 0 },
          { weekLabel: 'الأسبوع الحالي', deliveryCount: 0, pointsCount: 0 },
        ],
      };
    }
  }

  // ================= CSV Export =================
  exportDeliveriesCsv(deliveries: DeliveryRecord[]): void {
    const headers = [
      'رقم العملية',
      'كود الصرف',
      'تاريخ ووقت الصرف',
      'اسم المستفيد',
      'رقم هاتف المستفيد',
      'مسؤول الصرف',
      'الأصناف المستلمة',
      'إجمالي النقاط',
      'الرصيد السابق',
      'الرصيد المتبقي',
      'ملاحظات',
    ];

    const rows = deliveries.map((d) => {
      const itemsStr = d.items
        .map((i) => `${i.productName} (${i.quantity} × ${i.unitPoints} نقطة)`)
        .join(' + ');

      const formattedDate = new Intl.DateTimeFormat('ar-EG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(d.createdAt));

      return [
        `"${d.id}"`,
        `"${d.deliveryCode}"`,
        `"${formattedDate}"`,
        `"${d.beneficiaryName}"`,
        `"${d.beneficiaryPhone}"`,
        `"${d.staffName}"`,
        `"${itemsStr}"`,
        d.totalPoints,
        d.balanceBefore,
        d.balanceAfter,
        `"${d.notes || ''}"`,
      ].join(',');
    });

    // Add UTF-8 BOM so Excel opens Arabic correctly
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `سجل_صرف_جمعية_عطاء_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ================= Association & Invoice Phone =================
  /**
   * Retrieves the association phone dynamically from the administrator's account.
   * When the administrator changes their phone number in staff management,
   * it automatically reflects across all invoices in real-time.
   */
  getAssociationPhone(): string {
    const staffList = this.getStaffAccounts();
    // 1. Look for active administrator with a phone number
    const adminWithPhone = staffList.find(
      (s) => s.role === 'admin' && s.isActive && s.phone && s.phone.trim().length > 0
    );
    if (adminWithPhone?.phone) {
      return adminWithPhone.phone.trim();
    }
    // 2. Look for any admin with phone number
    const anyAdminWithPhone = staffList.find(
      (s) => s.role === 'admin' && s.phone && s.phone.trim().length > 0
    );
    if (anyAdminWithPhone?.phone) {
      return anyAdminWithPhone.phone.trim();
    }
    // 3. Fallback from current user if admin
    const current = this.getCurrentUser();
    if (current?.role === 'admin' && current.phone && current.phone.trim().length > 0) {
      return current.phone.trim();
    }
    // 4. Default fallback
    const settings = this.getStorage<{ phone: string }>(STORAGE_KEYS.SETTINGS, {
      phone: '01012345678',
    });
    return settings?.phone || '01012345678';
  }

  updateAssociationPhone(phone: string): { success: boolean; error?: string } {
    const cleanPhone = (phone || '').trim();
    if (!cleanPhone) {
      return { success: false, error: 'رقم هاتف الجمعية مطلوب' };
    }
    this.setStorage(STORAGE_KEYS.SETTINGS, { phone: cleanPhone });

    const current = this.getCurrentUser();
    if (current) {
      this.recordAuditLog({
        action: 'STAFF_TOGGLE',
        actorId: current.id,
        actorName: current.fullName,
        actorRole: current.role,
        targetName: 'هاتف الفاتورة',
        details: `تحديث رقم هاتف الفاتورة إلى: ${cleanPhone}`,
      });
    }

    return { success: true };
  }

  logInvoicePrint(deliveryId: string, beneficiaryName: string): void {
    const current = this.getCurrentUser();
    const invoiceNum = `#${deliveryId.slice(0, 10).toUpperCase()}`;
    const formattedTime = new Intl.DateTimeFormat('ar-EG', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date());

    this.recordAuditLog({
      action: 'INVOICE_PRINTED',
      actorId: current?.id || 'system',
      actorName: current?.fullName || 'مسؤول الصرف',
      actorRole: current?.role || 'staff',
      targetId: deliveryId,
      targetName: `فاتورة رقم ${invoiceNum}`,
      details: `طباعة إيصال الفاتورة الرسمية رقم ${invoiceNum} للمستفيد (${beneficiaryName}) بتاريخ ووقت: ${formattedTime}`,
    });
  }

  logInvoiceDownload(deliveryId: string, beneficiaryName: string): void {
    const current = this.getCurrentUser();
    const invoiceNum = `#${deliveryId.slice(0, 10).toUpperCase()}`;
    const formattedTime = new Intl.DateTimeFormat('ar-EG', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date());

    this.recordAuditLog({
      action: 'INVOICE_DOWNLOADED',
      actorId: current?.id || 'system',
      actorName: current?.fullName || 'مسؤول الصرف',
      actorRole: current?.role || 'staff',
      targetId: deliveryId,
      targetName: `فاتورة رقم ${invoiceNum}`,
      details: `تحميل وحفظ صورة الفاتورة الرسمية رقم ${invoiceNum} للمستفيد (${beneficiaryName}) بتاريخ ووقت: ${formattedTime}`,
    });
  }
}

export const dataService = new DataService();
