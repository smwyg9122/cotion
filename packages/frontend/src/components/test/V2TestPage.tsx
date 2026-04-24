import React, { useState, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  Loader,
  Play,
  RotateCcw,
  Users,
  Package,
  Kanban,
  Coffee,
  FolderOpen,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'pass' | 'fail';
  message?: string;
  duration?: number;
}

interface TestGroup {
  name: string;
  icon: React.ReactNode;
  tests: TestResult[];
}

export function V2TestPage({ workspace }: { workspace: string }) {
  const [groups, setGroups] = useState<TestGroup[]>(getInitialGroups());
  const [isRunning, setIsRunning] = useState(false);
  const [totalPassed, setTotalPassed] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);
  const [totalTests, setTotalTests] = useState(0);

  function getInitialGroups(): TestGroup[] {
    return [
      {
        name: '거래처 DB (Clients)',
        icon: <Users size={18} />,
        tests: [
          { name: 'GET /api/clients — 목록 조회', status: 'pending' },
          { name: 'POST /api/clients — 거래처 생성', status: 'pending' },
          { name: 'PUT /api/clients/:id — 거래처 수정', status: 'pending' },
          { name: 'DELETE /api/clients/:id — 거래처 삭제', status: 'pending' },
        ],
      },
      {
        name: '재고 DB (Inventory)',
        icon: <Package size={18} />,
        tests: [
          { name: 'GET /api/inventory — 목록 조회', status: 'pending' },
          { name: 'POST /api/inventory — 재고 생성', status: 'pending' },
          { name: 'POST /api/inventory/:id/transactions — 입고 기록', status: 'pending' },
          { name: 'GET /api/inventory/:id/transactions — 입출고 내역', status: 'pending' },
          { name: 'DELETE /api/inventory/:id — 재고 삭제', status: 'pending' },
        ],
      },
      {
        name: '프로젝트 보드 (Kanban)',
        icon: <Kanban size={18} />,
        tests: [
          { name: 'POST /api/projects — 프로젝트 생성', status: 'pending' },
          { name: 'GET /api/projects — 프로젝트 목록', status: 'pending' },
          { name: 'POST /api/projects/:id/tasks — 태스크 생성', status: 'pending' },
          { name: 'GET /api/projects/:id/tasks — 태스크 목록', status: 'pending' },
          { name: 'PUT /api/projects/tasks/:id — 태스크 수정', status: 'pending' },
          { name: 'DELETE /api/projects/tasks/:id — 태스크 삭제', status: 'pending' },
          { name: 'DELETE /api/projects/:id — 프로젝트 삭제', status: 'pending' },
        ],
      },
      {
        name: '커핑 로그 (Cupping)',
        icon: <Coffee size={18} />,
        tests: [
          { name: 'GET /api/cupping-logs — 목록 조회', status: 'pending' },
          { name: 'POST /api/cupping-logs — 커핑 로그 생성', status: 'pending' },
          { name: 'PUT /api/cupping-logs/:id — 커핑 로그 수정', status: 'pending' },
          { name: 'DELETE /api/cupping-logs/:id — 커핑 로그 삭제', status: 'pending' },
        ],
      },
      {
        name: '문서 라이브러리 (Documents)',
        icon: <FolderOpen size={18} />,
        tests: [
          { name: 'GET /api/documents — 목록 조회', status: 'pending' },
          { name: 'POST /api/documents — 문서 등록', status: 'pending' },
          { name: 'PUT /api/documents/:id — 문서 수정', status: 'pending' },
          { name: 'DELETE /api/documents/:id — 문서 삭제', status: 'pending' },
        ],
      },
    ];
  }

  const updateTest = useCallback(
    (groupIdx: number, testIdx: number, update: Partial<TestResult>) => {
      setGroups((prev) => {
        const next = prev.map((g, gi) => {
          if (gi !== groupIdx) return g;
          return {
            ...g,
            tests: g.tests.map((t, ti) =>
              ti === testIdx ? { ...t, ...update } : t
            ),
          };
        });
        return next;
      });
    },
    []
  );

  async function runTest(
    groupIdx: number,
    testIdx: number,
    fn: () => Promise<string>
  ): Promise<boolean> {
    updateTest(groupIdx, testIdx, { status: 'running' });
    const start = Date.now();
    try {
      const message = await fn();
      updateTest(groupIdx, testIdx, {
        status: 'pass',
        message,
        duration: Date.now() - start,
      });
      return true;
    } catch (err: any) {
      const errData = err?.response?.data;
      const message =
        errData?.error?.message ||
        errData?.error ||
        errData?.message ||
        err?.message ||
        '알 수 없는 오류';
      updateTest(groupIdx, testIdx, {
        status: 'fail',
        message: `${err?.response?.status || ''} ${typeof message === 'string' ? message : JSON.stringify(message)}`.trim(),
        duration: Date.now() - start,
      });
      return false;
    }
  }

  async function runAllTests() {
    setIsRunning(true);
    setGroups(getInitialGroups());
    let passed = 0;
    let failed = 0;
    let total = 0;

    // ===== Group 0: Clients =====
    let clientId = '';
    const g0 = 0;

    // GET list
    total++;
    if (
      await runTest(g0, 0, async () => {
        const res = await api.get('/clients', { params: { workspace } });
        const data = res.data.data || res.data;
        return `${Array.isArray(data) ? data.length : 0}건 조회 성공`;
      })
    )
      passed++;
    else failed++;

    // POST create
    total++;
    if (
      await runTest(g0, 1, async () => {
        const res = await api.post('/clients', {
          name: '__TEST_거래처__',
          contactPerson: '테스트담당자',
          phone: '010-0000-0000',
          email: 'test@test.com',
          address: '서울시 테스트구',
          visited: false,
          cuppingDone: false,
          purchased: false,
          notes: 'V2 테스트 자동 생성',
          workspace,
        });
        clientId = res.data.data?.id || res.data?.id || '';
        return `생성 성공 (id: ${clientId.slice(0, 8)}...)`;
      })
    )
      passed++;
    else failed++;

    // PUT update
    total++;
    if (clientId) {
      if (
        await runTest(g0, 2, async () => {
          await api.put(`/clients/${clientId}`, {
            name: '__TEST_거래처_수정__',
            visited: true,
          });
          return '수정 성공';
        })
      )
        passed++;
      else failed++;
    } else {
      updateTest(g0, 2, { status: 'fail', message: '생성 실패로 스킵' });
      failed++;
    }

    // DELETE
    total++;
    if (clientId) {
      if (
        await runTest(g0, 3, async () => {
          await api.delete(`/clients/${clientId}`);
          return '삭제 성공';
        })
      )
        passed++;
      else failed++;
    } else {
      updateTest(g0, 3, { status: 'fail', message: '생성 실패로 스킵' });
      failed++;
    }

    // ===== Group 1: Inventory =====
    let inventoryId = '';
    const g1 = 1;

    total++;
    if (
      await runTest(g1, 0, async () => {
        const res = await api.get('/inventory', { params: { workspace } });
        const data = res.data.data || res.data;
        return `${Array.isArray(data) ? data.length : 0}건 조회 성공`;
      })
    )
      passed++;
    else failed++;

    total++;
    if (
      await runTest(g1, 1, async () => {
        const res = await api.post('/inventory', {
          name: '__TEST_에티오피아 예가체프__',
          type: 'green',
          origin: '에티오피아',
          variety: '예가체프',
          process: '워시드',
          totalIn: 60,
          currentStock: 60,
          storageLocation: '창고A-1',
          workspace,
        });
        inventoryId = res.data.data?.id || res.data?.id || '';
        return `생성 성공 (id: ${inventoryId.slice(0, 8)}...)`;
      })
    )
      passed++;
    else failed++;

    // Transaction - 입고
    total++;
    if (inventoryId) {
      if (
        await runTest(g1, 2, async () => {
          await api.post(`/inventory/${inventoryId}/transactions`, {
            type: 'in',
            quantity: 10,
            note: '테스트 입고',
          });
          return '입고 10kg 기록 성공';
        })
      )
        passed++;
      else failed++;
    } else {
      updateTest(g1, 2, { status: 'fail', message: '생성 실패로 스킵' });
      failed++;
    }

    // GET transactions
    total++;
    if (inventoryId) {
      if (
        await runTest(g1, 3, async () => {
          const res = await api.get(`/inventory/${inventoryId}/transactions`);
          const data = res.data.data || res.data;
          return `${Array.isArray(data) ? data.length : 0}건 내역 조회`;
        })
      )
        passed++;
      else failed++;
    } else {
      updateTest(g1, 3, { status: 'fail', message: '생성 실패로 스킵' });
      failed++;
    }

    // DELETE inventory
    total++;
    if (inventoryId) {
      if (
        await runTest(g1, 4, async () => {
          await api.delete(`/inventory/${inventoryId}`);
          return '삭제 성공';
        })
      )
        passed++;
      else failed++;
    } else {
      updateTest(g1, 4, { status: 'fail', message: '생성 실패로 스킵' });
      failed++;
    }

    // ===== Group 2: Projects + Tasks =====
    let projectId = '';
    let taskId = '';
    const g2 = 2;

    // POST project
    total++;
    if (
      await runTest(g2, 0, async () => {
        const res = await api.post('/projects', {
          title: '__TEST_프로젝트__',
          description: 'V2 테스트 자동 생성 프로젝트',
          status: 'active',
          workspace,
        });
        projectId = res.data.data?.id || res.data?.id || '';
        return `프로젝트 생성 (id: ${projectId.slice(0, 8)}...)`;
      })
    )
      passed++;
    else failed++;

    // GET projects
    total++;
    if (
      await runTest(g2, 1, async () => {
        const res = await api.get('/projects', { params: { workspace } });
        const data = res.data.data || res.data;
        return `${Array.isArray(data) ? data.length : 0}개 프로젝트 조회`;
      })
    )
      passed++;
    else failed++;

    // POST task
    total++;
    if (projectId) {
      if (
        await runTest(g2, 2, async () => {
          const res = await api.post(`/projects/${projectId}/tasks`, {
            title: '__TEST_태스크__',
            description: '테스트 태스크입니다',
            status: 'todo',
            priority: 'high',
            position: 0,
          });
          taskId = res.data.data?.id || res.data?.id || '';
          return `태스크 생성 (id: ${taskId.slice(0, 8)}...)`;
        })
      )
        passed++;
      else failed++;
    } else {
      updateTest(g2, 2, { status: 'fail', message: '프로젝트 생성 실패로 스킵' });
      failed++;
    }

    // GET tasks
    total++;
    if (projectId) {
      if (
        await runTest(g2, 3, async () => {
          const res = await api.get(`/projects/${projectId}/tasks`);
          const data = res.data.data || res.data;
          return `${Array.isArray(data) ? data.length : 0}개 태스크 조회`;
        })
      )
        passed++;
      else failed++;
    } else {
      updateTest(g2, 3, { status: 'fail', message: '프로젝트 생성 실패로 스킵' });
      failed++;
    }

    // PUT task
    total++;
    if (taskId) {
      if (
        await runTest(g2, 4, async () => {
          await api.put(`/projects/tasks/${taskId}`, {
            title: '__TEST_태스크_수정__',
            status: 'in_progress',
          });
          return '태스크 수정 성공 (→ in_progress)';
        })
      )
        passed++;
      else failed++;
    } else {
      updateTest(g2, 4, { status: 'fail', message: '태스크 생성 실패로 스킵' });
      failed++;
    }

    // DELETE task
    total++;
    if (taskId) {
      if (
        await runTest(g2, 5, async () => {
          await api.delete(`/projects/tasks/${taskId}`);
          return '태스크 삭제 성공';
        })
      )
        passed++;
      else failed++;
    } else {
      updateTest(g2, 5, { status: 'fail', message: '태스크 생성 실패로 스킵' });
      failed++;
    }

    // DELETE project
    total++;
    if (projectId) {
      if (
        await runTest(g2, 6, async () => {
          await api.delete(`/projects/${projectId}`);
          return '프로젝트 삭제 성공';
        })
      )
        passed++;
      else failed++;
    } else {
      updateTest(g2, 6, { status: 'fail', message: '프로젝트 생성 실패로 스킵' });
      failed++;
    }

    // ===== Group 3: Cupping Logs =====
    let cuppingId = '';
    const g3 = 3;

    total++;
    if (
      await runTest(g3, 0, async () => {
        const res = await api.get('/cupping-logs', { params: { workspace } });
        const data = res.data.data || res.data;
        return `${Array.isArray(data) ? data.length : 0}건 조회 성공`;
      })
    )
      passed++;
    else failed++;

    total++;
    if (
      await runTest(g3, 1, async () => {
        const res = await api.post('/cupping-logs', {
          visitDate: '2026-04-24',
          roasteryName: '__TEST_로스터리__',
          contactPerson: '테스트담당자',
          offeredBeans: '에티오피아 예가체프, 콜롬비아 수프레모',
          reaction: '매우 긍정적',
          purchaseIntent: 'high',
          followupDate: '2026-05-01',
          notes: 'V2 테스트 자동 생성',
          workspace,
        });
        cuppingId = res.data.data?.id || res.data?.id || '';
        return `생성 성공 (id: ${cuppingId.slice(0, 8)}...)`;
      })
    )
      passed++;
    else failed++;

    total++;
    if (cuppingId) {
      if (
        await runTest(g3, 2, async () => {
          await api.put(`/cupping-logs/${cuppingId}`, {
            reaction: '매우 긍정적 (수정됨)',
            purchaseIntent: 'medium',
          });
          return '수정 성공';
        })
      )
        passed++;
      else failed++;
    } else {
      updateTest(g3, 2, { status: 'fail', message: '생성 실패로 스킵' });
      failed++;
    }

    total++;
    if (cuppingId) {
      if (
        await runTest(g3, 3, async () => {
          await api.delete(`/cupping-logs/${cuppingId}`);
          return '삭제 성공';
        })
      )
        passed++;
      else failed++;
    } else {
      updateTest(g3, 3, { status: 'fail', message: '생성 실패로 스킵' });
      failed++;
    }

    // ===== Group 4: Documents =====
    let docId = '';
    const g4 = 4;

    total++;
    if (
      await runTest(g4, 0, async () => {
        const res = await api.get('/documents', { params: { workspace } });
        const data = res.data.data || res.data;
        return `${Array.isArray(data) ? data.length : 0}건 조회 성공`;
      })
    )
      passed++;
    else failed++;

    total++;
    if (
      await runTest(g4, 1, async () => {
        const res = await api.post('/documents', {
          title: '__TEST_문서__',
          category: 'plan',
          description: 'V2 테스트 자동 생성 문서',
          workspace,
        });
        docId = res.data.data?.id || res.data?.id || '';
        return `생성 성공 (id: ${docId.slice(0, 8)}...)`;
      })
    )
      passed++;
    else failed++;

    total++;
    if (docId) {
      if (
        await runTest(g4, 2, async () => {
          await api.put(`/documents/${docId}`, {
            title: '__TEST_문서_수정__',
            category: 'pricelist',
          });
          return '수정 성공';
        })
      )
        passed++;
      else failed++;
    } else {
      updateTest(g4, 2, { status: 'fail', message: '생성 실패로 스킵' });
      failed++;
    }

    total++;
    if (docId) {
      if (
        await runTest(g4, 3, async () => {
          await api.delete(`/documents/${docId}`);
          return '삭제 성공';
        })
      )
        passed++;
      else failed++;
    } else {
      updateTest(g4, 3, { status: 'fail', message: '생성 실패로 스킵' });
      failed++;
    }

    setTotalPassed(passed);
    setTotalFailed(failed);
    setTotalTests(total);
    setIsRunning(false);
  }

  function handleReset() {
    setGroups(getInitialGroups());
    setTotalPassed(0);
    setTotalFailed(0);
    setTotalTests(0);
  }

  const statusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'fail':
        return <XCircle size={16} className="text-red-500" />;
      case 'running':
        return <Loader size={16} className="text-blue-500 animate-spin" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const allDone = totalTests > 0 && !isRunning;

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6 sm:px-8 sm:py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Zap size={28} className="text-amber-500" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Cotion V2 기능 테스트
          </h1>
        </div>
        <p className="text-gray-500 text-sm sm:text-base">
          5개 신규 기능(거래처, 재고, 프로젝트, 커핑, 문서)의 API 연동을
          자동으로 테스트합니다.
          <br />
          테스트 데이터는 생성 후 즉시 삭제됩니다.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <Loader size={16} className="animate-spin" /> 테스트 실행 중...
            </>
          ) : (
            <>
              <Play size={16} /> 전체 테스트 실행
            </>
          )}
        </button>
        <button
          onClick={handleReset}
          disabled={isRunning}
          className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm transition-colors flex items-center gap-2"
        >
          <RotateCcw size={16} /> 초기화
        </button>
      </div>

      {/* Summary Bar */}
      {allDone && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            totalFailed === 0
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {totalFailed === 0 ? (
              <CheckCircle size={24} className="text-green-500" />
            ) : (
              <XCircle size={24} className="text-red-500" />
            )}
            <div>
              <div className="font-semibold text-gray-900">
                {totalFailed === 0
                  ? `모든 테스트 통과! (${totalPassed}/${totalTests})`
                  : `${totalFailed}개 실패 / ${totalPassed}개 통과 (총 ${totalTests}개)`}
              </div>
              <div className="text-sm text-gray-500">
                워크스페이스: {workspace}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Groups */}
      <div className="space-y-4">
        {groups.map((group, gi) => (
          <div
            key={gi}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <div className="bg-gray-50 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
              {group.icon}
              <h2 className="font-semibold text-gray-800 text-sm">
                {group.name}
              </h2>
              <span className="ml-auto text-xs text-gray-400">
                {group.tests.filter((t) => t.status === 'pass').length}/
                {group.tests.length} 통과
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {group.tests.map((test, ti) => (
                <div
                  key={ti}
                  className={`px-4 py-2.5 flex items-center gap-3 text-sm ${
                    test.status === 'fail' ? 'bg-red-50/50' : ''
                  }`}
                >
                  {statusIcon(test.status)}
                  <span className="font-mono text-gray-700 text-xs sm:text-sm flex-1 min-w-0">
                    {test.name}
                  </span>
                  {test.duration !== undefined && (
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {test.duration}ms
                    </span>
                  )}
                  {test.message && (
                    <span
                      className={`text-xs flex-shrink-0 max-w-[200px] truncate ${
                        test.status === 'pass'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                      title={test.message}
                    >
                      {test.message}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">
          Cotion V2 API Integration Test — 24개 엔드포인트, 5개 모듈 자동 검증
        </p>
      </div>
    </div>
  );
}
