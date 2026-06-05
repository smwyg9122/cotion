import React, { useState } from 'react';
import { Tag, Download, ExternalLink, FileText } from 'lucide-react';

/**
 * 아유타 커피 단가표 — 공식 가격표 PDF를 그대로 보여주는 페이지.
 *
 * 사장님이 주신 공식 가격표(PDF)를 페이지에 임베드한다. 파일은 프론트엔드 정적
 * 에셋으로 번들된다(packages/frontend/public):
 *   - /ayuta-price-list.png : 1페이지 고해상도 렌더 — 기본 표시.
 *       모든 기기/브라우저에서 100% 선명하게 보인다. (모바일·일부 데스크톱은
 *       인라인 PDF 뷰어가 빈 화면/검은 박스로 깨지므로 이미지를 기본으로 둔다.)
 *   - /ayuta-price-list.pdf : 실제 PDF 원본 — 새 탭 열기/다운로드/인쇄용,
 *       그리고 「PDF 뷰어로 보기」 토글 시 인라인 임베드(데스크톱 인터랙티브).
 *
 * Vite는 public/의 파일을 빌드 산출물 루트로 복사하므로 절대경로(/...)로 접근한다.
 * (Vercel은 파일시스템 우선이라 SPA rewrite가 이 정적 파일을 가로채지 않는다.)
 */

const PDF_URL = '/ayuta-price-list.pdf';
const PNG_URL = '/ayuta-price-list.png';

interface PriceListPageProps {
  // HomePage가 selectedWorkspace.name을 넘기지만 이 화면에서는 사용하지 않는다.
  workspace?: string;
}

export const PriceListPage: React.FC<PriceListPageProps> = () => {
  // 기본은 '이미지'(어디서나 안정적으로 보임). 데스크톱에서 인터랙티브 PDF를
  // 원하면 'pdf'로 토글한다.
  const [mode, setMode] = useState<'image' | 'pdf'>('image');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* ─── 헤더 ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#FAEAE4] flex items-center justify-center shrink-0">
            <Tag className="text-[#9C4A2D]" size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1F1E1D]">아유타 커피 단가표</h1>
            <p className="text-sm text-[#5B5B5A] mt-0.5">아유타상사 공식 가격표</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'image' ? 'pdf' : 'image'))}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[#E8E4DC] text-[#3F3E3D] hover:bg-[#F5F2EE] transition-colors"
            title={mode === 'image' ? '브라우저 PDF 뷰어로 보기 (데스크톱)' : '이미지로 보기 (모든 기기)'}
          >
            <FileText size={16} />
            {mode === 'image' ? 'PDF 뷰어로 보기' : '이미지로 보기'}
          </button>
          <a
            href={PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[#E8E4DC] text-[#3F3E3D] hover:bg-[#F5F2EE] transition-colors"
          >
            <ExternalLink size={16} />
            새 탭에서 열기
          </a>
          <a
            href={PDF_URL}
            download="아유타_커피_가격표.pdf"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[#C56A3E] text-white hover:bg-[#A9542E] transition-colors font-medium"
          >
            <Download size={16} />
            PDF 다운로드
          </a>
        </div>
      </div>

      {/* ─── 가격표 본문 ─── */}
      <div className="rounded-xl border border-[#E8E4DC] bg-white overflow-hidden shadow-sm">
        {mode === 'image' ? (
          // 이미지 모드(기본): 항상 선명하게 렌더 — 모든 기기 호환
          <img
            src={PNG_URL}
            alt="아유타 커피 가격표"
            className="w-full h-auto block bg-white"
          />
        ) : (
          // PDF 뷰어 모드(옵트인): 데스크톱 브라우저의 인라인 PDF 뷰어
          <iframe
            src={`${PDF_URL}#view=FitH`}
            title="아유타 커피 가격표 PDF"
            className="w-full h-[82vh] min-h-[480px] block bg-white"
          />
        )}
      </div>

      <p className="text-xs text-[#9C9A93] mt-3 text-center">
        기본은 이미지로 표시됩니다. 확대·인쇄가 필요하면 「새 탭에서 열기」 또는 「PDF 다운로드」를 눌러주세요.
      </p>
    </div>
  );
};
