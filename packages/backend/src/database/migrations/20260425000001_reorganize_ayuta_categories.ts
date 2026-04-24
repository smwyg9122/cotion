import { Knex } from 'knex';

/**
 * 아유타 워크스페이스 카테고리 정리 마이그레이션
 *
 * 변경 요약:
 *   9개 카테고리 → 6개 카테고리
 *
 *   🏢 운영         ← "아유타"에서 운영 관련 페이지 + "멜리사" 통합
 *   📋 체크리스트    ← 그대로 유지
 *   🌿 커피 리포트   ← "인도네시아 커피 리포트" 이름 축약
 *   📸 인스타그램    ← 그대로 + "0. 인스타그램 운영 기획" 이동
 *   📚 자료실        ← "아유타 공부" + "아유타 서류 양식" 통합
 *   💡 개선사항      ← "아유타"에서 개선 관련 페이지 분리
 *
 *   삭제: "아유타 프로덕션" ("." 빈 페이지)
 *   고아 페이지 3개: 워크스페이스 배정
 */

export async function up(knex: Knex): Promise<void> {
  // ─── 1. "아유타" 카테고리 → "운영" (운영 관련 페이지) ────────────
  await knex('pages')
    .whereIn('id', [
      'e16634a8-a4ed-42df-b20b-400dc13b6bcc', // 아유타 카톡방 메모 정리
      '39e08b3a-3df7-4c46-ae64-e74751a249c2', // 생두 카드
      '11dc952e-84f9-4b55-b027-08ed88bbaea8', // 현금 키오스크
      '3e470d89-4ff3-4e4e-a84b-e1bffcebec9f', // 아유타 공용 계정
      '894297d8-1930-4a2f-9e21-4ff1470d991c', // 아유타 로고
    ])
    .update({ category: '운영' });

  // ─── 2. "멜리사" → "운영" (거래처 운영이므로 운영에 통합) ──────
  await knex('pages')
    .whereIn('id', [
      '3c4efd83-650d-4d5a-a811-26fa8927b3ac', // 멜리사 자료
      'a654b704-f87b-4fc0-a684-9face14a8a02', // 멜리사 수입 진행 상황
    ])
    .update({ category: '운영' });

  // ─── 3. "아유타" → "개선사항" (Cotion/Coffee Community 개선) ────
  await knex('pages')
    .whereIn('id', [
      '0eeee5e1-645a-4b63-961c-7c67f6888c05', // Cotion 개선사항
      'a282f904-b63a-4443-bafc-c386b05e962a', // Coffee Community 개선사항
    ])
    .update({ category: '개선사항' });

  // ─── 4. "아유타" → "인스타그램" (인스타 기획은 인스타 폴더로) ──
  await knex('pages')
    .where('id', '8d56fd01-296d-4154-a664-f46051b308f7') // 0. 인스타그램 운영 기획
    .update({ category: '인스타그램' });

  // ─── 5. "인도네시아 커피 리포트" → "커피 리포트" (이름 축약) ────
  await knex('pages')
    .where('category', '인도네시아 커피 리포트')
    .where('workspace', '아유타')
    .update({ category: '커피 리포트' });

  // ─── 6. "아유타 공부" + "아유타 서류 양식" → "자료실" (통합) ────
  await knex('pages')
    .where(function () {
      this.where('category', '아유타 공부 ')     // 원본에 뒤에 공백 있음
        .orWhere('category', '아유타 공부')
        .orWhere('category', '아유타 서류 양식');
    })
    .where('workspace', '아유타')
    .update({ category: '자료실' });

  // ─── 7. "아유타 프로덕션" 빈 페이지 → 소프트 삭제 ──────────────
  await knex('pages')
    .where('id', 'b6263546-e041-4925-85c9-ccf51b958b04') // "." 빈 페이지
    .update({ deleted_at: knex.fn.now() });

  // ─── 8. 고아 페이지 워크스페이스 배정 ──────────────────────────
  // 제이로텍 중복 2개 → 제이로텍 워크스페이스
  await knex('pages')
    .whereIn('id', [
      'ec3aba9b-2b0f-4992-ac49-bf4cb4a7be8f',
      'b169b886-6fea-4a17-a273-363727a7de23',
    ])
    .whereNull('workspace')
    .update({ workspace: '제이로텍' });

  // 아유타 브랜드 컬러표 → 아유타 워크스페이스, 자료실 카테고리
  await knex('pages')
    .where('id', '17cc896c-a076-4229-b7d3-d0fb68134c1f')
    .update({ workspace: '아유타', category: '자료실' });
}

