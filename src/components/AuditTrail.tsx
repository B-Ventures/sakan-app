import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  Filter, 
  Clock, 
  User as UserIcon, 
  Trash2, 
  PlusCircle, 
  CheckCircle,
  AlertTriangle,
  FileText,
  Building as BuildingIcon
} from 'lucide-react';
import { AuditLog, Building } from '../types';
import { subscribeToAuditLogs } from '../firebaseService';

interface AuditTrailProps {
  activeBuilding: Building | null;
  isDemoMode: boolean;
}

const CONSTANT_DEMO_LOGS: AuditLog[] = [
  {
    id: 'demo-log-1',
    userId: 'demo-user-123',
    userEmail: 'demo.owner@landlord.com',
    action: 'CREATE_TENANT',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    details: 'Tenant "Sarah Jenkins" added to Unit "104" with monthly rent of 1,200 JOD.',
    entityType: 'tenant'
  },
  {
    id: 'demo-log-2',
    userId: 'demo-user-123',
    userEmail: 'demo.owner@landlord.com',
    action: 'CREATE_PAYMENT',
    timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(), // 14 mins ago
    details: 'Auto-generated rent cycle pending payment of 1,200 JOD for "Sarah Jenkins" (Unit 104, Month: 2026-06).',
    entityType: 'payment'
  },
  {
    id: 'demo-log-3',
    userId: 'demo-user-123',
    userEmail: 'demo.owner@landlord.com',
    action: 'CREATE_EXPENSE',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hrs ago
    details: 'New expense logged: "Elevator Inspection & Cable Lubrication" (Amount: 380 JOD, Category: "Maintenance").',
    entityType: 'expense'
  },
  {
    id: 'demo-log-4',
    userId: 'demo-user-123',
    userEmail: 'demo.owner@landlord.com',
    action: 'UPDATE_BUILDING_SETTINGS',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    details: 'Building configuration updated: currency, reminderTemplate.',
    entityType: 'building'
  },
  {
    id: 'demo-log-5',
    userId: 'demo-user-123',
    userEmail: 'demo.owner@landlord.com',
    action: 'DELETE_PAYMENT',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 days ago
    details: 'Payment record of 1,000 JOD for "John Smith" (Month 2026-04) was deleted.',
    entityType: 'payment'
  }
];

