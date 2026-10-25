import React, { useState } from 'react';
import {
  ClipboardList,
  ShieldAlert,
  Download,
  Search,
  Filter,
  Eye,
  ShoppingBag,
  Sparkles,
  UserCheck,
  Receipt,
  Printer,
} from 'lucide-react';
import { DeliveryRecord, AuditLogEntry } from '../types/index.ts';
import { dataService } from '../services/dataService.ts';
import { InvoiceModal } from './InvoiceModal.tsx';

interface LogsViewProps {
  deliveries: DeliveryRecord[];
  auditLogs: AuditLogEntry[];
}

export const LogsView: React.FC<LogsViewProps> = ({ deliveries, auditLogs }) => {
  const [activeTab, setActiveTab] = useState<'deliveries' | 'audit'>('deliveries');
  const [searchQuery, setSearchQuery] = useState('');
  const [staffFilter, setStaffFilter] = useState('الكل');
  const [selectedDeliveryForInvoice, setSelectedDeliveryForInvoice] = useState<DeliveryRecord | null>(null);

  // Filter deliveries
  const safeDeliveries = Array.isArray(deliveries) ? deliveries : [];
  const safeAuditLogs = Array.isArray(auditLogs) ? auditLogs : [];

  const filteredDeliveries = safeDeliveries.filter((d) => {
    if (!d) return false;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (d.beneficiaryName || '').toLowerCase().includes(q) ||
      (d.deliveryCode || '').includes(q) ||
      (d.staffName || '').toLowerCase().includes(q);
    const matchesStaff = staffFilter === 'الكل' || d.staffName === staffFilter;
    return matchesSearch && matchesStaff;
  });

  // Unique staff names for filter dropdown
  const uniqueStaff = Array.from(new Set(safeDeliveries.map((d) => d?.staffName).filter(Boolean))) as string[];

  // Filter audit logs
  const filteredAuditLogs = safeAuditLogs.filter((l) => {
    if (!l) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      (l.actorName || '').toLowerCase().includes(q) ||
      (l.details || '').toLowerCase().includes(q) ||
      (l.targetName && l.targetName.toLowerCase().includes(q))
    );
  });

  // Action badge renderer
  const renderAuditBadge = (action: string) => {
    switch (action) {
      case 'INVOICE_ISSUED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#34C38F]/15 text-[#34C38F] border border-[#34C38F]/30 font-semibold text-[11px]">
            <Receipt className="w-3 h-3 text-[#34C38F]" />
            <span>إصدار فاتورة</span>
          </span>
        );
      case 'INVOICE_PRINTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E0B35A]/15 text-[#E0B35A] border border-[#E0B35A]/30 font-semibold text-[11px]">
            <Printer className="w-3 h-3 text-[#E0B35A]" />
            <span>طباعة فاتورة</span>
          </span>
        );
      case 'INVOICE_DOWNLOADED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#34C38F]/15 text-[#34C38F] border border-[#34C38F]/30 font-semibold text-[11px]">
            <Download className="w-3 h-3 text-[#34C38F]" />
            <span>تحميل فاتورة</span>
          </span>
        );
      case 'NATIONAL_ID_REVEAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E0B35A]/15 text-[#E0B35A] border border-[#E0B35A]/30 font-semibold text-[11px]">
            <Eye className="w-3 h-3" />
            <span>كشف رقم قومي</span>
          </span>
        );
      case 'DELIVERY_DISPATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#34C38F]/15 text-[#34C38F] border border-[#34C38F]/30 font-semibold text-[11px]">
            <ShoppingBag className="w-3 h-3" />
            <span>صرف حصة</span>
          </span>
        );
      case 'GENERATE_CODES':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#34C38F]/15 text-[#34C38F] border border-[#34C38F]/30 font-semibold text-[11px]">
            <Sparkles className="w-3 h-3" />
            <span>توليد أكواد</span>
          </span>
        );
      case 'STAFF_LOGIN':
      case 'STAFF_LOGOUT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1C2521] text-[#8A9690] border border-[#26312C] font-semibold text-[11px]">
            <UserCheck className="w-3 h-3" />
            <span>تسجيل دخول/خروج</span>
          </span>
        );
      case 'STAFF_CREATE':
      case 'STAFF_UPDATE':
      case 'STAFF_TOGGLE':
      case 'STAFF_RESET_PWD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#34C38F]/15 text-[#34C38F] border border-[#34C38F]/30 font-semibold text-[11px]">
            <UserCheck className="w-3 h-3" />
            <span>إدارة الموظفين</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1C2521] text-[#8A9690] border border-[#26312C] font-semibold text-[11px]">
            <span>{action}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161D1A] border border-[#26312C] rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#34C38F]" />
            <h1 className="text-xl font-bold text-[#E8EDEA]">سجل العمليات والتدقيق الأمني</h1>
          </div>
          <p className="text-xs text-[#8A9690] mt-1">
            توثيق رقمي فوري لعمليات تسليم السلع وكشف الأرقام القومية وإجراءات فريق العمل.
          </p>
        </div>

        {/* Tab Switcher & Export */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-[#1C2521] border border-[#26312C] rounded-xl p-1 text-xs">
            <button
              onClick={() => setActiveTab('deliveries')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'deliveries'
                  ? 'bg-[#34C38F] text-[#0F1412] shadow-sm'
                  : 'text-[#8A9690] hover:text-[#E8EDEA]'
              }`}
            >
              عمليات الصرف ({deliveries.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'bg-[#34C38F] text-[#0F1412] shadow-sm'
                  : 'text-[#8A9690] hover:text-[#E8EDEA]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>سجل التدقيق ({auditLogs.length})</span>
            </button>
          </div>

          {activeTab === 'deliveries' && (
            <button
              onClick={() => dataService.exportDeliveriesCsv(filteredDeliveries)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1C2521] hover:bg-[#26312C] border border-[#26312C] text-[#E8EDEA] text-xs font-semibold transition"
              title="تصدير السجل إلى ملف Excel / CSV متوافق مع اللغة العربية"
            >
              <Download className="w-4 h-4 text-[#34C38F]" />
              <span>تصدير CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#161D1A] border border-[#26312C] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2.5 bg-[#1C2521] border border-[#26312C] rounded-xl px-3.5 py-2 flex-1 w-full">
          <Search className="w-4 h-4 text-[#8A9690]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'deliveries'
                ? 'ابحث باسم المستفيد، كود الصرف، أو مسؤول الصرف...'
                : 'ابحث في تفاصيل إجراءات التدقيق أو اسم الفاعل...'
            }
            className="w-full bg-transparent text-xs text-[#E8EDEA] placeholder-[#8A9690] focus:outline-none"
          />
        </div>

        {activeTab === 'deliveries' && uniqueStaff.length > 0 && (
          <div className="flex items-center gap-2 bg-[#1C2521] border border-[#26312C] rounded-xl px-3 py-2 text-xs w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-[#34C38F]" />
            <span className="text-[#8A9690]">الموظف:</span>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="bg-transparent text-[#E8EDEA] font-semibold focus:outline-none"
            >
              <option value="الكل">جميع الموظفين</option>
              {uniqueStaff.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Deliveries Tab Content */}
      {activeTab === 'deliveries' && (
        <div className="bg-[#161D1A] border border-[#26312C] rounded-2xl p-5 shadow-sm">
          {filteredDeliveries.length === 0 ? (
            <div className="py-14 text-center text-[#8A9690] text-sm space-y-2">
              <ClipboardList className="w-8 h-8 text-[#8A9690]/40 mx-auto" />
              <p>لا توجد أي عمليات صرف مطابقة لمعايير البحث الحالية.</p>
            </div>
          ) : (
            <>
              {/* Mobile Deliveries Cards (< 768px) */}
              <div className="md:hidden space-y-3">
                {filteredDeliveries.map((del) => (
                  <div
                    key={del.id}
                    className="p-4 rounded-xl bg-[#1C2521] border border-[#26312C] space-y-2.5 shadow-sm text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-[#E8EDEA]">{del.beneficiaryName}</div>
                        <div className="text-[11px] text-[#8A9690]">
                          بواسطة: {del.staffName} • {new Intl.DateTimeFormat('ar-EG', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(del.createdAt))}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-[#161D1A] border border-[#26312C] text-[#E0B35A]">
                        {del.deliveryCode}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="p-2.5 rounded-lg bg-[#161D1A] border border-[#26312C] text-[#8A9690] text-[11px] leading-relaxed">
                      {del.items.map((i) => `${i.productName} (${i.quantity} × ${i.unitPoints}ن)`).join(' + ')}
                    </div>

                    {/* Points balance & Invoice Action */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#26312C] text-[11px]">
                      <div>
                        <span>النقاط: </span>
                        <strong className="text-[#34C38F]">{del.totalPoints} نقطة</strong>
                      </div>
                      <div className="text-[#8A9690]">
                        <span>المتبقي: </span>
                        <strong className="text-[#E0B35A]">{del.expired_points ?? del.balanceAfter} نقطة</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#26312C]/60 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedDeliveryForInvoice(del)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#161D1A] border border-[#26312C] hover:border-[#34C38F]/50 text-[#34C38F] text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
                      >
                        <Receipt className="w-4 h-4" />
                        <span>استعراض الفاتورة / طباعة وحفظ</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop & Tablet Table (>= 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[#26312C] text-[#8A9690]">
                      <th className="pb-3 pr-2">كود الصرف</th>
                      <th className="pb-3">التاريخ والوقت</th>
                      <th className="pb-3">اسم المستفيد</th>
                      <th className="pb-3">مسؤول الصرف</th>
                      <th className="pb-3">السلع والأصناف المسلمة</th>
                      <th className="pb-3">إجمالي النقاط</th>
                      <th className="pb-3">الرصيد السابق</th>
                      <th className="pb-3">الرصيد المتبقي</th>
                      <th className="pb-3 pl-2 text-center">الفاتورة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#26312C]">
                    {filteredDeliveries.map((del) => (
                      <tr key={del.id} className="hover:bg-[#1C2521] transition">
                        <td className="py-3.5 pr-2 font-mono font-bold text-[#E0B35A]">
                          {del.deliveryCode}
                        </td>
                        <td className="py-3.5 text-[#8A9690]">
                          {new Intl.DateTimeFormat('ar-EG', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }).format(new Date(del.createdAt))}
                        </td>
                        <td className="py-3.5 font-semibold text-[#E8EDEA]">{del.beneficiaryName}</td>
                        <td className="py-3.5 text-[#8A9690]">{del.staffName}</td>
                        <td className="py-3.5 text-[#8A9690] max-w-xs">
                          {del.items
                            .map((i) => `${i.productName} (${i.quantity} × ${i.unitPoints}ن)`)
                            .join(' + ')}
                        </td>
                        <td className="py-3.5 font-bold text-[#34C38F]">
                          {del.totalPoints} نقطة
                        </td>
                        <td className="py-3.5 text-[#8A9690]">{del.balanceBefore} نقطة</td>
                        <td className="py-3.5 font-semibold text-[#E0B35A]">
                          {del.expired_points ?? del.balanceAfter} نقطة
                        </td>
                        <td className="py-3.5 pl-2 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedDeliveryForInvoice(del)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161D1A] border border-[#26312C] hover:border-[#34C38F]/50 hover:bg-[#34C38F]/10 text-[#34C38F] font-bold text-xs transition cursor-pointer"
                            title="عرض الفاتورة الرسمية وطباعتها"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>الفاتورة</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Security Audit Log Tab Content */}
      {activeTab === 'audit' && (
        <div className="bg-[#161D1A] border border-[#26312C] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs text-[#8A9690] pb-2 border-b border-[#26312C]">
            <span>
              سجل التدقيق الأمني الموثق • غير قابل للتعديل أو الحذف
            </span>
            <span>النتائج: {filteredAuditLogs.length} حركة أمنية</span>
          </div>

          {filteredAuditLogs.length === 0 ? (
            <div className="py-14 text-center text-[#8A9690] text-sm space-y-2">
              <ShieldAlert className="w-8 h-8 text-[#8A9690]/40 mx-auto" />
              <p>لا توجد سجلات تدقيق مطابقة لبحثك.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl bg-[#1C2521] border border-[#26312C] p-3.5 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-[#34C38F]/30 transition"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      {renderAuditBadge(log.action)}
                      <span className="font-bold text-[#E8EDEA]">{log.actorName}</span>
                      <span className="text-[10px] text-[#8A9690]">
                        ({log.actorRole === 'admin' ? 'مدير' : 'موظف'})
                      </span>
                    </div>
                    <div className="text-[#8A9690] leading-relaxed">{log.details}</div>
                  </div>

                  <div className="text-[11px] text-[#8A9690] whitespace-nowrap self-end md:self-center">
                    {new Intl.DateTimeFormat('ar-EG', {
                      dateStyle: 'medium',
                      timeStyle: 'medium',
                    }).format(new Date(log.createdAt))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invoice Modal for past delivery records */}
      {selectedDeliveryForInvoice && (
        <InvoiceModal
          delivery={selectedDeliveryForInvoice}
          isNewDeliverySuccess={false}
          onClose={() => setSelectedDeliveryForInvoice(null)}
        />
      )}
    </div>
  );
};
