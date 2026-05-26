/**
 * Turn an axios error into a Korean message that tells the user WHICH
 * field failed and why, instead of the generic "저장 실패" alert.
 *
 * Backend shape (error.middleware.ts + Zod):
 *   {
 *     success: false,
 *     error: {
 *       code: 'VALIDATION_ERROR',
 *       message: '입력 데이터가 유효하지 않습니다',
 *       details: [{ path: ['email'], message: 'Invalid email', ... }]
 *     }
 *   }
 *
 * We surface the first 1-3 field errors with Korean field labels so the
 * user can actually fix what they typed.
 */

// English field name → Korean label.
// Keep keys short and add new ones as new forms ship.
const FIELD_LABELS: Record<string, string> = {
  // Common
  name: '이름',
  title: '제목',
  email: '이메일',
  phone: '연락처',
  workspace: '워크스페이스',
  notes: '메모',
  description: '설명',
  address: '주소',
  status: '상태',
  category: '카테고리',
  // Clients / buyers
  contactPerson: '담당자',
  assignedTo: '담당자 배정',
  companyName: '업체명',
  kakaoId: '카카오톡 ID',
  instagram: '인스타그램',
  region: '지역',
  businessType: '업종',
  size: '규모',
  source: '유입 경로',
  interestItems: '관심 품목',
  interestProducts: '관심 제품',
  monthlyVolume: '월 예상 물량',
  sampleSent: '샘플 발송',
  cuppingDone: '커핑 진행',
  interestLevel: '관심도',
  lastContactDate: '마지막 연락일',
  nextAction: '다음 액션',
  followUpDate: '재연락 예정일',
  firstOrderDate: '첫 주문일',
  lastOrderDate: '최근 주문일',
  totalPurchaseAmount: '누적 구매액',
  totalPurchaseKg: '총 구매량',
  repeatCount: '재구매 횟수',
  // Cupping
  visitDate: '방문일',
  clientId: '거래처',
  roasteryName: '로스터리 이름',
  offeredBeans: '제공 원두',
  reaction: '반응',
  purchaseIntent: '구매 의향',
  followupDate: '재연락 예정일',
  // Inventory
  type: '유형',
  origin: '산지',
  variety: '품종',
  process: '가공 방식',
  totalIn: '총 입고량',
  currentStock: '현재 재고',
  storageLocation: '보관 위치',
  // Calendar
  startDate: '시작일',
  endDate: '종료일',
  allDay: '하루 종일',
  color: '색상',
  pageId: '페이지',
  attendees: '참석자',
  // Tasks
  priority: '우선순위',
  dueDate: '마감일',
  position: '순서',
  assignees: '담당자',
  // Documents
  fileId: '파일',
  // Auth
  username: '아이디',
  password: '비밀번호',
  newPassword: '새 비밀번호',
  currentPassword: '현재 비밀번호',
};

function labelFor(path: Array<string | number>): string {
  if (!path?.length) return '';
  // For nested paths (e.g. ['attendees', 0]) we label the top-level field.
  const top = String(path[0]);
  return FIELD_LABELS[top] || top;
}

// Common Zod messages → Korean.
function translateZodMessage(msg: string): string {
  if (!msg) return '';
  if (msg === 'Invalid email') return '유효한 이메일 형식이 아닙니다';
  if (msg === 'Invalid uuid') return '유효한 ID 형식이 아닙니다';
  if (msg === 'Invalid url') return '유효한 URL 형식이 아닙니다';
  if (msg === 'Required') return '필수 입력 항목입니다';
  if (msg.startsWith('String must contain at least')) return '입력 길이가 너무 짧습니다';
  if (msg.startsWith('String must contain at most')) return '입력 길이가 너무 깁니다';
  if (msg.startsWith('Expected ')) return '형식이 올바르지 않습니다';
  return msg; // already user-friendly (e.g. Korean from custom validators)
}

interface ApiErrorBody {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ path?: Array<string | number>; message?: string }>;
  };
}

/**
 * Format an axios error into a single user-facing message.
 * Falls back to {fallback} when the response shape is unexpected.
 */
export function formatApiError(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: ApiErrorBody }; message?: string };
  const body = e?.response?.data?.error;
  if (!body) return e?.message ? `${fallback} (${e.message})` : fallback;

  const details = body.details;
  if (Array.isArray(details) && details.length > 0) {
    const lines = details.slice(0, 3).map((d) => {
      const label = labelFor(d.path || []);
      const msg = translateZodMessage(d.message || '');
      return label ? `• ${label}: ${msg}` : `• ${msg}`;
    });
    const more = details.length > 3 ? `\n... 외 ${details.length - 3}건` : '';
    return `${body.message || fallback}\n${lines.join('\n')}${more}`;
  }

  return body.message || fallback;
}
