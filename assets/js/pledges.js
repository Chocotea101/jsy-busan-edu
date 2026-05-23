/* ============================================================
   공약 데이터 + 페이지 컨트롤
   ============================================================ */

const PLEDGES = [
  {
    n: 1,
    color: 1,
    title: 'AI 교육 대전환 "창의융합형 인재양성"',
    sub: '부산발 AI 교육 대전환으로 기초는 강하게, 미래는 똑똑하게',
    policies: [
      {
        title: 'AI 교육연구정보원 확대·개편',
        items: [
          '교육연구정보원을 AI 교육 허브로 개편',
          'AI 수업모델 제작, 교사연수, AI 윤리교육, 학습데이터 기반 맞춤교육 등 핵심역량 중심 컨트롤타워 개편'
        ]
      },
      {
        title: '행복한 미래교육, AI 맞춤형 교육 대전환',
        items: [
          '통합 AI 기반 학습 플랫폼 구축으로 수준별 맞춤형 학습 제공',
          'AI·SW 창의·융합 교육과정을 확대하여 창의융합형 인재 육성',
          '교육 불평등을 해소하고 AI 학습 기회가 달라지지 않도록 공교육 AI 교육학습 환경 기반 구축'
        ]
      },
      {
        title: 'AI 핵심역량 제고를 위한 맞춤형 교육과정 전환',
        items: [
          'AI 융합 NCS 교육과정 개편',
          '범교과 인공지능(AI) 융합교육과정 운영',
          '생성형 AI 기반 CBL 수업의 이해를 바탕으로 학교 교육과정 다양화'
        ]
      }
    ]
  },
  {
    n: 2,
    color: 2,
    title: '배움이 취업과 정착으로 이어지는 진로·경제교육',
    sub: '미래형 부산교육은 입시에서 끝나는 것이 아니라, 아이들이 자기 삶을 꾸려갈 힘을 길러주는 교육이어야 합니다.',
    policies: [
      {
        title: '부산의 미래형 성장 전략산업 진로트랙 운영',
        items: [
          '해양·물류, 금융·핀테크, AI·데이터 중심의 학과 통·폐합 및 부산의 미래형 교육과정 개편',
          '반도체, 항공, 해양, AI 빅데이터 등 미래 전략산업 전문인력 양성을 위한 특성화고 확대 및 전문 교원 양성 지원'
        ]
      },
      {
        title: '고교-산업 연계형 프로젝트 수업',
        items: [
          '지역 대학·기업과 연계한 프로젝트 수업과 현장 체험, 인턴십형 프로그램 확대',
          '글로벌 학습 환경 구축으로 중소기업·특성화고 연계 맞춤형 미래인재 육성'
        ]
      },
      {
        title: '부산에 정주하는 인재교육 생태계 구축',
        items: [
          '인재를 "키우는 도시"에서 "정주하는 도시"로 전환하는 교육정책 추진',
          '산업수요형 교육정책 수립을 통한 교육 → 취업 → 정주 → 산업고도화로 이어지는 교육',
          '"창업 중심 도시"에서 "스케일업 도시"로의 전환교육 추진'
        ]
      },
      {
        title: 'AI시대의 맞춤형 진로진학·경제교육 강화',
        items: [
          'AI 바우처 플랫폼을 구축하여 초·중·고 교육 컨트롤타워 기능 수행',
          '부산형 진로진학지원센터 기능을 강화한 진로진학 전문연구원 운영',
          '초등 용돈·저축, 중등 신용·이자·금융사기 예방, 고등 투자·자산관리·연금·세금 등 단계별 경제·금융교육 실시',
          '지역 금융기관과 연계한 디지털 금융·경제체험 교육 운영',
          '청소년의 경제적 자립역량과 사회초년생 금융문해력 교육 강화'
        ]
      }
    ]
  },
  {
    n: 3,
    color: 3,
    title: '글로벌 품격과 태도를 기르는 인성교육',
    sub: '권리만이 아니라 책임을, 실력만이 아니라 먼저 사람됨을 가르치겠습니다.',
    policies: [
      {
        title: '존중과 배려의 감성교육 강화',
        items: [
          '타인의 자유와 권리를 존중하고 타인과의 갈등 해결 역량 교육',
          '생활 속 예절과 언어습관, 디지털 윤리 중심으로 책임 있는 생활교육'
        ]
      },
      {
        title: '글로벌 한국인으로서의 시민교육 강화',
        items: [
          '글로벌 기준의 품격과 예절 교육, 협업 및 다문화 이해 교육',
          '해외 학교 온라인·오프라인 교류 확대 및 실생활 중심 외국어 교육'
        ]
      },
      {
        title: '모두가 신나는 즐거운 학교 만들기',
        items: [
          '더 넓은 선택, 더 편안한 교복, 신나는 학교 만들기 실현',
          '존중과 배려에 기반한 특색있는 학교 프로그램 운영',
          '학생들의 정서지원프로그램 강화 (ADHD, 우울증, 조울증 등)'
        ]
      }
    ]
  },
  {
    n: 4,
    color: 4,
    title: '학습능력을 높이는 수준별 맞춤형 학습·지원',
    sub: 'AI시대에도 기본은 읽기, 쓰기, 계산하는 힘입니다. 한 명도 놓치지 않겠습니다.',
    policies: [
      {
        title: '기초, 기본 학력 책임교육',
        items: [
          '평가가 아닌 진단을 통한 학생별, 수준별 기초 문해력, 수리력, 질문 능력 등 기초학력 신장 강화',
          '이해-암기-활용으로 이어지는 학습 과정 완성'
        ]
      },
      {
        title: '진단·처방·모니터링 연계 교육 전환',
        items: [
          '진단·처방·모니터링 시스템 도입으로 1:1 기반 교육 제공',
          '학력 격차를 초기에 해결하여 자기 주도적 학습 습관 형성'
        ]
      },
      {
        title: '인공지능 시대, 미래 인재형 학력 신장',
        items: [
          'AI-Tutorial System으로 학생별 맞춤형 학습지원 강화',
          '수준별 맞춤형 학습코치와 전문 인력을 연계하여 지원',
          'AI 시대 질문능력(프롬프트 엔지니어링)과 검증 능력 향상을 위한 교육 체계 구축'
        ]
      }
    ]
  },
  {
    n: 5,
    color: 5,
    title: '상생 협력하는 교육공동체 동행교육',
    sub: '학교와 가정, 지역이 함께 아이를 키우는 부산교육을 만들겠습니다.',
    policies: [
      {
        title: '촘촘한 안전망으로 안전한 학교 만들기',
        items: [
          '지자체·경찰·소방·복지단체 등 유관기관과 상시 협력 체계 구축 통한 학교 안전 고도화',
          '통학 취약지역의 안전한 등하교를 위한 통학로 개선'
        ]
      },
      {
        title: '존중받는 교사, 교육력 회복',
        items: [
          '교무업무전담교사를 배치하여 교무행정 지원체계 강화',
          '즉각적이고 실질적인 교권 보호 시스템을 구축하여 교육력 회복 (학교별 교권보호지원단 역할 강화)',
          '부산교육회복센터 설치하여 학폭, 교권문제 종합관리',
          '학교 보건업무 공백 지원을 위한 학생보건지원 인력풀 구축',
          '서부산권 영양교육체험센터 설립을 통한 영양교육 지원 강화',
          '학연·혈연·지연을 배제한 공정한 인사평가 제도 확립'
        ]
      },
      {
        title: '교육공동체와 함께 만드는 미래교육',
        items: [
          '학부모교육진흥원 설립을 통한 학부모 교육 지원 체계 구축하여 함께 만드는 행복교육 실현',
          '부산형 다문화교육 활성화로 이주배경 학생의 적응과 소통 강화',
          '특수교육 대상 학생과 가정을 대상으로 상담·진로·돌봄 지원 강화',
          '마을학교(우리동네자람터, 지역아동센터 등) 이용 편의를 위한 통합시스템 구축'
        ]
      }
    ]
  },
  {
    n: 6,
    color: 6,
    title: '학생이 행복한 체험중심교육',
    sub: '책상 앞 공부만이 아니라, 몸과 마음이 함께 성장하는 학교를 만들겠습니다.',
    policies: [
      {
        title: "학생 맞춤형 '1인 1기' 실천중심 교육",
        items: [
          '1학생 1예술·1체육 활동을 지원하는 부산교육 실천',
          '과학·기술·인문학 분야의 교류·협력 활동 기회 제공'
        ]
      },
      {
        title: '인성교육과 연계한 생태체험교육',
        items: [
          '학교밖 체험과 실천 중심의 해양 생태교육, 숲체험 활성화',
          '부산의 자연환경을 활용한 생명 존중, 책임, 협력의 가치를 배우는 체험교육 인프라 구축'
        ]
      },
      {
        title: '부산형 체험교육 거점 센터 운영',
        items: [
          '기존 시설과 지역자원을 우선 활용',
          '권역별 체험교육 시설 단계적 확대'
        ]
      }
    ]
  }
];

