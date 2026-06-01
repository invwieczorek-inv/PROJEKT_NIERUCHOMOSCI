import React, { useState, useEffect } from "react";
import { getInvoicesForTenant, getPropertyById, getPaymentTimeliness } from "../../utils/storage";
import { CreditCard, CheckCircle, AlertTriangle, Calendar, FileText } from "lucide-react";
import { calculateTenantFinancialSummary } from "../../services/tenantService";

export default function TenantInvoices({ tenantId }) {
  const [invoices, setInvoices] = useState([]);

  const handleReload = () => {
    setInvoices(getInvoicesForTenant(tenantId).sort((a, b) => new Date(b.issueDate || b.createdAt) - new Date(a.issueDate || a.createdAt)));
  };

  useEffect(() => {
    handleReload();

    window.addEventListener("rentportal_invoices_updated", handleReload);
    return () => {
      window.removeEventListener("rentportal_invoices_updated", handleReload);
    };
  }, [tenantId]);

  const summary = calculateTenantFinancialSummary(invoices);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-400" />
            Moje Rachunki i Faktury
          </h2>
          <p className="text-dark-400 text-sm mt-1">Przeglądaj swoje opłaty czynszowe oraz rozliczenia mediów.</p>
        </div>

        {invoices.length > 0 && (
          <div className={`px-4 py-2 rounded-xl border font-sans text-xs flex items-center gap-2 shrink-0 ${
            summary.balance < 0 
              ? 'bg-red-500/10 border-red-500/20 text-red-400' 
              : summary.balance > 0 
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-green-500/10 border-green-500/20 text-green-400'
          }`}>
            <span>Moje ogólne saldo:</span>
            <strong className="font-extrabold text-sm font-mono">
              {summary.balance > 0 ? `+${summary.balance.toFixed(2)}` : summary.balance.toFixed(2)} PLN
            </strong>
          </div>
        )}
      </div>

      {/* Financial Aggregates Cards Panel */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="glass p-4 rounded-xl border-dark-800 text-center">
            <span className="text-xxs text-dark-500 block uppercase font-bold tracking-wider mb-1">Czynsze Najmu</span>
            <span className="text-sm sm:text-base font-extrabold text-white font-mono">{summary.rent.toFixed(2)} PLN</span>
          </div>
          <div className="glass p-4 rounded-xl border-dark-800 text-center">
            <span className="text-xxs text-dark-500 block uppercase font-bold tracking-wider mb-1">Koszty Admin.</span>
            <span className="text-sm sm:text-base font-extrabold text-white font-mono">{summary.admin.toFixed(2)} PLN</span>
          </div>
          <div className="glass p-4 rounded-xl border-dark-800 text-center">
            <span className="text-xxs text-dark-500 block uppercase font-bold tracking-wider mb-1">Rozliczenia Mediów</span>
            <span className="text-sm sm:text-base font-extrabold text-white font-mono">{summary.utilities.toFixed(2)} PLN</span>
          </div>
        </div>
      )}
 
      {/* Tabelaryczne Zestawienie Opłat Czynszowych */}
      {invoices.length > 0 && (
        <div className="glass p-6 rounded-2xl border-brand-500/10 space-y-4 shadow-xl">
          <h3 className="text-base font-bold text-white font-sans flex items-center gap-2 border-b border-dark-800 pb-3">
            📊 Zestawienie Opłat Czynszowych
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-dark-300 min-w-[950px]">
              <thead>
                <tr className="border-b border-dark-800 text-[10px] font-bold text-dark-400 uppercase tracking-wider">
                  <th className="pb-3">Rachunek (Okres)</th>
                  <th className="pb-3">Termin płatności</th>
                  <th className="pb-3 text-right">Czynsz najmu</th>
                  <th className="pb-3 text-right">Czynsz admin.</th>
                  <th className="pb-3 text-right">Opłata za media</th>
                  <th className="pb-3 text-right text-brand-400 font-bold">Opłata (Suma)</th>
                  <th className="pb-3 text-right text-green-400">Otrzymano</th>
                  <th className="pb-3 text-right text-brand-400 font-bold">Różnica (Saldo)</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-center">Terminowość wpłaty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {invoices.map((inv) => {
                  const timeliness = getPaymentTimeliness(inv.due_date, inv.paymentDate, inv.status);
                  const isPaid = inv.status === "paid";
                  const isOverdue = inv.status === "overdue";
                  const diff = (inv.receivedPayment || 0) - inv.amount;
                  
                  return (
                    <tr key={inv.id} className="hover:bg-dark-900/30 transition-colors font-sans">
                      <td className="py-3.5 font-bold text-white">{inv.title}</td>
                      <td className="py-3.5 text-dark-400 font-medium">{inv.due_date}</td>
                      <td className="py-3.5 text-right font-mono text-white">
                        {(inv.amountRent || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                      </td>
                      <td className="py-3.5 text-right font-mono text-white">
                        {(inv.amountAdmin || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                      </td>
                      <td className="py-3.5 text-right font-mono text-white">
                        {(inv.amountUtilities || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                      </td>
                      <td className="py-3.5 text-right font-mono text-brand-300 font-black">
                        {(inv.amount || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                      </td>
                      <td className="py-3.5 text-right font-mono text-green-400 font-semibold">
                        {(inv.receivedPayment || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                      </td>
                      <td className="py-3.5 text-right font-mono">
                        {diff > 0 ? (
                          <span className="inline-flex text-green-450 font-bold bg-green-500/10 px-2 py-0.5 rounded-full">
                            +{diff.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                          </span>
                        ) : diff < 0 ? (
                          <span className="inline-flex text-red-450 font-bold bg-red-500/10 px-2 py-0.5 rounded-full">
                            {diff.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                          </span>
                        ) : (
                          <span className="text-dark-500">—</span>
                        )}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPaid 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                            : isOverdue 
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        }`}>
                          {isPaid ? "Opłacone" : isOverdue ? "Zaległe" : "Do zapłaty"}
                        </span>
                      </td>
                      <td className="py-3.5 text-center">
                        {timeliness ? (
                          <span className={`inline-flex items-center gap-0.5 font-bold ${timeliness.colorClass}`}>
                            {timeliness.isDelayed ? "🔴" : "🟢"} {timeliness.message}
                          </span>
                        ) : (
                          <span className="text-dark-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
 
      {invoices.length === 0 ? (
        <div className="glass p-8 text-center rounded-2xl">
          <FileText className="w-12 h-12 text-dark-500 mx-auto mb-3" />
          <p className="text-dark-300">Brak zarejestrowanych rachunków w systemie.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-1">
          {invoices.map((inv) => {
            const property = getPropertyById(inv.property_id);
            const isPaid = inv.status === "paid";
            const isOverdue = inv.status === "overdue";

            return (
              <div 
                key={inv.id} 
                className={`glass p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 hover:border-brand-500/30 ${
                  isPaid ? 'glass-glow-green border-green-500/10' : 'glass-glow-red border-red-500/10'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-dark-800 text-brand-300 tracking-wider font-mono">
                      ID: {inv.id}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                      isPaid 
                        ? 'bg-green-500/10 text-green-400' 
                        : isOverdue 
                        ? 'bg-red-500/10 text-red-400 animate-pulse' 
                        : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {isPaid ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {isPaid ? "Opłacone" : isOverdue ? "Zaległe" : "Do zapłaty"}
                    </span>
                  </div>

                  <h3 className="font-semibold text-white text-lg leading-tight">
                    {inv.title || (property ? property.title : "Opłata Czynszowa")}
                  </h3>
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-dark-400 mt-2">
                    {inv.issueDate && (
                      <span className="flex items-center gap-1 bg-dark-900/50 px-2 py-0.5 rounded border border-dark-800">
                        <Calendar className="w-3.5 h-3.5 text-dark-500" />
                        Wystawiono: {inv.issueDate}
                      </span>
                    )}
                    <span className="flex items-center gap-1 bg-dark-900/50 px-2 py-0.5 rounded border border-dark-800 font-medium text-red-400/80">
                      <Calendar className="w-3.5 h-3.5" />
                      Termin płatności: {inv.due_date}
                    </span>
                    {inv.paymentDate && (
                      <span className="flex items-center gap-1 bg-dark-900/50 px-2 py-0.5 rounded border border-dark-800 text-green-400 font-medium">
                        Opłacono dnia: {inv.paymentDate}
                      </span>
                    )}
                    {(() => {
                      const timeliness = getPaymentTimeliness(inv.due_date, inv.paymentDate, inv.status);
                      if (!timeliness) return null;
                      return (
                        <span className={`flex items-center gap-1 bg-dark-900/50 px-2 py-0.5 rounded border border-dark-800 ${timeliness.colorClass}`}>
                          ⏱️ {timeliness.message}
                        </span>
                      );
                    })()}
                  </div>

                  {inv.notes && (
                    <p className="text-xs text-dark-400 italic bg-dark-900/50 p-2 rounded-lg mt-2 border border-dark-800">
                      Notatka: {inv.notes}
                    </p>
                  )}

                  {/* Cost breakdown */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-dark-900/40 p-4 rounded-xl border border-dark-800 text-xs">
                    <div>
                      <span className="text-dark-400 block mb-0.5">Czynsz najmu (umowa):</span>
                      <span className="text-white font-medium">{(inv.amountRent || 0).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</span>
                    </div>
                    <div>
                      <span className="text-dark-400 block mb-0.5">Czynsz admin.:</span>
                      <span className="text-white font-medium">{(inv.amountAdmin || 0).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</span>
                    </div>
                    <div>
                      <span className="text-dark-400 block mb-0.5">Opłata za media:</span>
                      <span className="text-white font-medium">{(inv.amountUtilities || 0).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</span>
                    </div>
                    <div className="border-l border-dark-800/80 pl-3 font-sans">
                      <span className="text-brand-400 font-semibold block mb-0.5">Suma wszystkich:</span>
                      <span className="text-white font-bold text-sm">{(inv.amount || 0).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</span>
                    </div>
                  </div>

                  {/* Payment Received & Balance Status */}
                  {(() => {
                    const diff = (inv.receivedPayment || 0) - inv.amount;
                    return (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 bg-dark-950/40 px-4 py-2.5 rounded-xl border border-dark-800/60 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-dark-400">Otrzymana płatność:</span>
                          <span className="text-green-400 font-bold">{(inv.receivedPayment || 0).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</span>
                        </div>
                        <div>
                          {diff > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 px-2.5 py-0.5 rounded-full font-bold">
                              Nadpłata: +{diff.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                            </span>
                          ) : diff < 0 ? (
                            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 px-2.5 py-0.5 rounded-full font-bold">
                              Niedopłata: {diff.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 px-2.5 py-0.5 rounded-full font-bold">
                              Rozliczono w całości
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-end md:flex-col justify-between md:justify-center border-t border-dark-800 md:border-0 pt-3 md:pt-0">
                  <div className="text-left md:text-right">
                    <div className="text-2xl font-bold text-white tracking-tight">
                      {inv.amount.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