export async function down(knex: Knex): Promise<void> {
  // ─── Revert: "운영" → "아유타" (원래 아유타였던 것들) ─────────
  await knex('pages')
    .whereIn('id', [
      'e16634a8-a4ed-42df-b20b-400dc13b6bcc',
      '39e08b3a-3df7-4c46-ae64-e74751a249c2',
      '11dc952e-84f9-4b55-b027-08ed88bbaea8',
      '3e470d89-4ff3-4e4e-a84b-e1bffcebec9f',
      '894297d8-1930-4a2f-9e21-4ff1470d991c',
    ])
    .update({ category: '아유타' });

  // ─── Revert: "운영" → "멜리사" ────────────────────────────────
  await knex('pages')
    .where('id', '3c4efd83-650d-4d5a-a811-26fa8927b3ac')
    .update({ category: '멜리사' });
  await knex('pages')
    .where('id', 'a654b704-f87b-4fc0-a684-9face14a8a02')
    .update({ category: '아유타' });

  // ─── Revert: "개선사항" → "아유타" ────────────────────────────
  await knex('pages')
    .whereIn('id', [
      '0eeee5e1-645a-4b63-961c-7c67f6888c05',
      'a282f904-b63a-4443-bafc-c386b05e962a',
    ])
    .update({ category: '아유타' });

  // ─── Revert: "인스타그램" → "아유타" ──────────────────────────
  await knex('pages')
    .where('id', '8d56fd01-296d-4154-a664-f46051b308f7')
    .update({ category: '아유타' });

  // ─── Revert: "커피 리포트" → "인도네시아 커피 리포트" ────────
  await knex('pages')
    .where('category', '커피 리포트')
    .where('workspace', '아유타')
    .update({ category: '인도네시아 커피 리포트' });

  // ─── Revert: "자료실" → "아유타 공부 " / "아유타 서류 양식" ──
  await knex('pages')
    .whereIn('id', [
      '1221c4fc-ddfb-42e1-997b-6f384b1d07a8',
      'db65b91e-321b-4063-a41c-7c7b6a5a2295',
      '8d2b262c-53cd-458f-b821-ddec96794233',
      'f6ab2ab1-0fbe-4019-ad6d-e88e3b87ea4b',
    ])
    .update({ category: '아유타 공부 ' });
  await knex('pages')
    .where('id', '6065ecf2-f67c-4093-8161-2911bbe71abc')
    .update({ category: '아유타 서류 양식' });

  // ─── Revert: 빈 페이지 복원 ───────────────────────────────────
  await knex('pages')
    .where('id', 'b6263546-e041-4925-85c9-ccf51b958b04')
    .update({ deleted_at: null, category: '아유타 프로덕션' });

  // ─── Revert: 고아 페이지 ──────────────────────────────────────
  await knex('pages')
    .whereIn('id', [
      'ec3aba9b-2b0f-4992-ac49-bf4cb4a7be8f',
      'b169b886-6fea-4a17-a273-363727a7de23',
    ])
    .update({ workspace: null });
  await knex('pages')
    .where('id', '17cc896c-a076-4229-b7d3-d0fb68134c1f')
    .update({ workspace: null, category: '운영' });
}
