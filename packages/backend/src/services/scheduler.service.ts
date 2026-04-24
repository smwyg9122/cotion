import cron from 'node-cron';
import { db } from '../database/connection';

// ─── TipTap JSON Helper Builders ────────────────────────────────────────────

function heading(level: number, text: string) {
  return {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  };
}

function paragraph(text: string) {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text }],
  };
}

function bulletItem(text: string) {
  return {
    type: 'listItem',
    content: [paragraph(text)],
  };
}

function bulletList(items: string[]) {
  return {
    type: 'bulletList',
    content: items.map((item) => bulletItem(item)),
  };
}

function taskItem(text: string, checked = false) {
  return {
    type: 'taskItem',
    attrs: { checked },
    content: [paragraph(text)],
  };
}

function taskList(items: string[]) {
  return {
    type: 'taskList',
    content: items.map((item) => taskItem(item)),
  };
}

function tableCell(text: string) {
  return {
    type: 'tableCell',
    content: [paragraph(text)],
  };
}

function tableHeaderCell(text: string) {
  return {
    type: 'tableHeader',
    content: [paragraph(text)],
  };
}

function tableRow(cells: any[]) {
  return {
    type: 'tableRow',
    content: cells,
  };
}

function table(rows: any[]) {
  return {
    type: 'table',
    content: rows,
  };
}

// ─── Wednesday Mid-Week Check Template ──────────────────────────────────────

function generateWedTemplate(userNames: string[], dateStr: string) {
  const userBullets = userNames.map((name) => `${name}: `);

  return {
    type: 'doc',
    content: [
      heading(1, `중간점검 (${dateStr})`),

      // Section 1: Mon-Wed progress per user
      heading(2, '월~수 진행 현황'),
      bulletList(userBullets),

      // Section 2: Thu-Sun remaining tasks (empty task list)
      heading(2, '목~일 남은 할 일'),
      taskList(userNames.map((name) => `${name}: `)),

      // Section 3: Blockers
      heading(2, '막히는 것'),
      bulletList(['(여기에 작성)']),
    ],
  };
}

// ─── Sunday Full Meeting Template ───────────────────────────────────────────

function generateSunTemplate(userNames: string[], dateStr: string) {
  const userBullets = userNames.map((name) => `${name}: `);

  return {
    type: 'doc',
    content: [
      heading(1, `전체 회의 (${dateStr})`),

      // Section 1: Completed / Not completed this week
      heading(2, '이번주 완료/미완료'),
      heading(3, '완료'),
      bulletList(['(여기에 작성)']),
      heading(3, '미완료'),
      bulletList(['(여기에 작성)']),

      // Section 2: Current status check table
      heading(2, '현 상황 점검'),
      table([
        tableRow([
          tableHeaderCell('항목'),
          tableHeaderCell('현황'),
          tableHeaderCell('비고'),
        ]),
        tableRow([
          tableCell('커핑방문'),
          tableCell(''),
          tableCell(''),
        ]),
        tableRow([
          tableCell('발주건수'),
          tableCell(''),
          tableCell(''),
        ]),
        tableRow([
          tableCell('재고잔량'),
          tableCell(''),
          tableCell(''),
        ]),
        tableRow([
          tableCell('SNS업로드'),
          tableCell(''),
          tableCell(''),
        ]),
      ]),

      // Section 3: Next week goals per user
      heading(2, '다음 주 목표'),
      bulletList(userBullets),

      // Section 4: Discussion items
      heading(2, '논의 사항'),
      bulletList(['(여기에 작성)']),
    ],
  };
}

// ─── Scheduler Service ──────────────────────────────────────────────────────

export class SchedulerService {
  static init() {
    // Every Wednesday at 08:00 KST (UTC+9 → 23:00 Tuesday UTC)
    cron.schedule('0 23 * * 2', async () => {
      console.log('📋 수요일 중간점검 템플릿 생성 중...');
      await SchedulerService.generateMeetingTemplate('meeting_wed');
    });

    // Every Sunday at 08:00 KST (UTC+9 → 23:00 Saturday UTC)
    cron.schedule('0 23 * * 6', async () => {
      console.log('📋 일요일 전체회의 템플릿 생성 중...');
      await SchedulerService.generateMeetingTemplate('meeting_sun');
    });

    // Every day at 09:00 KST — check followup notifications (00:00 UTC)
    cron.schedule('0 0 * * *', async () => {
      console.log('🔔 팔로업 알림 체크 중...');
      await SchedulerService.checkFollowupNotifications();
    });

    console.log('⏰ Scheduler initialized');
  }

  static async generateMeetingTemplate(type: 'meeting_wed' | 'meeting_sun') {
    try {
      // Get all users for the template
      const users = await db('users').select('id', 'name');
      const userNames = users.map((u: any) => u.name);

      const now = new Date();
      const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

      let title: string;
      let content: any; // TipTap JSON content

      if (type === 'meeting_wed') {
        title = `📋 중간점검 (${dateStr})`;
        content = generateWedTemplate(userNames, dateStr);
      } else {
        title = `📋 전체 회의 (${dateStr})`;
        content = generateSunTemplate(userNames, dateStr);
      }

      // Default workspace
      const workspace = '아유타';

      // Create page with template
      const [page] = await db('pages')
        .insert({
          title,
          content: JSON.stringify(content),
          workspace,
          template_type: type,
          auto_generated: true,
          created_by: users[0]?.id,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning('*');

      console.log(`✅ 회의 템플릿 생성 완료: ${title}`);

      // Send notifications to all users
      for (const user of users) {
        await db('notifications').insert({
          user_id: user.id,
          type: 'meeting_template',
          message: `${title} 문서가 생성되었습니다`,
          page_id: page.id,
          triggered_by: users[0]?.id,
          is_read: false,
          channel: 'internal',
          created_at: db.fn.now(),
        });
      }
    } catch (error) {
      console.error(`❌ 회의 템플릿 생성 실패:`, error);
    }
  }

  static async checkFollowupNotifications() {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Find cupping logs with followup_date = today and not yet notified
      const dueLogs = await db('cupping_logs')
        .where('followup_date', today)
        .where('followup_notified', false);

      for (const log of dueLogs) {
        // Create notification for the creator
        await db('notifications').insert({
          user_id: log.created_by,
          type: 'followup_reminder',
          message: `☕ ${log.roastery_name} 팔로업 날짜입니다`,
          is_read: false,
          channel: 'internal',
          created_at: db.fn.now(),
        });

        // Mark as notified
        await db('cupping_logs')
          .where('id', log.id)
          .update({ followup_notified: true });
      }

      if (dueLogs.length > 0) {
        console.log(`✅ ${dueLogs.length}건 팔로업 알림 발송`);
      }
    } catch (error) {
      console.error('❌ 팔로업 알림 체크 실패:', error);
    }
  }
}
