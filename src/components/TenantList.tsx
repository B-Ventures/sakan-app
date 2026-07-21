/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Tenant, formatCurrency } from '../types';
import { Plus, Edit2, Trash2, Phone, Mail, User, ShieldAlert, CheckCircle, Search, Home, DollarSign } from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';
import { useLanguage } from '../context/LanguageContext';

interface TenantListProps {
  tenants: Tenant[];
  onAddTenant: (tenant: Omit<Tenant, 'id'>) => void;
  onEditTenant: (tenant: Tenant) => void;
  onDeleteTenant: (id: string) => void;
  activeBuilding?: any;
  isReadOnly?: boolean;
}

export default function TenantList({
  tenants,
  onAddTenant,
  onEditTenant,
  onDeleteTenant,
  activeBuilding,
  isReadOnly = false,
}: TenantListProps) {
  const { t, language } = useLanguage();
  const [filter, setFilter] = useState<'all' | 'active' | 'vacant'>('all');
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields State
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [monthlyRent, setMonthlyRent] = useState<number>(activeBuilding?.defaultBaseRent ?? 1000);
  const [guardFee, setGuardFee] = useState<number>(activeBuilding?.defaultGuardFee ?? 50);
  const [maintenanceFee, setMaintenanceFee] = useState<number>(activeBuilding?.defaultMaintenanceFee ?? 30);
  const [rentDueDateDay, setRentDueDateDay] = useState<number>(5);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'vacant'>('active');

  const openAddForm = () => {
    setEditingTenant(null);
    setName('');
    setUnit('');
    setMonthlyRent(activeBuilding?.defaultBaseRent ?? 1000);
    setGuardFee(activeBuilding?.defaultGuardFee ?? 50);
    setMaintenanceFee(activeBuilding?.defaultMaintenanceFee ?? 30);
    setRentDueDateDay(5);
    setStartDate('2026-06-01');
    setEndDate('2027-06-01');
    setPhone('');
    setEmail('');
    setStatus('active');
    setIsFormOpen(true);
  };

  const openEditForm = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setName(tenant.name);
    setUnit(tenant.unit);
    setMonthlyRent(tenant.monthlyRent);
    setGuardFee(tenant.guardFee ?? 50);
    setMaintenanceFee(tenant.maintenanceFee ?? 30);
    setRentDueDateDay(tenant.rentDueDateDay);
    setStartDate(tenant.startDate);
    setEndDate(tenant.endDate);
    setPhone(tenant.phone);
    setEmail(tenant.email);
    setStatus(tenant.status);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit) {
      alert('Unit number is required');
      return;
    }

    const tenantPayload = {
      name: status === 'vacant' ? 'Vacant / Available' : name || 'Unnamed Tenant',
      unit,
      monthlyRent: Number(monthlyRent),
      guardFee: Number(guardFee),
      maintenanceFee: Number(maintenanceFee),
      rentDueDateDay: Number(rentDueDateDay),
      startDate: status === 'vacant' ? '' : startDate,
      endDate: status === 'vacant' ? '' : endDate,
      phone: status === 'vacant' ? '' : phone,
      email: status === 'vacant' ? '' : email,
      status,
    };

    if (editingTenant) {
      onEditTenant({
        ...editingTenant,
        ...tenantPayload,
      });
    } else {
      onAddTenant(tenantPayload);
    }
    setIsFormOpen(false);
  };

  const filteredTenants = tenants.filter(t => {
    // filter state
    if (filter === 'active' && t.status !== 'active') return false;
    if (filter === 'vacant' && t.status !== 'vacant') return false;

    // search bar
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchUnit = t.unit.toLowerCase().includes(q);
      const matchEmail = t.email.toLowerCase().includes(q);
      const matchPhone = t.phone.toLowerCase().includes(q);
      return matchName || matchUnit || matchEmail || matchPhone;
    }
    return true;
  });

  return (
    <div className="space-y-6" id="tenant-list-module">
      {/* Header operations bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{t('tenantListTitle')}</h2>
          <p className="text-xs text-slate-400">{t('tenantListSub')}</p>
        </div>
        <button
          onClick={openAddForm}
          disabled={isReadOnly}
          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg self-start sm:self-center shadow-sm transition-colors disabled:opacity-50 disabled:pointer-events-none"
          id="btn-add-unit"
        >
          <Plus className="w-4 h-4" />
          {t('registerUnitBeneficiary')}
        </button>
      </div>

      {isReadOnly && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3 text-xs text-rose-800 animate-in fade-in duration-300">
          <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
          <div>
            <p className="font-bold">
              {language === 'ar' 
                ? 'وضع المعاينة للقراءة فقط (الاشتراك منتهي)' 
                : 'Read-Only Preview Mode (Subscription Expired)'}
            </p>
            <p className="mt-0.5 opacity-90">
              {language === 'ar' 
                ? 'تم إيقاف العمليات التفاعلية وإمكانية الحفظ أو التعديل مؤقتاً لهذا البناية نظراً لانتهاء رخصة الاشتراك المتميزة.' 
                : 'Interactive operations and saving modifications have been disabled temporarily due to expired subscription license.'}
            </p>
          </div>
        </div>
      )}

      {/* Controls & searching */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Toggle selectors */}
        <div className="flex gap-2 bg-slate-50 p-1 rounded-xl self-stretch md:self-auto">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 md:flex-none py-1.5 px-4 rounded-lg font-bold text-xs transition-colors ${
              filter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {t('allPortfolios')} ({tenants.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`flex-1 md:flex-none py-1.5 px-4 rounded-lg font-bold text-xs transition-colors ${
              filter === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {t('occupied')} ({tenants.filter(t => t.status === 'active').length})
          </button>
          <button
            onClick={() => setFilter('vacant')}
            className={`flex-1 md:flex-none py-1.5 px-4 rounded-lg font-bold text-xs transition-colors ${
              filter === 'vacant' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {t('vacant')} ({tenants.filter(t => t.status === 'vacant').length})
          </button>
        </div>

        {/* Text Filter search bar */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder={language === 'ar' ? "ابحث عن المستأجر، رقم الشقة، الهاتف..." : "Search tenant name, unit, phone..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs py-2 ps-9 pe-4 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Grid of Tenant Units */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTenants.map((tItem) => (
          <div key={tItem.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              {/* Unit Header identifier */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs flex items-center gap-1 font-mono">
                  <Home className="w-3.5 h-3.5" />
                  {t('unit')} {tItem.unit}
                </span>
                <span className={`text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                  tItem.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700'
                    : tItem.status === 'vacant'
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-orange-50 text-orange-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${tItem.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                  {tItem.status === 'active' ? t('active') : tItem.status === 'vacant' ? t('vacant') : t('inactive')}
                </span>
              </div>

              {/* Main Info */}
              <div className="space-y-3.5">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    {tItem.name}
                  </h3>
                </div>

                {tItem.status !== 'vacant' && (
                  <div className="text-slate-500 space-y-1.5 text-xs">
                    {tItem.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{tItem.phone}</span>
                      </div>
                    )}
                    {tItem.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 break-all" />
                        <span>{tItem.email}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 grid grid-cols-2 gap-x-2 gap-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">{t('baseMonthlyShare')}</span>
                    <span className="font-bold text-slate-800 text-xs flex items-center font-mono">
                      {formatCurrency(tItem.monthlyRent, activeBuilding?.currency || 'JOD')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">{t('dueCycle')}</span>
                    <span className="font-bold text-slate-700">{t('dueDay')} {tItem.rentDueDateDay}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100/70">
                    <span className="text-slate-400 font-semibold block text-[10px]">{t('guardSalary')}</span>
                    <span className="font-bold text-slate-700 font-mono text-xs">
                      {formatCurrency(tItem.guardFee ?? 50, activeBuilding?.currency || 'JOD')}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100/70">
                    <span className="text-slate-400 font-semibold block text-[10px]">{t('maintenanceBox')}</span>
                    <span className="font-bold text-slate-700 font-mono text-xs">
                      {formatCurrency(tItem.maintenanceFee ?? 30, activeBuilding?.currency || 'JOD')}
                    </span>
                  </div>
                </div>

                {tItem.status !== 'vacant' && tItem.startDate && (
                  <div className="text-[10px] text-slate-400 flex justify-between pt-1">
                    <span>{t('termStart')} {tItem.startDate}</span>
                    <span>{t('to')} {tItem.endDate || t('ongoing')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Panel */}
            <div className="flex border-t border-slate-100/70 mt-5 pt-4 gap-2">
              <button
                onClick={() => openEditForm(tItem)}
                disabled={isReadOnly}
                className="flex-1 flex justify-center items-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs py-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <Edit2 className="w-3.5 h-3.5" />
                {t('editUnitProfile')}
              </button>
              <button
                onClick={() => {
                  setDeleteConfirmId(tItem.id);
                }}
                disabled={isReadOnly}
                className="p-2 border border-rose-100 hover:border-rose-200 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                title={language === 'ar' ? 'حذف سجل المقيم' : 'Remove occupant record'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {filteredTenants.length === 0 && (
          <div className="col-span-full text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl" id="empty-state-tenants">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">{t('noUnitsMatched')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('noUnitsMatchedSub')}</p>
          </div>
        )}
      </div>

      {/* Custom Add/Edit slide-over/dialog drawer */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in-50 zoom-in-95 duration-200">
            <div className="bg-slate-50 border-b p-5 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-slate-800">
                {editingTenant ? `${t('editInformationUnit')} ${editingTenant.unit}` : t('registerUnitBeneficiary')}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                {/* Unit Identification */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t('unitNumberLabel')}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Status selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t('occupancyStatus')}</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="active">{t('occupiedActive')}</option>
                    <option value="vacant">{t('vacantOpen')}</option>
                    <option value="inactive">{t('inactiveStatus')}</option>
                  </select>
                </div>
              </div>

              {status !== 'vacant' && (
                <>
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t('beneficiaryNameLabel')}</label>
                    <input
                      type="text"
                      required
                      placeholder="Sarah Jenkins"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Phone contact */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t('countryPhoneLabel')}</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +15550199"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">{t('countryPhoneHelp')}</span>
                  </div>

                  {/* Email contact */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t('emailAddressLabel')}</label>
                    <input
                      type="email"
                      placeholder="sarah@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Financial parameters */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t('baseShareLabel')} ({activeBuilding?.currency || 'JOD'}) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t('dueCycleDayLabel')}</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={31}
                    value={rentDueDateDay}
                    onChange={(e) => setRentDueDateDay(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Guard Salary & Maintenance Box allocations */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t('guardSalaryLabel')} ({activeBuilding?.currency || 'JOD'}) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={guardFee}
                    onChange={(e) => setGuardFee(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t('maintenanceBoxLabel')} ({activeBuilding?.currency || 'JOD'}) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={maintenanceFee}
                    onChange={(e) => setMaintenanceFee(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {status !== 'vacant' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t('termStartDateLabel')}</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t('termEndDateLabel')}</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Action operations button bar */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-4 py-2 rounded-xl transition-colors animate-none"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-colors"
                >
                  {editingTenant ? t('saveChanges') : t('createRecord')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Overlay */}
      <ConfirmationDialog
        isOpen={deleteConfirmId !== null}
        title={t('deleteUnitConfirmTitle')}
        message={t('deleteUnitConfirmMessage')}
        confirmLabel={t('permanentlyDelete')}
        cancelLabel={t('keepRecord')}
        onConfirm={() => {
          if (deleteConfirmId) {
            onDeleteTenant(deleteConfirmId);
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