export default function AuditTrail({ activeBuilding, isDemoMode }: AuditTrailProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorVisible, setErrorVisible] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    if (!activeBuilding) {
      setLogs([]);
      setLoading(false);
      return;
    }

    if (isDemoMode) {
      setLogs(CONSTANT_DEMO_LOGS);
      setLoading(false);
      return;
    }

    // Safeguard transition from demo mode
    if (!isDemoMode && activeBuilding.id.startsWith('demo-')) {
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToAuditLogs(
      activeBuilding.id,
      (fetchedLogs) => {
        setLogs(fetchedLogs);
        setLoading(false);
      },
      (err) => {
        console.error("Audit log loading error:", err);
        setErrorVisible("Failed to subscribe to live audit logs. Confirm safety permission parameters.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeBuilding, isDemoMode]);

  // Unique actions for filters
  const actionCategories: string[] = ['ALL', ...Array.from(new Set<string>(logs.map(l => String(l.action))))];
  const typeCategories: string[] = ['ALL', ...Array.from(new Set<string>(logs.map(l => String(l.entityType || 'system'))))];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesType = typeFilter === 'ALL' || (log.entityType || 'system') === typeFilter;

    return matchesSearch && matchesAction && matchesType;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.startsWith('CREATE')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }
    if (action.startsWith('UPDATE')) {
      return 'bg-amber-50 text-amber-700 border-amber-100';
    }
    if (action.startsWith('DELETE')) {
      return 'bg-rose-50 text-rose-700 border-rose-100';
    }
    return 'bg-blue-50 text-blue-700 border-blue-100';
  };

  const getEntityTypeIcon = (type?: string) => {
    switch (type) {
      case 'tenant':
        return <UserIcon className="w-4 h-4 text-slate-500" />;
      case 'payment':
        return <FileText className="w-4 h-4 text-slate-500" />;
      case 'expense':
        return <Trash2 className="w-4 h-4 text-rose-400" />;
      case 'building':
        return <BuildingIcon className="w-4 h-4 text-indigo-500" />;
      default:
        return <Shield className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6" id="audit-trail-container">
      {/* Overview Card */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200">
              <Shield className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">System Audit Trail Ledger</h2>
              <p className="text-xs text-slate-400">Append-only, cryptographically synchronized records tracking every operations event for reliability, tracing and compliance.</p>
            </div>
          </div>
          {isDemoMode && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5 text-[10px] font-extrabold text-blue-700 flex items-center gap-1.5 self-start md:self-center">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              EVALUATION SANDBOX PREVIEW
            </div>
          )}
        </div>
      </div>

      {errorVisible && (
        <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          {errorVisible}
        </div>
      )}

      {/* Filters Bench */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Query Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by log details, emails, codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all font-sans"
              id="audit-search-input"
            />
          </div>

          {/* Action Filter */}
          <div className="relative">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50 font-sans cursor-pointer appearance-none"
              id="audit-action-filter"
            >
              <option value="ALL">All Actions</option>
              {actionCategories.filter(a => a !== 'ALL').map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <Filter className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50 font-sans cursor-pointer appearance-none"
              id="audit-type-filter"
            >
              <option value="ALL">All Entity Types</option>
              {typeCategories.filter(t => t !== 'ALL').map(typ => (
                <option key={typ} value={typ}>{typ.toUpperCase()}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <Filter className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-7 h-7 border-2 border-slate-200 border-t-slate-800 animate-spin rounded-full mx-auto mb-3"></div>
            <p className="text-slate-400 text-xs font-mono">RETRIEVING AUDIT RECORD FLUXES...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Shield className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
            <div>
              <p className="text-slate-700 text-xs font-extrabold">No Audit Logs Match Filter</p>
              <p className="text-slate-400 text-[11px] leading-normal mt-1 max-w-xs mx-auto">Either no write events have been registered in this building portfolio, or your current search criteria does not return records.</p>
            </div>
            {(searchTerm || actionFilter !== 'ALL' || typeFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setActionFilter('ALL');
                  setTypeFilter('ALL');
                }}
                className="text-[10px] font-extrabold text-blue-600 hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="py-3.5 px-6 block md:table-cell">Timestamp (Server Time)</th>
                  <th className="py-3.5 px-6">Action / Event</th>
                  <th className="py-3.5 px-6">Affected Records</th>
                  <th className="py-3.5 px-6">Operation Description</th>
                  <th className="py-3.5 px-6">User Auth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Timestamp */}
                    <td className="py-4 px-6 font-mono text-[11px] text-slate-500 whitespace-nowrap block md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Affected Scope Type */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700 capitalize">
                        {getEntityTypeIcon(log.entityType)}
                        {log.entityType || 'system'}
                      </div>
                    </td>

                    {/* Details */}
                    <td className="py-4 px-6 min-w-[280px]">
                      <p className="text-slate-600 font-medium leading-relaxed">{log.details}</p>
                      {log.entityId && (
                        <span className="inline-block mt-1 font-mono text-[9px] bg-slate-50 border text-slate-400 px-1.5 py-0.2 rounded">
                          REF_ID: {log.entityId}
                        </span>
                      )}
                    </td>

                    {/* User Auth */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-extrabold text-[9px] uppercase shrink-0">
                          {log.userEmail ? log.userEmail.slice(0, 2) : 'SY'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-[11px]">{log.userEmail || 'System Agent'}</span>
                          <span className="text-[9px] text-slate-400 font-mono">UID: {log.userId ? log.userId.slice(0, 6) : 'SYS'}...</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
