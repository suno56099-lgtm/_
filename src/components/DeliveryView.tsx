import React, { useState } from 'react';
import {
  ShoppingBag,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Lock,
} from 'lucide-react';
import { Product, Beneficiary, MonthlyCode, DeliveryRecord, StaffAccount } from '../types/index.ts';
import { dataService } from '../services/dataService.ts';
import { CartItem, formatMonthArabic } from '../utils/deliveryRules.ts';
import { maskNationalId } from '../utils/egyptianValidation.ts';
import { InvoiceModal } from './InvoiceModal.tsx';

interface DeliveryViewProps {
  products: Product[];
  currentUser: StaffAccount | null;
  onRefresh: () => void;
}

export const DeliveryView: React.FC<DeliveryViewProps> = ({
  products,
  currentUser,
  onRefresh,
}) => {
  const currentMonth = dataService.getActiveMonth();
  const isMonthClosed = dataService.isMonthClosed(currentMonth);

  // Flow State: 'verify_code' | 'pick_items' | 'success_receipt'
  const [step, setStep] = useState<'verify_code' | 'pick_items' | 'success_receipt'>('verify_code');

  const [inputCode, setInputCode] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Verified Data
  const [verifiedBeneficiary, setVerifiedBeneficiary] = useState<Beneficiary | null>(null);
  const [verifiedCodeRecord, setVerifiedCodeRecord] = useState<MonthlyCode | null>(null);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Completed Delivery
  const [completedDelivery, setCompletedDelivery] = useState<DeliveryRecord | null>(null);

  // Handle Verify Code
  const handleVerify = (codeToVerify?: string) => {
    const code = (codeToVerify || inputCode).trim();
    setVerifyError(null);

    if (isMonthClosed) {
      setVerifyError(`دورة صرف شهر ${formatMonthArabic(currentMonth)} مغلقة (تم تسليمه بالكامل)، ولا يمكن تنفيذ عمليات صرف جديدة.`);
      return;
    }

    if (!code) {
      setVerifyError('يرجى إدخال كود الاستلام المكون من 6 أرقام أو الكود كاملاً');
      return;
    }

    const result = dataService.verifyCodeForDelivery(code, currentMonth);
    if (!result.isValid || !result.beneficiary || !result.codeRecord) {
      setVerifyError(result.error || 'كود غير صالح');
      return;
    }

    setVerifiedBeneficiary(result.beneficiary);
    setVerifiedCodeRecord(result.codeRecord);
    // Initialize empty cart or standard basic food basket
    setCart([]);
    setStep('pick_items');
  };

  // Cart Management
  const updateQuantity = (product: Product, delta: number) => {
    if (delta > 0 && verifiedBeneficiary) {
      const maxLimit = dataService.getProductLimit(product.id, verifiedBeneficiary.familySize);
      const currentQty = getProductQuantityInCart(product.id);
      if (maxLimit !== null && currentQty + delta > maxLimit) {
        return;
      }
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) {
          return prev.filter((item) => item.productId !== product.id);
        }
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: newQty } : item
        );
      } else if (delta > 0) {
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            pointsCost: product.pointsCost,
            quantity: 1,
          },
        ];
      }
      return prev;
    });
  };

  const getProductQuantityInCart = (productId: string): number => {
    const found = cart.find((item) => item.productId === productId);
    return found ? found.quantity : 0;
  };

  // Cart Totals & Leftover calculation
  const totalCartPoints = cart.reduce((sum, item) => sum + item.pointsCost * item.quantity, 0);
  const totalCartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const currentBalance = verifiedBeneficiary?.pointsBalance || 0;
  const balanceAfter = currentBalance - totalCartPoints;
  const isBalanceInsufficient = totalCartPoints > currentBalance;

  // Execute Atomic Delivery - only called after explicit confirmation
  const executeDelivery = async () => {
    if (!verifiedBeneficiary || !verifiedCodeRecord || !currentUser) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await dataService.processCharityDeliveryAtomic({
        code: verifiedCodeRecord.code,
        currentMonth,
        staffId: currentUser.id,
        staffName: currentUser.fullName,
        items: cart,
        notes: deliveryNotes,
      });

      if (!result.success || !result.delivery) {
        setSubmitError(result.error || 'فشلت عملية الصرف');
        setIsSubmitting(false);
        return;
      }

      setCompletedDelivery(result.delivery);
      setShowConfirmDialog(false);
      setStep('success_receipt');
      onRefresh();

      // Scroll to top of invoice so mobile users see the complete invoice from the header
      setTimeout(() => {
        const mainEl = document.querySelector('main');
        if (mainEl) {
          mainEl.scrollTo({ top: 0, behavior: 'smooth' });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    } catch {
      setSubmitError('حدث خطأ غير متوقع أثناء معالجة المعاملة الذرية');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open confirmation dialog when staff presses "تسليم"
  const handleOpenConfirmDialog = () => {
    if (!verifiedBeneficiary || !verifiedCodeRecord || !currentUser) return;
    if (cart.length === 0 || totalCartPoints === 0) {
      setSubmitError('يرجى اختيار صنف تمويني واحد على الأقل قبل التأكيد');
      return;
    }
    if (isBalanceInsufficient) {
      setSubmitError('رصيد المستفيد غير كافٍ لإتمام عملية الصرف الحالية');
      return;
    }

    setSubmitError(null);
    setShowConfirmDialog(true);
  };

  // Reset for Next Delivery
  const handleReset = () => {
    setInputCode('');
    setVerifyError(null);
    setVerifiedBeneficiary(null);
    setVerifiedCodeRecord(null);
    setCart([]);
    setDeliveryNotes('');
    setCompletedDelivery(null);
    setStep('verify_code');
  };

  // Print Receipt
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Step 1: Code Entry */}
      {step === 'verify_code' && (
        <div className="rounded-2xl bg-[#161D1A] border border-[#26312C] p-6 md:p-8 shadow-sm text-center max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#34C38F]/15 text-[#34C38F] flex items-center justify-center mx-auto shadow-lg shadow-[#34C38F]/10">
            <KeyRound className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-[#E8EDEA]">
              تسليم مستفيد
            </h1>
            <p className="text-xs text-[#8A9690] mt-1.5 max-w-md mx-auto leading-relaxed">
              أدخل كود الاستلام الشهري المعتمد والمستلم من قبل المستفيد عبر رسالة SMS
              لشهر {formatMonthArabic(currentMonth)}.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C2521] border border-[#26312C] text-xs text-[#E0B35A]">
              <span>منفذ التوزيع: مقر الجمعية الرئيسي بالقرية</span>
            </div>
          </div>

          {isMonthClosed && (
            <div className="p-4 rounded-xl bg-[#E0B35A]/15 border border-[#E0B35A]/40 text-[#E0B35A] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right">
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5 flex-shrink-0 text-[#E0B35A]" />
                <div>
                  <div className="font-bold text-sm">دورة شهر {formatMonthArabic(currentMonth)} مغلقة (تم تسليمه بالكامل)</div>
                  <div className="text-[11px] text-[#8A9690] mt-0.5">
                    تم إغلاق دورة الصرف لهذا الشهر، ولا يمكن تسجيل عمليات صرف جديدة. يمكنك فتح دورة شهر جديد من قسم الأكواد الشهرية.
                  </div>
                </div>
              </div>
              <span className="self-start sm:self-center px-2.5 py-1 rounded-full bg-[#E0B35A]/20 text-[#E0B35A] font-bold text-[10px] whitespace-nowrap">
                تم تسليمه
              </span>
            </div>
          )}

          {verifyError && (
            <div className="p-3.5 rounded-xl bg-[#F0707A]/15 border border-[#F0707A]/30 text-[#F0707A] text-xs flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}

          {/* Code Input Box accepting full code (ignores spaces & case) */}
          <div className="space-y-3">
            <input
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck="false"
              disabled={isMonthClosed}
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isMonthClosed) handleVerify();
              }}
              placeholder={isMonthClosed ? 'الشهر مغلق ولا يقبل الصرف' : 'أدخل كود الاستعلام الشهري...'}
              className="w-full max-w-sm mx-auto text-center font-mono text-base sm:text-lg font-extrabold tracking-wider px-4 py-3 rounded-2xl bg-[#1C2521] border-2 border-[#26312C] focus:border-[#34C38F] text-[#E0B35A] focus:outline-none shadow-inner disabled:opacity-50 disabled:cursor-not-allowed placeholder:font-['Cairo',sans-serif] placeholder:font-medium placeholder:tracking-normal"
            />

            <div>
              <button
                type="button"
                onClick={() => handleVerify()}
                disabled={isMonthClosed}
                className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 py-3 rounded-xl bg-[#34C38F] hover:bg-[#2bb27f] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#34C38F] text-[#0F1412] font-bold text-sm shadow-lg transition active:scale-95 cursor-pointer"
              >
                <span>التحقق من الكود والمستفيد</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Pick Products & Quantities */}
      {step === 'pick_items' && verifiedBeneficiary && (
        <div className="space-y-6">
          {/* Beneficiary Verified Top Card */}
          <div className="rounded-2xl bg-[#161D1A] border border-[#26312C] p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#34C38F]/15 text-[#34C38F] flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-[#E8EDEA]">
                      {verifiedBeneficiary.fullName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#34C38F]/15 text-[#34C38F] text-[10px] font-bold border border-[#34C38F]/30">
                      كود صحيح لشهر أكتوبر 2026
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#8A9690] mt-1">
                    <span>
                      الرقم القومي: {maskNationalId(verifiedBeneficiary.nationalId)}
                    </span>
                    <span>•</span>
                    <span>الهاتف: {verifiedBeneficiary.phone}</span>
                    <span>•</span>
                    <span>الأسرة: {verifiedBeneficiary.familySize} أفراد</span>
                  </div>
                </div>
              </div>

              {/* Current Points Balance Pill */}
              <div className="flex items-center gap-3 bg-[#1C2521] border border-[#26312C] rounded-2xl p-3">
                <div className="text-right">
                  <div className="text-[11px] text-[#8A9690]">الرصيد المتاح للصرف</div>
                  <div className="text-xl font-extrabold text-[#E0B35A]">
                    {verifiedBeneficiary.pointsBalance}{' '}
                    <span className="text-xs font-normal text-[#8A9690]">نقطة</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#E0B35A]/15 text-[#E0B35A] flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {submitError && (
            <div className="p-3.5 rounded-xl bg-[#F0707A]/15 border border-[#F0707A]/30 text-[#F0707A] text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Two-Column Layout: Products Catalog on Right, Basket Summary on Left */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Products Catalog (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#E8EDEA]">
                  اختر السلع التموينية المطلوبة للحصة:
                </h2>
                <span className="text-xs text-[#8A9690]">
                  السلع المتاحة ({products.filter((p) => p.isActive).length})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products
                  .filter((p) => p.isActive)
                  .map((product) => {
                    const inCartQty = getProductQuantityInCart(product.id);
                    const maxLimit = verifiedBeneficiary
                      ? dataService.getProductLimit(product.id, verifiedBeneficiary.familySize)
                      : null;
                    const isLimitReached = maxLimit !== null && inCartQty >= maxLimit;

                    return (
                      <div
                        key={product.id}
                        className={`rounded-2xl border p-4 transition flex flex-col justify-between ${
                          inCartQty > 0
                            ? 'bg-[#1C2521] border-[#34C38F]/50 shadow-md'
                            : 'bg-[#161D1A] border-[#26312C] hover:border-[#34C38F]/30'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-[#E8EDEA] text-sm">
                                  {product.name}
                                </h4>
                                {maxLimit !== null && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E0B35A]/15 text-[#E0B35A] font-bold border border-[#E0B35A]/30">
                                    الحد الأقصى {maxLimit}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#8A9690] mt-0.5">
                                {product.unit} • {product.category}
                              </div>
                            </div>
                            <div className="text-xs font-bold text-[#E0B35A] px-2 py-1 rounded-lg bg-[#E0B35A]/10 border border-[#E0B35A]/20 whitespace-nowrap">
                              {product.pointsCost} نقطة
                            </div>
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="mt-4 pt-3 border-t border-[#26312C] flex items-center justify-between">
                          <span className="text-xs text-[#8A9690]">الكمية المصروفة:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(product, -1)}
                              disabled={inCartQty === 0}
                              className="w-8 h-8 rounded-lg bg-[#26312C] hover:bg-[#32403a] disabled:opacity-30 disabled:hover:bg-[#26312C] text-[#E8EDEA] flex items-center justify-center transition cursor-pointer"
                              aria-label={`تقليل كمية ${product.name}`}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-mono font-bold text-sm w-7 text-center text-[#E8EDEA]">
                              {inCartQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(product, 1)}
                              disabled={isLimitReached}
                              className="w-8 h-8 rounded-lg bg-[#34C38F] hover:bg-[#2bb27f] disabled:opacity-35 disabled:hover:bg-[#34C38F] text-[#0F1412] font-bold flex items-center justify-center transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
                              aria-label={`زيادة كمية ${product.name}`}
                              title={isLimitReached ? `تم الوصول للحد الأقصى المسموح (${maxLimit} قطع)` : undefined}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Live Basket Summary & Confirmation (4 cols) */}
            <div id="basket-summary" className="lg:col-span-4 rounded-2xl bg-[#161D1A] border border-[#26312C] p-4 sm:p-5 shadow-sm space-y-4 sticky top-20">
              <div className="flex items-center justify-between pb-3 border-b border-[#26312C]">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#34C38F]" />
                  <h3 className="font-bold text-sm text-[#E8EDEA]">ملخص الحصة</h3>
                </div>
                <span className="text-xs text-[#8A9690]">{totalCartUnits} قطع</span>
              </div>

              {/* Basket Items List */}
              {cart.length === 0 ? (
                <div className="py-8 text-center text-[#8A9690] text-xs">
                  السلة فارغة. انقر على (+) لإضافة السلع.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-[#26312C]/60"
                    >
                      <div>
                        <div className="font-medium text-[#E8EDEA]">{item.productName}</div>
                        <div className="text-[10px] text-[#8A9690]">
                          {item.quantity} × {item.pointsCost} نقطة
                        </div>
                      </div>
                      <div className="font-bold text-[#E0B35A]">
                        {item.quantity * item.pointsCost} نقطة
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Points Calculation Block */}
              <div className="pt-3 border-t border-[#26312C] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#8A9690]">
                  <span>إجمالي تكلفة السلع:</span>
                  <span className="font-bold text-[#E8EDEA]">{totalCartPoints} نقطة</span>
                </div>
                <div className="flex items-center justify-between text-[#8A9690]">
                  <span>الرصيد المتوفر:</span>
                  <span className="font-bold text-[#E0B35A]">{currentBalance} نقطة</span>
                </div>
                <div
                  className={`flex items-center justify-between pt-2 border-t border-[#26312C] font-bold ${
                    isBalanceInsufficient ? 'text-[#F0707A]' : 'text-[#34C38F]'
                  }`}
                >
                  <span>الرصيد بعد الصرف:</span>
                  <span className="text-sm font-extrabold">{balanceAfter} نقطة</span>
                </div>
              </div>

              {/* Insufficient balance error */}
              {isBalanceInsufficient && (
                <div className="p-2.5 rounded-xl bg-[#F0707A]/15 border border-[#F0707A]/30 text-[#F0707A] text-[11px] leading-relaxed">
                  تنبيه: إجمالي النقاط المطلوبة يتجاوز رصيد المستفيد. يرجى تقليل بعض الأصناف.
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-[11px] text-[#8A9690] mb-1">
                  ملاحظات الصرف (اختياري)
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="ملاحظات التسليم الميداني..."
                  className="w-full bg-[#1C2521] border border-[#26312C] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#E8EDEA] focus:outline-none focus:border-[#34C38F]"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleOpenConfirmDialog}
                  disabled={cart.length === 0 || isBalanceInsufficient || isSubmitting}
                  className="w-full py-3 rounded-xl bg-[#34C38F] hover:bg-[#2bb27f] disabled:opacity-40 disabled:hover:bg-[#34C38F] text-[#0F1412] font-bold text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تسليم الحصة التموينية</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-2.5 rounded-xl bg-[#1C2521] hover:bg-[#26312C] text-[#8A9690] text-xs font-semibold transition cursor-pointer"
                >
                  إلغاء والعودة
                </button>
              </div>
            </div>
          </div>

          {/* Floating Mobile Cart Bar (for phones and tablets < lg when cart has items) */}
          {cart.length > 0 && (
            <div className="lg:hidden fixed bottom-[4.75rem] left-2.5 right-2.5 z-30 bg-[#161D1A]/95 border border-[#34C38F]/50 backdrop-blur-md rounded-2xl p-3 shadow-2xl flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#34C38F]/20 text-[#34C38F] flex items-center justify-center font-bold text-xs">
                  {totalCartUnits}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#E8EDEA]">
                    {totalCartPoints} نقطة
                    <span className="text-[10px] text-[#8A9690] mr-1.5 font-normal">
                      (المتبقي: {balanceAfter}ن)
                    </span>
                  </div>
                  <div className="text-[10px] text-[#34C38F]">
                    {isBalanceInsufficient ? 'تجاوز الرصيد المتاح!' : 'جاهز للتسليم'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenConfirmDialog}
                disabled={cart.length === 0 || isBalanceInsufficient || isSubmitting}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#34C38F] hover:bg-[#2bb27f] disabled:opacity-40 text-[#0F1412] font-bold text-xs shadow-md active:scale-95 transition cursor-pointer"
              >
                <span>تسليم</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Confirmation Dialog Step */}
          {showConfirmDialog && verifiedBeneficiary && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 animate-fade-in no-print">
              <div className="w-full max-w-lg rounded-2xl bg-[#161D1A] border border-[#34C38F]/50 p-5 sm:p-6 shadow-2xl text-[#E8EDEA] space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center gap-3 pb-3 border-b border-[#26312C]">
                  <div className="w-10 h-10 rounded-xl bg-[#34C38F]/20 text-[#34C38F] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#E8EDEA]">
                      تأكيد تسليم الحصة التموينية
                    </h3>
                    <span className="text-xs text-[#8A9690]">
                      مراجعة بيانات المستفيد والأصناف قبل تأكيد الصرف
                    </span>
                  </div>
                </div>

                {/* Beneficiary details (Name, Phone, Code - no national id needed here) */}
                <div className="p-3 bg-[#1C2521] rounded-xl border border-[#26312C] space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#8A9690]">اسم المستفيد:</span>
                    <strong className="text-sm font-bold text-[#E8EDEA]">{verifiedBeneficiary.fullName}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#8A9690]">رقم الهاتف:</span>
                    <span className="font-mono text-[#E8EDEA]">{verifiedBeneficiary.phone}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#8A9690]">كود الاستلام:</span>
                    <span className="font-mono font-bold text-[#E0B35A]">{verifiedCodeRecord?.code}</span>
                  </div>
                </div>

                {/* Chosen items with quantities */}
                <div className="space-y-1.5">
                  <div className="font-semibold text-xs text-[#8A9690]">
                    الأصناف المختارة ({totalCartUnits} قطعة):
                  </div>
                  <div className="max-h-44 overflow-y-auto border border-[#26312C] rounded-xl divide-y divide-[#26312C] bg-[#1C2521]">
                    {cart.map((item) => (
                      <div key={item.productId} className="flex justify-between items-center px-3 py-2 text-xs">
                        <div>
                          <span className="font-medium text-[#E8EDEA]">{item.productName}</span>
                          <span className="text-[11px] text-[#8A9690] mr-2">
                            ({item.pointsCost} نقطة)
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-[#E8EDEA]">× {item.quantity}</span>
                          <span className="font-mono font-bold text-[#34C38F] w-14 text-left">
                            {item.pointsCost * item.quantity}ن
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Points Summary */}
                <div className="p-3.5 bg-[#161D1A] rounded-xl border border-[#26312C] space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-[#8A9690]">
                    <span>رصيد الأسرة المتاح:</span>
                    <span className="font-mono font-bold text-[#E8EDEA]">{currentBalance} نقطة</span>
                  </div>
                  <div className="flex justify-between items-center text-[#34C38F] font-bold">
                    <span>إجمالي نقاط الأصناف:</span>
                    <span className="font-mono text-sm">{totalCartPoints} نقطة</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-[#26312C] text-[#E0B35A] font-bold">
                    <span>الرصيد المتبقي:</span>
                    <span className="font-mono text-sm">{balanceAfter} نقطة</span>
                  </div>
                  <p className="text-[10px] text-[#8A9690] pt-1">
                    * ملاحظة: النقاط المتبقية ({balanceAfter} نقطة) تنتهي صلاحيتها بانتهاء هذا الصرف ولا ترحل.
                  </p>
                </div>

                {/* Action buttons: Only تأكيد التسليم saves the delivery. Disabled while saving */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowConfirmDialog(false)}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1C2521] hover:bg-[#26312C] text-[#8A9690] hover:text-[#E8EDEA] text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={executeDelivery}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#34C38F] hover:bg-[#2bb27f] disabled:opacity-50 text-[#0F1412] font-bold text-xs transition cursor-pointer shadow-lg active:scale-95"
                  >
                    {isSubmitting ? (
                      <span>جاري حفظ وتأكيد التسليم...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تأكيد التسليم</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Success Screen with Official Printable Invoice */}
      {step === 'success_receipt' && completedDelivery && (
        <InvoiceModal
          delivery={completedDelivery}
          isNewDeliverySuccess={true}
          isInline={true}
          onNewDelivery={handleReset}
          onClose={handleReset}
        />
      )}
    </div>
  );
};