/* ============================================================
   렌더링
   ============================================================ */

const tabsEl = document.getElementById('tabs');
const stageEl = document.getElementById('stage');

function renderTabs(activeN) {
  tabsEl.innerHTML = PLEDGES.map(p =>
    `<button class="pledge-tab ${p.n === activeN ? 'is-active' : ''}" data-color="${p.color}" data-n="${p.n}">
      공약 0${p.n}
    </button>`
  ).join('');
  tabsEl.querySelectorAll('.pledge-tab').forEach(b => {
    b.addEventListener('click', () => goTo(Number(b.dataset.n)));
  });
}

function renderDetail(n) {
  const p = PLEDGES.find(x => x.n === n);
  if (!p) return;

  const prev = n > 1 ? n - 1 : null;
  const next = n < 6 ? n + 1 : null;

  const policiesHTML = p.policies.map(pol => `
    <div class="pd-policy">
      <h4>${pol.title}</h4>
      <ol>
        ${pol.items.map(it => `<li>${it}</li>`).join('')}
      </ol>
    </div>
  `).join('');

  stageEl.innerHTML = `
    <article class="pledge-detail pd-detail-pages" data-color="${p.color}">
      <header class="pd-head">
        <span class="pd-num-pill">공약 0${p.n}</span>
        <h1 class="pd-title">${p.title}</h1>
        <p class="pd-sub">${p.sub}</p>
      </header>
      <div class="pd-body">
        ${policiesHTML}
        <div class="pd-cards" id="pd-cards-${p.n}" hidden>
          <h5>공약 카드뉴스</h5>
          <div class="pd-cards-track"></div>
        </div>
        <div class="pd-nav">
          ${prev ? `<button class="btn btn-ghost" data-n="${prev}">← 공약 0${prev}</button>` : `<span></span>`}
          ${next ? `<button class="btn btn-primary" data-n="${next}">공약 0${next} →</button>` : `<a class="btn btn-primary" href="index.html">메인으로 돌아가기</a>`}
        </div>
      </div>
    </article>
  `;

  stageEl.querySelectorAll('[data-n]').forEach(b => {
    b.addEventListener('click', () => goTo(Number(b.dataset.n)));
  });

  detectCards(p.n);
}

