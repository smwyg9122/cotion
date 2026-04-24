#!/usr/bin/env node

/**
 * Cotion 프로덕션 DB 백업 스크립트
 *
 * 사용법:
 *   node scripts/backup-db.js "postgresql://postgres:PASSWORD@HOST:PORT/railway"
 *
 * Railway 퍼블릭 프록시 URL을 인자로 전달하세요.
 * (Railway 내부 URL postgres.railway.internal은 외부에서 접근 불가)
 */

const knex = require('knex');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.argv[2];

if (!DATABASE_URL) {
  console.error('사용법: node scripts/backup-db.js "DATABASE_URL"');
  console.error('Railway 대시보드 → PostgreSQL → Settings → Public Networking에서 URL 확인');
  process.exit(1);
}

const db = knex({
  client: 'postgresql',
  connection: {
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  },
});

async function backup() {
  try {
    console.log('🔌 DB 연결 중...');
    await db.raw('SELECT 1');
    console.log('✅ DB 연결 성공\n');

    // 테이블 목록 조회
    const tablesResult = await db.raw(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'knex_%'
      ORDER BY table_name
    `);
    const tables = tablesResult.rows.map(r => r.table_name);
    console.log(`📋 백업 대상 테이블: ${tables.join(', ')}\n`);

    const backupData = {};
    let totalRows = 0;

    for (const table of tables) {
      try {
        if (table === 'files') {
          // files 테이블: 바이너리 data 컬럼 제외하고 메타데이터만 백업
          const rows = await db(table).select(
            'id', 'original_name', 'mime_type', 'size',
            'uploaded_by', 'created_at'
          );
          backupData[table] = rows;
          totalRows += rows.length;
          console.log(`  ✅ ${table}: ${rows.length}건 (메타데이터만, 바이너리 제외)`);
        } else {
          const rows = await db(table).select('*');
          backupData[table] = rows;
          totalRows += rows.length;
          console.log(`  ✅ ${table}: ${rows.length}건`);
        }
      } catch (err) {
        console.error(`  ❌ ${table}: ${err.message}`);
        backupData[table] = { error: err.message };
      }
    }

    // 백업 파일 저장
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup_${timestamp}.json`;
    const filepath = path.join(__dirname, '..', filename);

    const output = {
      meta: {
        created_at: new Date().toISOString(),
        database_url: DATABASE_URL.replace(/:[^:@]+@/, ':***@'), // 비밀번호 마스킹
        tables: tables.length,
        total_rows: totalRows,
      },
      data: backupData,
    };

    fs.writeFileSync(filepath, JSON.stringify(output, null, 2), 'utf8');

    console.log(`\n🎉 백업 완료!`);
    console.log(`📁 파일: ${filepath}`);
    console.log(`📊 총 ${tables.length}개 테이블, ${totalRows}건 데이터`);
  } catch (err) {
    console.error('❌ 백업 실패:', err.message);
  } finally {
    await db.destroy();
  }
}

backup();
