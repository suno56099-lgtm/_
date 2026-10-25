import React, { useState } from 'react';
import {
  UserCog,
  Plus,
  ShieldCheck,
  UserCheck,
  KeyRound,
  Power,
  X,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Settings,
  Edit2,
  CreditCard,
  Mail,
  User,
  Shield,
  Copy,
  Check,
} from 'lucide-react';
import { StaffAccount } from '../types/index.ts';
import { dataService } from '../services/dataService.ts';
import { cleanPersonName, validatePersonName } from '../utils/egyptianValidation.ts';

interface StaffViewProps {
  staffList: StaffAccount[];
  currentUser: StaffAccount | null;
  onRefresh: () => void;
}

export const StaffView: React.FC<StaffViewProps> = ({
  staffList,
  currentUser,
  onRefresh,
}) => {
  // Add Staff Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    phone: '',
    nationalId: '',
    role: 'staff' as 'admin' | 'staff',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Edit Staff Modal state
  const [editingStaff, setEditingStaff] = useState<StaffAccount | null>(null);
  const [editFormData, setEditFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    phone: '',
    nationalId: '',
    role: 'staff' as 'admin' | 'staff',
  });
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editFormSuccess, setEditFormSuccess] = useState<string | null>(null);

  // Password reset alert
  const [resetModalInfo, setResetModalInfo] = useState<{
    staffName: string;
    tempPass: string;
  } | null>(null);

  // Banner Notification
  const [bannerNotification, setBannerNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Copied indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAddModal = () => {
    setFormData({
      username: '',
      email: '',
      fullName: '',
      phone: '',
      nationalId: '',
      role: 'staff',
    });
    setFormError(null);
    setFormSuccess(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (staff: StaffAccount) => {
    setEditingStaff(staff);
    setEditFormData({
      username: staff.username,
      email: staff.email,
      fullName: staff.fullName,
      phone: staff.phone || '',
      nationalId: staff.nationalId || '',
      role: staff.role,
    });
    setEditFormError(null);
    setEditFormSuccess(null);
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.username.trim() || !formData.fullName.trim() || !formData.email.trim()) {
      setFormError('يرجى ملء كافة الحقول الأساسية المطلوبة');
      return;
    }

    const nameCheck = validatePersonName(formData.fullName);
    if (!nameCheck.isValid) {
      setFormError(nameCheck.errorMessage || 'لا يمكن أن يحتوي الاسم على أرقام هواتف أو أرقام قومية');
      return;
    }

    const res = dataService.createStaffAccount(formData);
    if (!res.success) {
      setFormError(res.error || 'فشل إنشاء الحساب');
      return;
    }

    setFormSuccess('تم إنشاء حساب الموظف الجديد وحفظ بياناته بنجاح');
    setTimeout(() => {
      setIsAddModalOpen(false);
      onRefresh();
    }, 800);
  };

  const handleEditStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setEditFormError(null);
    setEditFormSuccess(null);

    const nameCheck = validatePersonName(editFormData.fullName);
    if (!nameCheck.isValid) {
      setEditFormError(nameCheck.errorMessage || 'لا يمكن أن يحتوي الاسم على أرقام هواتف أو أرقام قومية');
      return;
    }

    const res = dataService.updateStaffAccount(editingStaff.id, editFormData);
    if (!res.success) {
      setEditFormError(res.error || 'فشل تحديث بيانات الموظف');
      return;
    }

    setEditFormSuccess('تم تحديث بيانات الموظف بنجاح');
    setTimeout(() => {
      setEditingStaff(null);
      onRefresh();
    }, 800);
  };

  const handleToggleActive = (id: string) => {
    const res = dataService.toggleStaffAccount(id);
    if (!res.success) {
      setBannerNotification({
        type: 'error',
        message: res.error || 'تعذر تغيير حالة الحساب',
      });
      setTimeout(() => setBannerNotification(null), 4000);
      return;
    }
    setBannerNotification({
      type: 'success',
      message: 'تم تحديث حالة الحساب بنجاح',
    });
    setTimeout(() => setBannerNotification(null), 3000);
    onRefresh();
  };

  const handleResetPassword = (staff: StaffAccount) => {
    const res = dataService.resetStaffPassword(staff.id);
    if (res.success && res.tempPassword) {
      setResetModalInfo({
        staffName: staff.fullName,
        tempPass: res.tempPassword,
      });
      onRefresh();
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in w-full max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-[#161D1A] border border-[#26312C] rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-[#34C38F] flex-shrink-0" />
            <h1 className="text-lg sm:text-xl font-bold text-[#E8EDEA] truncate">
              إدارة فريق العمل والصلاحيات
            </h1>
          </div>
          <p className="text-xs text-[#8A9690] mt-1 leading-relaxed">
            تسجيل وتعديل بيانات الموظفين، أرقام الهواتف، الأرقام القومية، وتعيين الصلاحيات وكلمات المرور.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#34C38F] text-[#0F1412] font-bold text-xs sm:text-sm shadow-md hover:bg-[#2bb27f] active:scale-95 transition cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة موظف جديد</span>
        </button>
      </div>

      {bannerNotification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 animate-fade-in ${
            bannerNotification.type === 'success'
              ? 'bg-[#34C38F]/15 border-[#34C38F]/30 text-[#34C38F]'
              : 'bg-[#F0707A]/15 border-[#F0707A]/30 text-[#F0707A]'
          }`}
        >
          {bannerNotification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{bannerNotification.message}</span>
        </div>
      )}

      {/* Staff Accounts Section */}
      <div className="bg-[#161D1A] border border-[#26312C] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#26312C]">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#34C38F]" />
            <h2 className="text-sm font-bold text-[#E8EDEA]">قائمة أعضاء فريق العمل</h2>
          </div>
          <span className="text-xs text-[#8A9690]">{staffList.length} أعضاء</span>
        </div>

        {/* Staff Members Grid: Beautiful, Responsive Cards for both Mobile and Desktop (Clean, Orderly, No Overlap) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {staffList.map((staff) => {
            const isCurrent = currentUser?.id === staff.id;
            const pureName = cleanPersonName(staff.fullName) || staff.username;
            const initialLetter = pureName.trim().charAt(0) || 'م';

            return (
              <div
                key={staff.id}
                className={`p-4 sm:p-5 rounded-2xl bg-[#1C2521] border transition-all shadow-sm text-xs flex flex-col justify-between hover:shadow-md ${
                  isCurrent
                    ? 'border-[#34C38F]/60 ring-2 ring-[#34C38F]/20 bg-gradient-to-b from-[#1C2521] to-[#161D1A]'
                    : 'border-[#26312C] hover:border-[#34C38F]/40'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Header Row: Avatar + Full Name + Username + Role Badges */}
                  <div className="flex items-start justify-between gap-3">
                    {/* User Avatar & Name */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base flex-shrink-0 shadow-sm ${
                          staff.role === 'admin'
                            ? 'bg-gradient-to-br from-[#E0B35A]/25 to-[#E0B35A]/10 text-[#E0B35A] border border-[#E0B35A]/40'
                            : 'bg-gradient-to-br from-[#34C38F]/25 to-[#34C38F]/10 text-[#34C38F] border border-[#34C38F]/40'
                        }`}
                      >
                        {initialLetter}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-base text-[#E8EDEA] tracking-wide break-words">
                            {pureName}
                          </h3>
                          {isCurrent && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#34C38F]/20 text-[#34C38F] font-bold border border-[#34C38F]/30 whitespace-nowrap">
                              أنت (الحساب الحالي)
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-[#E0B35A] mt-0.5 flex items-center gap-1">
                          <span>@{staff.username}</span>
                        </div>
                      </div>
                    </div>

                    {/* Role & Active Badges (Stacked Cleanly on Left in RTL) */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {staff.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E0B35A]/15 text-[#E0B35A] border border-[#E0B35A]/30 font-bold text-[11px] whitespace-nowrap">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>مدير عام</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#34C38F]/15 text-[#34C38F] border border-[#34C38F]/30 font-semibold text-[11px] whitespace-nowrap">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>مسؤول صرف</span>
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md border whitespace-nowrap ${
                          staff.isActive
                            ? 'text-[#34C38F] bg-[#34C38F]/10 border-[#34C38F]/25'
                            : 'text-[#8A9690] bg-[#8A9690]/10 border-[#8A9690]/25'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            staff.isActive ? 'bg-[#34C38F] animate-pulse' : 'bg-[#8A9690]'
                          }`}
                        />
                        <span>{staff.isActive ? 'حساب نشط' : 'حساب معطل'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Contact & Identification: Clean, Spacious Full-Width Rows (Never Cramped or Overlapping) */}
                  <div className="space-y-2 pt-3 border-t border-[#26312C]">
                    {/* Row 1: Phone Number */}
                    <div className="flex items-center justify-between gap-2 bg-[#161D1A] px-3.5 py-2.5 rounded-xl border border-[#26312C]">
                      <div className="flex items-center gap-2 text-[#8A9690] flex-shrink-0">
                        <div className="w-6 h-6 rounded-lg bg-[#34C38F]/10 flex items-center justify-center text-[#34C38F]">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium text-[#8A9690]">رقم الهاتف:</span>
                      </div>

                      {staff.phone ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <a
                            href={`tel:${staff.phone}`}
                            className="font-mono font-bold text-[#E8EDEA] hover:text-[#34C38F] transition text-xs sm:text-sm tracking-wide"
                            dir="ltr"
                          >
                            {staff.phone}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy(staff.phone || '', `phone-${staff.id}`)}
                            className="p-1 rounded-lg text-[#8A9690] hover:text-[#34C38F] hover:bg-[#1C2521] transition cursor-pointer flex-shrink-0"
                            title="نسخ رقم الهاتف"
                            aria-label="نسخ رقم الهاتف"
                          >
                            {copiedId === `phone-${staff.id}` ? (
                              <Check className="w-3.5 h-3.5 text-[#34C38F]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#8A9690] italic text-xs">غير مسجل</span>
                      )}
                    </div>

                    {/* Row 2: National ID (14 digits) */}
                    <div className="flex items-center justify-between gap-2 bg-[#161D1A] px-3.5 py-2.5 rounded-xl border border-[#26312C]">
                      <div className="flex items-center gap-2 text-[#8A9690] flex-shrink-0">
                        <div className="w-6 h-6 rounded-lg bg-[#E0B35A]/10 flex items-center justify-center text-[#E0B35A]">
                          <CreditCard className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium text-[#8A9690]">الرقم القومي:</span>
                      </div>

                      {staff.nationalId ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="font-mono font-bold text-[#E8EDEA] tracking-wider text-xs sm:text-sm select-all"
                            dir="ltr"
                          >
                            {staff.nationalId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(staff.nationalId || '', `nid-${staff.id}`)}
                            className="p-1 rounded-lg text-[#8A9690] hover:text-[#E0B35A] hover:bg-[#1C2521] transition cursor-pointer flex-shrink-0"
                            title="نسخ الرقم القومي"
                            aria-label="نسخ الرقم القومي"
                          >
                            {copiedId === `nid-${staff.id}` ? (
                              <Check className="w-3.5 h-3.5 text-[#34C38F]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#8A9690] italic text-xs">غير مسجل</span>
                      )}
                    </div>

                    {/* Row 3: Email & Activity Info */}
                    <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-[#8A9690] pt-1">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                        <Mail className="w-3.5 h-3.5 text-[#8A9690] flex-shrink-0" />
                        <span className="font-mono text-xs truncate text-[#8A9690] hover:text-[#E8EDEA] select-all">
                          {staff.email}
                        </span>
                      </div>

                      <span className="text-[10px] text-[#8A9690] whitespace-nowrap flex-shrink-0">
                        {staff.lastLoginAt
                          ? `آخر دخول: ${new Intl.DateTimeFormat('ar-EG', { dateStyle: 'short' }).format(new Date(staff.lastLoginAt))}`
                          : 'لم يسجل دخول بعد'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons (Bottom Bar) */}
                <div className="flex items-center justify-end gap-2 pt-3.5 mt-3.5 border-t border-[#26312C] flex-wrap">
                  <button
                    onClick={() => handleOpenEditModal(staff)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#161D1A] hover:bg-[#26312C] border border-[#26312C] text-xs font-semibold text-[#34C38F] hover:border-[#34C38F]/40 transition cursor-pointer active:scale-95"
                    title="تعديل بيانات الموظف ورقم الهاتف والقومي"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعديل البيانات</span>
                  </button>

                  <button
                    onClick={() => handleResetPassword(staff)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#161D1A] hover:bg-[#26312C] border border-[#26312C] text-xs font-semibold text-[#E0B35A] hover:border-[#E0B35A]/40 transition cursor-pointer active:scale-95"
                    title="إعادة تعيين كلمة المرور"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>كلمة المرور</span>
                  </button>

                  {!isCurrent && (
                    <button
                      onClick={() => handleToggleActive(staff.id)}
                      className={`p-2 rounded-xl border text-xs transition cursor-pointer flex-shrink-0 active:scale-95 ${
                        staff.isActive
                          ? 'bg-[#161D1A] border-[#F0707A]/30 text-[#F0707A] hover:bg-[#F0707A]/15'
                          : 'bg-[#34C38F]/15 border-[#34C38F]/30 text-[#34C38F] hover:bg-[#34C38F]/25'
                      }`}
                      title={staff.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                      aria-label={staff.isActive ? `تعطيل حساب ${pureName}` : `تفعيل حساب ${pureName}`}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Staff Account Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#161D1A] border border-[#26312C] p-5 sm:p-6 shadow-2xl text-[#E8EDEA] my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#26312C] mb-4">
              <div className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-[#34C38F]" />
                <h3 className="text-base font-bold">إضافة حساب موظف جديد</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[#1C2521] text-[#8A9690] hover:text-[#E8EDEA] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-[#F0707A]/15 border border-[#F0707A]/30 text-[#F0707A] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-[#34C38F]/15 border border-[#34C38F]/30 text-[#34C38F] text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddStaffSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#8A9690] mb-1 font-medium">
                  الاسم الكامل للموظف <span className="text-[#F0707A]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="مثال: يوسف محمود النجار"
                  className="w-full bg-[#1C2521] border border-[#26312C] rounded-xl px-3.5 py-2.5 text-[#E8EDEA] focus:outline-none focus:border-[#34C38F]"
                />
              </div>

              {/* Phone & National ID in responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8A9690] mb-1 font-medium flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#34C38F]" />
                    <span>رقم هاتف الموظف</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.trim() })}
                    placeholder="01012345678"
                    maxLength={11}
                    className="w-full font-mono bg-[#1C2521] border border-[#26312C] rounded-xl px-3.5 py-2.5 text-[#E8EDEA] focus:outline-none focus:border-[#34C38F]"
                  />
                  <span className="text-[10px] text-[#8A9690] mt-0.5 block">
                    11 رقماً مصرياً يبدأ بـ 01
                  </span>
                </div>

                <div>
                  <label className="block text-[#8A9690] mb-1 font-medium flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-[#E0B35A]" />
                    <span>الرقم القومي للموظف</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nationalId}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value.trim() })}
                    placeholder="28503140101234"
                    maxLength={14}
                    className="w-full font-mono bg-[#1C2521] border border-[#26312C] rounded-xl px-3.5 py-2.5 text-[#E8EDEA] focus:outline-none focus:border-[#34C38F]"
                  />
                  <span className="text-[10px] text-[#8A9690] mt-0.5 block">
                    14 رقماً مصرياً قومياً معتمداً
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8A9690] mb-1 font-medium">
                    اسم المستخدم للدخول <span className="text-[#F0707A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })
                    }
                    placeholder="youssef_staff"
                    className="w-full font-mono bg-[#1C2521] border border-[#26312C] rounded-xl px-3.5 py-2.5 text-[#E8EDEA] focus:outline-none focus:border-[#34C38F]"
                  />
                </div>

                <div>
                  <label className="block text-[#8A9690] mb-1 font-medium">
                    البريد الإلكتروني الداخلي <span className="text-[#F0707A]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value.trim() })}
                    placeholder="youssef@ataa.org.eg"
                    className="w-full font-mono bg-[#1C2521] border border-[#26312C] rounded-xl px-3.5 py-2.5 text-[#E8EDEA] focus:outline-none focus:border-[#34C38F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#8A9690] mb-1 font-medium">الدور والصلاحية</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as 'admin' | 'staff' })
                  }
                  className="w-full bg-[#1C2521] border border-[#26312C] rounded-xl px-3.5 py-2.5 text-[#E8EDEA] focus:outline-none focus:border-[#34C38F]"
                >
                  <option value="staff">مسؤول صرف وتسجيل (Staff)</option>
                  <option value="admin">مدير النظام (Admin - كامل الصلاحيات)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#26312C] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#1C2521] hover:bg-[#26312C] text-[#8A9690] hover:text-[#E8EDEA] transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#34C38F] hover:bg-[#2bb27f] text-[#0F1412] font-bold shadow-md transition cursor-pointer"
                >
                  إنشاء الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Account Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#161D1A] border border-[#26312C] p-5 sm:p-6 shadow-2xl text-[#E8EDEA] my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#26312C] mb-4">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#34C38F]" />
                <h3 className="text-base font-bold">تعديل بيانات الموظف</h3>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-1.5 rounded-xl hover:bg-[#1C2521] text-[#8A9690] hover:text-[#E8EDEA] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editFormError && (
              <div className="mb-4 p-3 rounded-xl bg-[#F0707A]/15 border border-[#F0707A]/30 text-[#F0707A] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{editFormError}</span>
              </div>
            )}

            {editFormSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-[#34C38F]/15 border border-[#34C38F]/30 text-[#34C38F] text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{editFormSuccess}</span>
              </div>
            )}

            <form onSubmit={handleEditStaffSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#8A9690] mb-1 font-medium">الاسم الكامل للموظف</label>
                <input
                  type="text"
                  required
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  className="w-full bg-[#1C2521] border border-[#26312C] rounded-xl px-3.5 py-2.5 text-[#E8EDEA] focus:outline-none focus:border-[#34C38F]"
                />
              </div>

              {/* Phone & National ID in responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8A9690] mb-1 font-medium flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#34C38F]" />
                    <span>رقم هاتف الموظف</span>
                  </label>
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value.trim() })}
                    placeholder="01012345678"
                    maxLength={11}
                    className="w-full font-mono bg-[#1C2521] border border-[#26312C] rounded-xl px-3.5 py-2.5 text-[#E8EDEA] focus:outline-none focus:border-[#34C38F]"
                  />
                  <div className="flex items-center justify-between text-[10px] mt-0.5">
                    <span className="text-[#8A9690]">11 رقماً مصرياً</span>
                    {editFormData.role === 'admin' && (
                      <span className="text-[#34C38F] font-semibold">يظهر تلقائياً كهاتف الجمعية بالفاتورة</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[#8A9690] mb-1 font-medium flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-[#E0B35A]" />
                    <span>الرقم القومي للموظف</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.nationalId}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, nationalId: e.target.value.trim() })
                    }
                    placeholder="28503140101234"
                    maxLength={14}
                    className="w-full font-mono bg-[#1C2521] border border-[#26312C] rounded-xl px-3.5 py-2.5 text-[#E8EDEA] focus:outline-none focus:border-[#34C38F]"
                  />
                  <span className="text-[10px] text-[#8A9690] mt-0.5 block">14 رقماً مصرياً</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8A9690] mb-1 font-medium">اسم المستخدم للدخول</label>
                  <input
                    type="text"
                    required
                    value={editFormData.username}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, username: e.target.value.toLowerCase().trim() })
                    }
                    className="w-full font-mono bg-[#1C2521] border border-[#26312C] rounded-xl px-3.5 py-2.5 text-[#E8EDEA] focus:outline-none focus:border-[#34C38F]"
                  />
                </div>

                <div>
                  <label className="block text-[#8A9690] mb-1 font-medium">البريد الإلكتروني الداخلي</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value.trim() })}
                    className="w-full font-mono bg-[#1C2521] border border-[#26312C] rounded-xl px-3.5 py-2.5 text-[#E8EDEA] focus:outline-none focus:border-[#34C38F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#8A9690] mb-1 font-medium">الدور والصلاحية</label>
                <select
                  value={editFormData.role}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, role: e.target.value as 'admin' | 'staff' })
                  }
                  className="w-full bg-[#1C2521] border border-[#26312C] rounded-xl px-3.5 py-2.5 text-[#E8EDEA] focus:outline-none focus:border-[#34C38F]"
                >
                  <option value="staff">مسؤول صرف وتسجيل (Staff)</option>
                  <option value="admin">مدير النظام (Admin - كامل الصلاحيات)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#26312C] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#1C2521] hover:bg-[#26312C] text-[#8A9690] hover:text-[#E8EDEA] transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#34C38F] hover:bg-[#2bb27f] text-[#0F1412] font-bold shadow-md transition cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Alert Modal */}
      {resetModalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#161D1A] border border-[#26312C] p-6 shadow-2xl text-[#E8EDEA] text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-[#E0B35A]/15 text-[#E0B35A] flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-[#E8EDEA]">تم إنشاء كلمة مرور مؤقتة</h3>
              <p className="text-xs text-[#8A9690] mt-1">
                للموظف: <strong className="text-[#E8EDEA]">{resetModalInfo.staffName}</strong>
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0F1412] border border-[#26312C]">
              <div className="text-[11px] text-[#8A9690] mb-1">كلمة المرور المؤقتة:</div>
              <div className="font-mono font-extrabold text-lg text-[#34C38F] tracking-wider select-all">
                {resetModalInfo.tempPass}
              </div>
            </div>

            <button
              onClick={() => setResetModalInfo(null)}
              className="w-full py-2.5 rounded-xl bg-[#1C2521] hover:bg-[#26312C] text-xs font-semibold text-[#E8EDEA] transition cursor-pointer"
            >
              تم النسخ والحفظ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
