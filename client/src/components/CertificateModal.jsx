import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import {
  Award,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Share2,
  X,
} from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { BadgeIcon } from './BadgeIcon.jsx';

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text || '').split(/\s+/);
  let line = '';
  let currentY = y;

  for (let i = 0; i < words.length; i += 1) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, currentY);
      line = words[i];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currentY);
  }
  return currentY;
}

export function CertificateModal({ badge, recipientName, onClose }) {
  const toast = useToast();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);

  const earned = badge?.earnedBadge || badge;
  const credentialId = earned?.credentialId || '';
  const achievementId = earned?.achievementId || '';
  const badgeName = badge?.name || earned?.badgeName || 'Achievement';
  const badgeDescription = badge?.description || earned?.badgeDescription || '';
  const achievementCriteria = badge?.achievementCriteria || earned?.achievementCriteria || '';
  const category = badge?.category || earned?.category || 'Mentoring';
  const icon = badge?.icon || earned?.icon || 'award';
  const issuedAt = earned?.issuedAt ? new Date(earned.issuedAt) : new Date();
  const formattedDate = issuedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const verifyPath = `/verify/${encodeURIComponent(credentialId)}`;
  const verifyUrl = `${origin}${verifyPath}`;

  const linkedInPostText = `Excited to share that I have earned the ${badgeName} achievement on PeerUp for contributing to peer learning and helping fellow students. Verify credential: ${verifyUrl}`;
  const resumeBulletText = `${badgeName} (PeerUp / QuickFix) — ${achievementCriteria} Verified Credential ID: ${credentialId} (${verifyUrl})`;

  const linkedInShareUrl = `https://www.linkedin.com/feed/?shareActive=true&mini=true&text=${encodeURIComponent(
    linkedInPostText
  )}`;
  const linkedInAddCertUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(
    `${badgeName} — PeerUp Achievement`
  )}&organizationName=${encodeURIComponent('PeerUp')}&issueYear=${issuedAt.getFullYear()}&issueMonth=${
    issuedAt.getMonth() + 1
  }&certUrl=${encodeURIComponent(verifyUrl)}&certId=${encodeURIComponent(credentialId)}`;

  useEffect(() => {
    if (!verifyUrl) return undefined;
    let active = true;
    QRCode.toDataURL(verifyUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: '#18181B',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [verifyUrl]);

  const handleCopy = async (key, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(key);
      setTimeout(() => setCopiedField(''), 2000);
      toast.success('Copied to clipboard.');
    } catch {
      toast.error('Clipboard permission unavailable.');
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const qr =
        qrDataUrl ||
        (await QRCode.toDataURL(verifyUrl, {
          width: 240,
          margin: 1,
          color: { dark: '#18181B', light: '#FFFFFF' },
        }));

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
      });

      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();

      // Clean light archival certificate background
      doc.setFillColor(250, 250, 249);
      doc.rect(0, 0, w, h, 'F');

      doc.setFillColor(255, 255, 255);
      doc.rect(28, 28, w - 56, h - 56, 'F');

      // Outer hairline border + inner indigo accent frame
      doc.setDrawColor(228, 228, 231);
      doc.setLineWidth(1.5);
      doc.rect(28, 28, w - 56, h - 56);

      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(1);
      doc.rect(40, 40, w - 80, h - 80);

      // Header branding
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229);
      doc.text('QUICKFIX  ·  PEERUP VERIFIED CREDENTIAL', 68, 86);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(113, 113, 122);
      doc.text('Certificate of Verified Peer Learning Achievement', 68, 108);

      // Divider
      doc.setDrawColor(228, 228, 231);
      doc.line(68, 126, w - 68, 126);

      // Recipient & Badge
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(82, 82, 91);
      doc.text('This credential certifies that', 68, 172);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(30);
      doc.setTextColor(24, 24, 27);
      doc.text(String(recipientName || 'PeerUp Student'), 68, 212);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(82, 82, 91);
      doc.text('has earned the verified achievement', 68, 246);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(67, 56, 202);
      doc.text(`${badgeName}  (${category})`, 68, 282);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11.5);
      doc.setTextColor(63, 63, 70);
      const descLines = doc.splitTextToSize(
        `${badgeDescription} Criteria: ${achievementCriteria}`,
        w - 290
      );
      doc.text(descLines, 68, 314);

      // Metadata footer left
      const footerY = h - 134;
      doc.setDrawColor(228, 228, 231);
      doc.line(68, footerY - 22, w - 210, footerY - 22);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(113, 113, 122);
      doc.text('ISSUE DATE', 68, footerY);
      doc.text('CREDENTIAL ID', 220, footerY);
      doc.text('ACHIEVEMENT ID', 400, footerY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(24, 24, 27);
      doc.text(formattedDate, 68, footerY + 18);
      doc.text(credentialId, 220, footerY + 18);
      doc.text(achievementId, 400, footerY + 18);

      doc.setFontSize(9.5);
      doc.setTextColor(79, 70, 229);
      doc.text(`Verify at: ${verifyUrl}`, 68, footerY + 46);

      // QR code right
      doc.addImage(qr, 'PNG', w - 186, h - 188, 114, 114);
      doc.setFontSize(8.5);
      doc.setTextColor(113, 113, 122);
      doc.text('Scan to verify authenticity', w - 180, h - 62);

      doc.save(`${credentialId}-${badge?.badgeId || 'certificate'}.pdf`);
      toast.success('Certificate PDF downloaded.');
    } catch {
      toast.error('Unable to generate PDF certificate.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadPng = async () => {
    setDownloadingPng(true);
    try {
      const qr =
        qrDataUrl ||
        (await QRCode.toDataURL(verifyUrl, {
          width: 220,
          margin: 1,
          color: { dark: '#18181B', light: '#FFFFFF' },
        }));

      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 900;
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#FAFAF9';
      ctx.fillRect(0, 0, 900, 900);

      // Card surface
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(40, 40, 820, 820);
      ctx.strokeStyle = '#E4E4E7';
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, 820, 820);

      // Inner indigo hairline
      ctx.strokeStyle = '#4F46E5';
      ctx.lineWidth = 2;
      ctx.strokeRect(60, 60, 780, 780);

      // Brand header
      ctx.fillStyle = '#4F46E5';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('QUICKFIX · PEERUP VERIFIED BADGE', 96, 122);

      // Crest circle
      ctx.fillStyle = '#EEF2FF';
      ctx.beginPath();
      ctx.arc(156, 232, 56, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#C7D2FE';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#4338CA';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('QF', 156, 242);
      ctx.textAlign = 'left';

      // Badge title & category
      ctx.fillStyle = '#71717A';
      ctx.font = '600 18px sans-serif';
      ctx.fillText(category.toUpperCase(), 238, 212);

      ctx.fillStyle = '#18181B';
      ctx.font = 'bold 42px sans-serif';
      ctx.fillText(badgeName, 238, 260);

      // Recipient
      ctx.fillStyle = '#52525B';
      ctx.font = '20px sans-serif';
      ctx.fillText('Awarded to', 96, 355);

      ctx.fillStyle = '#18181B';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(String(recipientName || 'PeerUp Student'), 96, 400);

      // Description
      ctx.fillStyle = '#3F3F46';
      ctx.font = '22px sans-serif';
      wrapCanvasText(ctx, `${badgeDescription} ${achievementCriteria}`, 96, 468, 700, 32);

      // Divider
      ctx.strokeStyle = '#E4E4E7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(96, 610);
      ctx.lineTo(804, 610);
      ctx.stroke();

      // Credential Metadata
      ctx.fillStyle = '#71717A';
      ctx.font = '600 16px sans-serif';
      ctx.fillText('ISSUED', 96, 656);
      ctx.fillText('CREDENTIAL ID', 96, 728);

      ctx.fillStyle = '#18181B';
      ctx.font = '22px monospace';
      ctx.fillText(formattedDate, 96, 686);
      ctx.fillText(credentialId, 96, 758);

      // QR image
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = qr;
      });
      ctx.drawImage(img, 636, 634, 168, 168);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${credentialId}-${badge?.badgeId || 'badge'}.png`;
      link.href = pngUrl;
      link.click();
      toast.success('Badge PNG downloaded.');
    } catch {
      toast.error('Unable to generate PNG badge.');
    } finally {
      setDownloadingPng(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="certificate-modal-title"
    >
      <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl max-w-3xl w-full my-8 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-[#334155] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-indigo-600 dark:text-[#818CF8]" />
            <h2 id="certificate-modal-title" className="font-display text-lg font-bold text-zinc-900 dark:text-[#F8FAFC]">
              Verified Achievement Credential
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close certificate preview"
            className="p-1.5 rounded-lg text-zinc-500 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC] hover:bg-zinc-100 dark:hover:bg-[#273449]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Certificate Preview Card */}
          <div className="bg-[#FAFAF9] dark:bg-[#111827] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 dark:border-[#334155] pb-4">
              <div>
                <p className="font-display text-sm font-bold tracking-wide text-indigo-700 dark:text-[#818CF8]">
                  QUICKFIX · PEERUP CREDENTIAL
                </p>
                <p className="text-xs text-zinc-500 dark:text-[#94A3B8] mt-0.5">
                  Verified Peer Learning &amp; Campus Mentorship Certificate
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-[#94A3B8]">
                <span>{category}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{credentialId}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Awarded to</p>
                <p className="font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-[#F8FAFC]">
                  {recipientName}
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-[#818CF8]/15 border border-indigo-200 dark:border-[#818CF8]/35 flex items-center justify-center text-indigo-700 dark:text-[#818CF8] shrink-0">
                    <BadgeIcon icon={icon} className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold text-indigo-700 dark:text-[#818CF8]">{badgeName}</p>
                    <p className="text-xs text-zinc-600 dark:text-[#94A3B8]">{badgeDescription}</p>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 dark:text-[#94A3B8] leading-relaxed pt-1">
                  <span className="font-medium text-zinc-800 dark:text-slate-200">Criteria:</span> {achievementCriteria}
                </p>
              </div>

              {qrDataUrl && (
                <div className="shrink-0 bg-white border border-zinc-200 dark:border-[#334155] rounded-lg p-2.5 text-center space-y-1 self-start">
                  <img
                    src={qrDataUrl}
                    alt={`QR code to verify credential ${credentialId}`}
                    className="w-28 h-28 mx-auto"
                  />
                  <p className="text-[11px] text-zinc-500">Scan to verify</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-[#334155] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-zinc-500 dark:text-[#94A3B8]">Issued On</p>
                <p className="font-medium text-zinc-900 dark:text-[#F8FAFC] mt-0.5 tabular-nums">{formattedDate}</p>
              </div>
              <div>
                <p className="text-zinc-500 dark:text-[#94A3B8]">Achievement ID</p>
                <p className="font-mono text-zinc-900 dark:text-[#F8FAFC] mt-0.5">{achievementId}</p>
              </div>
              <div>
                <p className="text-zinc-500 dark:text-[#94A3B8]">Verification Link</p>
                <Link
                  to={verifyPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC] mt-0.5"
                >
                  <span>Open Verification Page</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Export & Share Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingPdf ? 'Generating PDF...' : 'Download Certificate (PDF)'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={downloadingPng}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-800 dark:text-slate-200 bg-white dark:bg-[#273449] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              <ImageIcon className="w-4 h-4" />
              <span>{downloadingPng ? 'Generating PNG...' : 'Download Badge (PNG)'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopy('link', verifyUrl)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-zinc-700 dark:text-slate-200 bg-white dark:bg-[#273449] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              {copiedField === 'link' ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-[#2DD4BF]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{copiedField === 'link' ? 'Link Copied' : 'Copy Verification Link'}</span>
            </button>

            <a
              href={linkedInShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-indigo-700 dark:text-[#818CF8] bg-indigo-50 dark:bg-[#818CF8]/15 border border-indigo-200 dark:border-[#818CF8]/35 rounded-lg hover:bg-indigo-100 dark:hover:bg-[#818CF8]/25 transition-colors whitespace-nowrap"
            >
              <Share2 className="w-4 h-4" />
              <span>Share on LinkedIn</span>
            </a>

            <a
              href={linkedInAddCertUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium text-zinc-700 dark:text-slate-200 bg-white dark:bg-[#273449] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              <span>Add to LinkedIn Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
            Note: Clicking Share or Add to LinkedIn opens LinkedIn&apos;s sharing flow in a new tab—you review and publish or save the credential on your LinkedIn profile yourself.
          </p>

          {/* Copyable LinkedIn Post & Resume Bullet */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-50 dark:bg-[#111827] border border-zinc-200 dark:border-[#334155] rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-800 dark:text-[#F8FAFC]">Prewritten LinkedIn Post</span>
                <button
                  type="button"
                  onClick={() => handleCopy('linkedin', linkedInPostText)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC]"
                >
                  {copiedField === 'linkedin' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'linkedin' ? 'Copied' : 'Copy Post'}</span>
                </button>
              </div>
              <p className="text-xs text-zinc-600 dark:text-[#94A3B8] leading-relaxed">{linkedInPostText}</p>
            </div>

            <div className="bg-zinc-50 dark:bg-[#111827] border border-zinc-200 dark:border-[#334155] rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-[#F8FAFC]">
                  <FileText className="w-3.5 h-3.5 text-zinc-500 dark:text-[#94A3B8]" />
                  <span>Resume / CV Description</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('resume', resumeBulletText)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC]"
                >
                  {copiedField === 'resume' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'resume' ? 'Copied' : 'Copy CV Line'}</span>
                </button>
              </div>
              <p className="text-xs text-zinc-600 dark:text-[#94A3B8] leading-relaxed">{resumeBulletText}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