/* 카드뉴스 자동 감지 — pledge-N-1.jpg ~ pledge-N-8.jpg */
function detectCards(n) {
  const wrap = document.getElementById(`pd-cards-${n}`);
  const track = wrap.querySelector('.pd-cards-track');
  let found = 0;
  let pending = 8;

  for (let i = 1; i <= 8; i++) {
    const src = `assets/img/pledge-cards/pledge-${n}-${i}.jpg`;
    const probe = new Image();
    probe.onload = () => {
      found++;
      const img = document.createElement('img');
      img.src = src;
      img.alt = `공약 ${n} 카드 ${i}`;
      img.loading = 'lazy';
      img.dataset.idx = i;
      track.appendChild(img);
      // 순서 유지 위해 정렬
      [...track.children]
        .sort((a, b) => Number(a.dataset.idx) - Number(b.dataset.idx))
        .forEach(el => track.appendChild(el));
      finish();
    };
    probe.onerror = finish;
    probe.src = src;
  }
  function finish() {
    pending--;
    if (pending === 0 && found > 0) wrap.hidden = false;
  }
}

/* ============================================================
   라우팅 (해시)
   ============================================================ */

function goTo(n) {
  if (n < 1 || n > 6) return;
  location.hash = `pledge-${n}`;
}

function readHash() {
  const m = /pledge-(\d+)/.exec(location.hash);
  return m ? Math.min(6, Math.max(1, Number(m[1]))) : 1;
}

function render() {
  const n = readHash();
  renderTabs(n);
  renderDetail(n);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('hashchange', render);
render();

/* ============================================================
   키보드 + 터치 스와이프
   ============================================================ */

document.addEventListener('keydown', e => {
  const n = readHash();
  // 좌우 화살표가 다른 컨트롤에서 쓰이는 경우(input 등) 회피
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (e.key === 'ArrowRight' && n < 6) goTo(n + 1);
  if (e.key === 'ArrowLeft' && n > 1) goTo(n - 1);
});

let touchStartX = null;
stageEl.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });

stageEl.addEventListener('touchend', e => {
  if (touchStartX === null) return;
  // 카드뉴스 트랙 내부 스와이프는 무시
  if (e.target.closest('.pd-cards-track')) {
    touchStartX = null;
    return;
  }
  const dx = e.changedTouches[0].clientX - touchStartX;
  const n = readHash();
  if (Math.abs(dx) > 60) {
    if (dx < 0 && n < 6) goTo(n + 1);
    if (dx > 0 && n > 1) goTo(n - 1);
  }
  touchStartX = null;
}, { passive: true });
