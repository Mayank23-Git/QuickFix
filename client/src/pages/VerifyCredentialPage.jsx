import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { PublicLayout } from '../layouts/PublicLayout.jsx';
import { apiRequest } from '../services/api.js';

export function VerifyCredentialPage() {
  const { credentialId } = useParams();
  const navigate = useNavigate();

  const [lookupInput, setLookupInput] = useState(credentialId || '');
  const [loading, setLoading] = useState(Boolean(credentialId && credentialId !== 'lookup'));
  const [credential, setCredential] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setLookupInput(credentialId && credentialId !== 'lookup' ? credentialId : '');
    if (!credentialId || credentialId === 'lookup') {
      setLoading(false);
      setCredential(null);
      setError('');
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError('');
    apiRequest(`/api/verify/${encodeURIComponent(credentialId)}`)
      .then((data) => {
        if (!active) return;
        setCredential(data.credential || null);
      })
      .catch((err) => {
        if (!active) return;
        setCredential(null);
        setError(err.message || 'Credential could not be verified.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [credentialId]);

  const handleLookupSubmit = (e) => {
    e.preventDefault();
    const trimmed = lookupInput.trim();
    if (!trimmed) return;
    navigate(`/verify/${encodeURIComponent(trimmed.toUpperCase())}`);
  };

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-medium text-indigo-700 dark:text-[#818CF8]">PeerUp Credential Registry</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-[#F8FAFC]">
            Verify Student Achievement Credential
          </h1>
          <p className="text-sm text-zinc-600 dark:text-[#94A3B8]">
            Public verification record confirming authentic peer-mentoring and academic contributions.
          </p>
        </div>

        {/* Lookup Bar */}
        <form onSubmit={handleLookupSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              placeholder="Enter Credential ID (e.g. QF-2026-A1B2C3D4)"
              aria-label="Credential ID"
              className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono bg-white dark:bg-[#1E293B] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] transition-colors whitespace-nowrap"
          >
            Verify ID
          </button>
        </form>

        {loading ? (
          <div className="h-64 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl animate-pulse" />
        ) : error ? (
          <div className="bg-white dark:bg-[#1E293B] border border-rose-200 dark:border-rose-500/40 rounded-xl p-8 text-center space-y-3">
            <ShieldAlert className="w-10 h-10 text-rose-600 dark:text-rose-400 mx-auto" />
            <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">
              Credential Not Verified
            </h2>
            <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          </div>
        ) : credential ? (
          <section className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl overflow-hidden">
            <div
              className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${
                credential.status === 'valid'
                  ? 'bg-emerald-50/60 dark:bg-[#2DD4BF]/10 border-emerald-200 dark:border-[#2DD4BF]/35'
                  : 'bg-rose-50/70 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/35'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {credential.status === 'valid' ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-[#2DD4BF]" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-700 dark:text-rose-400" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    credential.status === 'valid'
                      ? 'text-emerald-800 dark:text-[#2DD4BF]'
                      : 'text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {credential.status === 'valid' ? 'Valid Verified Credential' : 'Credential Revoked'}
                </span>
              </div>
              <span className="font-mono text-xs text-zinc-700 dark:text-slate-200">{credential.credentialId}</span>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="space-y-1.5">
                <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                  {credential.category} · Issued by {credential.issuingPlatform}
                </p>
                <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-[#F8FAFC]">
                  {credential.credentialName}
                </h2>
                <p className="text-sm text-zinc-600 dark:text-[#94A3B8]">{credential.badgeDescription}</p>
              </div>

              {credential.status === 'revoked' && (
                <div className="bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/35 rounded-lg p-4 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                  <p className="font-semibold">Revocation Notice</p>
                  <p>Reason: {credential.revocationReason}</p>
                  {credential.revokedAt && (
                    <p>
                      Revoked on{' '}
                      {new Date(credential.revokedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-[#334155] text-sm">
                <div>
                  <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Recipient</p>
                  <p className="font-semibold text-zinc-900 dark:text-[#F8FAFC] mt-0.5">
                    {credential.recipientDisplayName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Issuing Platform</p>
                  <p className="font-semibold text-zinc-900 dark:text-[#F8FAFC] mt-0.5">{credential.issuingPlatform}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Issue Date</p>
                  <p className="font-medium text-zinc-900 dark:text-[#F8FAFC] mt-0.5 tabular-nums">
                    {new Date(credential.issuedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Achievement ID</p>
                  <p className="font-mono text-xs text-zinc-900 dark:text-[#F8FAFC] mt-1">{credential.achievementId}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-[#334155] space-y-1">
                <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Achievement Criteria</p>
                <p className="text-sm text-zinc-700 dark:text-slate-200 leading-relaxed flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-[#818CF8] shrink-0 mt-0.5" />
                  <span>{credential.achievementCriteria}</span>
                </p>
              </div>
            </div>
          </section>
        ) : (
          <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-8 text-center text-sm text-zinc-600 dark:text-[#94A3B8]">
            Enter a PeerUp / QuickFix credential ID above to inspect its public verification status.
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
