const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function createTestUsers() {
  const client = new Client({
    connectionString: 'postgresql://maesterong@localhost:5432/cotion_dev'
  });

  await client.connect();

  try {
    const passwordHash = await bcrypt.hash('password', 12);

    const users = [
      { username: 'ayuta1', email: 'ayuta1@cotion.local', name: 'Ayuta 1' },
      { username: 'ayuta2', email: 'ayuta2@cotion.local', name: 'Ayuta 2' },
      { username: 'ayuta3', email: 'ayuta3@cotion.local', name: 'Ayuta 3' },
    ];

    for (const user of users) {
      // 기존 사용자 확인
      const existing = await client.query(
        'SELECT id FROM users WHERE username = $1',
        [user.username]
      );

      if (existing.rows.length > 0) {
        console.log(`✓ ${user.username} 이미 존재함`);
        // 비밀번호만 업데이트
        await client.query(
          'UPDATE users SET password_hash = $1 WHERE username = $2',
          [passwordHash, user.username]
        );
        console.log(`  → 비밀번호 업데이트됨`);
      } else {
        await client.query(
          `INSERT INTO users (id, username, email, name, password_hash, role)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 'member')`,
          [user.username, user.email, user.name, passwordHash]
        );
        console.log(`✓ ${user.username} 생성 완료`);
      }
    }

    console.log('\n✅ 모든 테스트 계정 준비 완료!');
    console.log('\n로그인 정보:');
    console.log('- ayuta1 / password');
    console.log('- ayuta2 / password');
    console.log('- ayuta3 / password');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

createTestUsers();
