/* =========================================================
   중학교 정보 연결형 워크북 - 렌더링 & 상호작용 (유연형)
   있는 섹션만 순서대로 렌더링하고 번호를 매긴다.
   수행평가 모듈은 비밀코드 잠금.
   ========================================================= */

const homeEl = document.getElementById('home');
const lessonEl = document.getElementById('lesson-view');
const homeAreas = document.getElementById('home-areas');
const unlocked = {}; // 세션 동안 잠금 해제 기억
let currentLessonId = null; // 자동 저장 키에 사용

/* ---------- 홈 ---------- */
function buildHome() {
  let html = '';
  Object.keys(AREAS).forEach(key => {
    const area = AREAS[key];
    const list = LESSONS.filter(l => l.area === key);
    html += `<div class="area-group">
      <h2 class="area-title ${area.color}">${area.icon} ${area.name}</h2>
      <p class="area-desc">${area.desc}</p>
      <div class="cards">` +
      list.map(l => `
        <div class="card ${area.color}${l.locked ? ' locked-card' : ''}" data-lesson="${l.id}">
          <div class="badge">${l.locked ? '🔒 ' : l.no + ' · '}${area.short}</div>
          <h3>${l.locked ? '수행평가' : l.title}</h3>
          <p>${l.locked ? '평가 당일에 진행해요.' : l.subtitle}</p>
          <div class="meta">
            ${l.meta.time ? `<span class="tag">${l.meta.time}</span>` : ''}
            ${l.meta.concepts ? `<span class="tag">${l.meta.concepts}</span>` : ''}
          </div>
        </div>`).join('') +
      `</div></div>`;
  });
  homeAreas.innerHTML = html;
}

/* ---------- 차시 렌더 ---------- */
function renderLesson(id) {
  const l = LESSONS.find(x => x.id === id);
  if (!l) return;

  // 잠금 처리
  if (l.locked && !unlocked[l.id]) {
    renderLock(l);
    return;
  }

  const area = AREAS[l.area];
  const c = area.color;
  currentLessonId = l.id;
  const idx = LESSONS.indexOf(l);
  const prev = LESSONS[idx - 1];
  const next = LESSONS[idx + 1];

  let body = '';
  let n = 0;
  const step = (title, inner, extra) => {
    n++;
    return `<div class="block ${c}${extra || ''}"><h3><span class="stepnum">${n}</span>${title}</h3>${inner}</div>`;
  };

  if (l.question) body += step('오늘의 질문',
    `<div class="q-box">${l.question.body}</div>${l.question.note ? `<p class="note">${l.question.note}</p>` : ''}`);
  if (l.concept) body += step('쉬운 개념', l.concept);
  if (l.quiz) body += step('확인 문제', l.quiz.map((q, qi) => `
    <div class="quiz" data-answer="${q.answer}">
      <div class="qtext">Q${qi + 1}. ${q.q}</div>
      <div class="opts">${q.opts.map(o => `<div class="opt">${o}</div>`).join('')}</div>
      <div class="feedback"></div>
    </div>`).join(''));
  if (l.predict) {
    const predictContent = l.area === 'ai'
      ? `${l.predict.body}
         <div class="predict-write">
           <div class="note worksheet-note">✍️ 먼저 예상한 결과와 그 이유를 <b>학습지에 작성하세요.</b></div>
           <button class="reveal-btn compare-btn" data-ai-reveal aria-expanded="false">예시 답안 확인하기</button>
           <div class="answer example-answer"><b>예시 답안</b><br />${l.predict.answer}</div>
         </div>`
      : `${l.predict.body}
         <div class="predict-write">
           <label class="write-label">내가 예상한 실행 결과</label>
           <textarea class="write-area predict-input" placeholder="실행 결과를 먼저 예상해서 적어 보세요."></textarea>
           <label class="write-label">그렇게 생각한 이유</label>
           <textarea class="write-area predict-reason" placeholder="코드가 어떤 순서로 실행되는지 설명해 보세요."></textarea>
           <button class="reveal-btn compare-btn" data-compare disabled>내 답과 비교하기</button>
           <div class="answer example-answer"><b>예시 답안</b><br />${l.predict.answer}</div>
         </div>`;
    body += step('실행 결과 예상하기', predictContent);
  }
  if (l.follow) body += step('따라 하기 실습 <span class="lvl req">🟢 필수</span>', l.follow +
    `<div class="note done-check">✅ <b>완료 확인</b> · 실행했을 때 예상한 결과가 나왔나요? 안 되면 아래 <b>🛠 작동하지 않아요?</b> 체크리스트를 확인하세요.</div>`);
  if (l.change) body += step('바꿔 보기 / 스스로 해보기 <span class="lvl opt">🟡 선택 · 🔺 도전</span>', l.change);
  if (l.debug) body += step('오류 고치기',
    `<p>${l.debug.intro}</p><div class="buggy"><div class="code" data-bug="${l.debug.bug}" data-ok="${encodeURIComponent(l.debug.ok)}" data-no="${encodeURIComponent(l.debug.no)}">${l.debug.lines.map(x => `<span class="bugline">${x}</span>`).join('\n')}</div></div><div class="feedback"></div>`);
  if (l.advance) body += step('더 나아가기 <span class="lvl advance-lvl">🚀 개념 확장</span>', l.advance, ' advance');
  if (l.summary) {
    const summaryContent = l.area === 'ai'
      ? `<div class="summary-grid">${l.summary.items.map(s => `<div class="summary-item"><b>${s.t}</b><br />${s.d}</div>`).join('')}</div>
         <div class="note worksheet-note" style="margin-top:12px">✍️ 오늘 배운 내용을 한 문장으로 <b>학습지에 정리하세요.</b></div>`
      : `<div class="summary-grid">${l.summary.items.map(s => `<div class="summary-item"><b>${s.t}</b><br />${s.d}</div>`).join('')}</div>
         <p style="margin-top:12px">오늘 배운 것을 한 문장으로 정리해 보세요.</p>
         <textarea class="write-area" placeholder="${l.summary.reflect || ''}"></textarea>`;
    body += step('배운 점 정리', summaryContent);
  }
  if (l.challenge) body += step('추가 도전 <span class="lvl chal">🔺 도전</span>', l.challenge, ' challenge');
  if (l.assessment) body += `<div class="block ${c} exam">${l.assessment}</div>`;

  lessonEl.innerHTML = `
    <div class="lesson ${c} active">
      <div class="lesson-head ${c}">
        <div class="kicker">${area.icon} ${area.name}</div>
        <h2>${l.no}. ${l.title}</h2>
        <p class="lead-sub">${l.subtitle}</p>
        <div class="chips">
          ${l.meta.time ? `<span class="chip">⏱ ${l.meta.time}</span>` : ''}
          ${l.meta.tool ? `<span class="chip">🔧 ${l.meta.tool}</span>` : ''}
          ${l.meta.device ? `<span class="chip">🖥 ${l.meta.device}</span>` : ''}
          ${l.meta.prereq ? `<span class="chip">📌 선행: ${l.meta.prereq}</span>` : ''}
          ${l.meta.standard ? `<span class="chip">🎯 ${l.meta.standard}</span>` : ''}
        </div>
        <div class="levels">⏱ 기본 45분 · 심화 90분 &nbsp;|&nbsp; 🟢 필수(따라 하기) · 🟡 선택(바꿔 보기) · 🚀 더 나아가기 · 🔺 도전</div>
      </div>
      ${body}
      ${buildAreaSupport(l, c)}
      ${(l.teacher && !l.assessment) ? `<details class="teacher"><summary>👩‍🏫 교사용 참고 (학생 화면에는 표시하지 않음)</summary>${l.teacher}</details>` : ''}
      ${buildSaveBar(l)}
      <div class="lesson-nav">
        <button ${prev ? `data-lesson="${prev.id}"` : 'disabled'}>← ${prev ? prev.no : '이전'}</button>
        <button ${next ? `data-lesson="${next.id}"` : 'data-home'}>${next ? next.no + ' →' : '홈으로 →'}</button>
      </div>
    </div>`;

  wireLesson();
  showLesson();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- 실습 지원(대체 경로·오류 해결) ---------- */
function buildAreaSupport(l, c) {
  let html = '';
  if (l.area === 'prog' && !l.assessment) {
    html += `<div class="block ${c} support"><h3>🧰 실습 준비물</h3>
      <ul class="clean">
        <li>🔗 <b>엔트리 바로가기</b> : <a href="https://playentry.org" target="_blank" rel="noopener">playentry.org</a> → 로그인 후 '작품 만들기'</li>
        <li>📄 <b>시작 작품·완성 예시 파일</b> : 선생님이 나눠 주면 그 파일을 열어서 시작하고, 없으면 빈 화면에서 시작해요.</li>
        <li>💡 항상 처음부터 만들 필요 없어요 — <b>시작 작품 열기 → 빈 부분 완성</b>, <b>오류 있는 코드 고치기</b>, <b>기본 작품 변형</b>도 좋은 방법!</li>
      </ul></div>`;
  }
  if (l.area === 'phys' && !l.assessment) {
    html += `<div class="block ${c} support"><h3>🔧 이렇게도 실습할 수 있어요</h3>
      <ul class="clean">
        <li><b>① 실제 마이크로비트</b> : 코드를 내려받아 기기에 넣고 직접 확인</li>
        <li><b>② MakeCode 시뮬레이터</b> : 기기가 없어도 화면에서 바로 실행 — <a href="https://makecode.microbit.org" target="_blank" rel="noopener">makecode.microbit.org</a></li>
        <li><b>③ 기기 없이</b> : 코드를 읽고 "실행 결과 예상하기"로 흐름을 분석</li>
        <li>📄 <b>시작 파일(.hex)</b> : 선생님이 나눠 주면 그 파일을 열어서 시작해요.</li>
      </ul>
      <div class="note">🎤 소리(마이크·스피커)를 쓰는 활동은 <b>마이크로비트 V2 권장</b> · V1은 시뮬레이터 또는 대체 활동을 이용하세요.</div></div>`;
  }
  if (l.area === 'ai' && !l.assessment) {
    html += `<div class="block ${c} support"><h3>🧰 인공지능 실습 도구</h3>
      <ul class="clean">
        <li>🔗 <b>티처블머신 바로가기</b> : <a href="https://teachablemachine.withgoogle.com" target="_blank" rel="noopener">teachablemachine.withgoogle.com</a> → '시작하기' → <b>이미지/오디오</b> 프로젝트 선택</li>
        <li>📷 <b>카메라·마이크가 있으면</b> : 무리마다 사진을 직접 찍거나 소리를 녹음해 <b>여러 개(예: 20~30개)</b> 학습시켜 보세요.</li>
        <li>🖼 <b>없으면</b> : 미리 준비한 <b>예시 사진·소리 파일</b>을 업로드하거나, 위 <b>모의 체험</b>으로 원리를 이해해요.</li>
        <li>학습 데이터 수 / 테스트 결과 / 틀린 예측 원인 / 데이터 추가 후 변화는 <b>학습지에 작성하세요.</b></li>
      </ul></div>`;
  }
  html += `<details class="trouble"><summary>🛠 작동하지 않아요? — 오류 해결 체크리스트</summary>${troubleList(l.area)}</details>`;
  return html;
}
function troubleList(area) {
  if (area === 'prog') return `<ul class="clean">
    <li>시작 블록(예: 시작하기 버튼을 클릭했을 때)이 <b>연결</b>되어 있나요?</li>
    <li>변수·신호 <b>이름이 정확히 같은지</b> 확인했나요?</li>
    <li>조건의 <b>부등호 방향</b>(≥, ≤, &gt;, &lt;)이 맞나요?</li>
    <li>반복 블록 <b>안에</b> 명령이 들어 있나요?</li>
    <li>보내는 신호와 받는 신호의 <b>이름이 같은지</b> 확인했나요?</li></ul>`;
  if (area === 'phys') return `<ul class="clean">
    <li>올바른 기기(마이크로비트)를 선택했나요?</li>
    <li>코드가 기기에 <b>다운로드</b>되었나요?</li>
    <li>센서 <b>기준값</b>이 지금 교실 환경에 맞나요?</li>
    <li>V1과 V2의 기능 차이(소리 등)는 없나요?</li>
    <li>무선 활동이면 <b>그룹 번호</b>가 서로 같나요?</li></ul>`;
  return `<ul class="clean">
    <li>클래스(분류)별 <b>데이터 수가 비슷</b>한가요?</li>
    <li>배경이 한쪽 클래스에만 <b>치우치지</b> 않았나요?</li>
    <li>카메라·마이크 <b>권한</b>이 허용되었나요?</li>
    <li>학습 데이터와 테스트 데이터를 <b>구분</b>했나요?</li></ul>`;
}
function buildSaveBar(l) {
  if (l && l.area === 'ai') {
    return `<div class="savebar">
      <span class="save-status">✍️ 선택·실험 결과와 생각은 학습지에 작성하세요.</span>
      <span class="save-actions"><button class="mini-btn" data-print>🖨 화면 인쇄</button></span></div>`;
  }
  return `<div class="savebar">
    <span class="save-status">✍️ 입력한 내용은 이 브라우저에 자동 저장돼요.</span>
    <span class="save-actions">
      <button class="mini-btn" data-print>🖨 인쇄</button>
      <button class="mini-btn" data-reset>🗑 이 차시 기록 초기화</button>
    </span></div>`;
}

/* ---------- 잠금 화면 ---------- */
function renderLock(l) {
  const area = AREAS[l.area];
  const c = area.color;
  lessonEl.innerHTML = `
    <div class="lesson ${c} active">
      <div class="lesson-head ${c}">
        <div class="kicker">${area.icon} ${area.name}</div>
        <h2>🔒 ${l.code ? l.title : '수행평가'}</h2>
        ${l.code ? `<p class="lead-sub">${l.subtitle}</p>` : ''}
      </div>
      ${l.code ? `<div class="lock-box">
        <div class="lock-icon">🔒</div>
        <h3>수행평가 잠금</h3>
        <p>이 수행평가는 비밀코드로 잠겨 있어요.<br />선생님이 알려 주는 코드를 입력하세요.</p>
        <div class="lock-form">
          <input type="password" class="lock-input" placeholder="비밀코드 입력" maxlength="12" />
          <button class="sim-btn lock-btn">열기</button>
        </div>
        <div class="lock-msg"></div>
      </div>` : `<div class="lock-box">
        <div class="lock-icon">🔒</div>
        <h3>수행평가 · 평가 당일 공개</h3>
        <p>이 수행평가는 <b>평가 당일</b> 선생님이 나눠 주는 <b>전용 파일</b>로 진행합니다.<br />그때 자유롭게 풀 수 있어요. 지금은 앞의 학습 차시로 충분히 연습해 두세요! 💪</p>
      </div>`}
      <div class="lesson-nav">
        <button data-home>홈으로 →</button>
      </div>
    </div>`;
  const input = lessonEl.querySelector('.lock-input');
  if (input && l.code) {
    const msg = lessonEl.querySelector('.lock-msg');
    const tryUnlock = () => {
      if ((input.value || '').trim() === String(l.code)) {
        unlocked[l.id] = true;
        renderLesson(l.id);
      } else {
        msg.textContent = '코드가 맞지 않아요. 다시 확인해 주세요.';
        msg.className = 'lock-msg bad';
        input.value = '';
        input.focus();
      }
    };
    lessonEl.querySelector('.lock-btn').addEventListener('click', tryUnlock);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
    input.focus();
  }
  showLesson();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- 화면 전환 ---------- */
function showHome() { homeEl.style.display = 'block'; lessonEl.style.display = 'none'; setNav('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function showLesson() { homeEl.style.display = 'none'; lessonEl.style.display = 'block'; }
function setNav(key) {
  document.querySelectorAll('.nav button').forEach(b =>
    b.classList.toggle('active', key === 'home' && b.hasAttribute('data-home')));
}

/* ---------- 전역 클릭 ---------- */
document.addEventListener('click', (e) => {
  const home = e.target.closest('[data-home]');
  const lessonBtn = e.target.closest('[data-lesson]');
  const areaBtn = e.target.closest('[data-area]');
  if (home) { showHome(); return; }
  if (lessonBtn) { renderLesson(lessonBtn.dataset.lesson); return; }
  if (areaBtn) { const f = LESSONS.find(l => l.area === areaBtn.dataset.area); if (f) renderLesson(f.id); }
});

/* ---------- 상호작용 연결 ---------- */
function wireLesson() {
  lessonEl.querySelectorAll('.quiz').forEach(quiz => {
    const answer = parseInt(quiz.dataset.answer, 10);
    const opts = quiz.querySelectorAll('.opt');
    const fb = quiz.querySelector('.feedback');
    opts.forEach((opt, i) => opt.addEventListener('click', () => {
      if (quiz.dataset.done) return;
      quiz.dataset.done = '1';
      opts.forEach(o => o.classList.add('disabled'));
      const ok = i === answer;
      opt.classList.add(ok ? 'correct' : 'wrong');
      if (!ok) opts[answer].classList.add('correct');
      fb.classList.add('show', ok ? 'good' : 'bad');
      fb.textContent = ok ? '정답이에요! 잘했어요 👍' : '아쉬워요. 초록색이 정답이에요. 개념을 다시 확인해 볼까요?';
    }));
  });

  lessonEl.querySelectorAll('[data-compare]').forEach(btn => {
    const wrap = btn.closest('.predict-write');
    const resultInput = wrap.querySelector('.predict-input');
    const reasonInput = wrap.querySelector('.predict-reason');
    const ans = wrap.querySelector('.example-answer');

    const updateCompareState = () => {
      const ready = resultInput.value.trim() !== '' && reasonInput.value.trim() !== '';
      btn.disabled = !ready;
      if (!ready && ans.classList.contains('show')) {
        ans.classList.remove('show');
        btn.textContent = '내 답과 비교하기';
        btn.setAttribute('aria-expanded', 'false');
      }
    };

    resultInput.addEventListener('input', updateCompareState);
    reasonInput.addEventListener('input', updateCompareState);
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      ans.classList.toggle('show');
      const open = ans.classList.contains('show');
      btn.textContent = open ? '예시 답안 닫기' : '내 답과 비교하기';
      btn.setAttribute('aria-expanded', String(open));
    });

    btn._updateCompareState = updateCompareState;
  });

  lessonEl.querySelectorAll('[data-ai-reveal]').forEach(btn => {
    const wrap = btn.closest('.predict-write');
    const ans = wrap ? wrap.querySelector('.example-answer') : null;
    if (!ans) return;
    btn.addEventListener('click', () => {
      ans.classList.toggle('show');
      const open = ans.classList.contains('show');
      btn.textContent = open ? '예시 답안 닫기' : '예시 답안 확인하기';
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  lessonEl.querySelectorAll('.buggy .code').forEach(code => {
    const bug = parseInt(code.dataset.bug, 10);
    const okMsg = decodeURIComponent(code.dataset.ok);
    const noMsg = decodeURIComponent(code.dataset.no);
    const lines = code.querySelectorAll('.bugline');
    const fb = code.closest('.block').querySelector('.feedback');
    lines.forEach((line, i) => line.addEventListener('click', () => {
      lines.forEach(x => x.classList.remove('found'));
      line.classList.add('found');
      const ok = i === bug;
      fb.classList.remove('good', 'bad');
      fb.classList.add('show', ok ? 'good' : 'bad');
      fb.innerHTML = ok ? okMsg : noMsg;
    }));
  });

  lessonEl.querySelectorAll('[data-sim]').forEach(el => {
    const k = el.dataset.sim;
    if (k === 'dice') simDice(el);
    else if (k === 'guess') simGuess(el);
    else if (k === 'aiImage') simAiImage(el);
    else if (k === 'aiSound') simAiSound(el);
  });

  // ----- 내 기록 자동 저장 (localStorage) -----
  const saveEls = lessonEl.querySelectorAll('.write-area, .mini-in');
  const status = lessonEl.querySelector('.save-status');
  saveEls.forEach((el, i) => {
    if (el.closest('[data-sim]')) return;
    const key = 'wb:v6:' + currentLessonId + ':' + i;
    const saved = localStorage.getItem(key);
    if (saved !== null) el.value = saved;
    el.addEventListener('input', () => {
      localStorage.setItem(key, el.value);
      if (status) status.textContent = '💾 저장됨 · ' + new Date().toLocaleTimeString();
    });
  });
  lessonEl.querySelectorAll('[data-compare]').forEach(btn => {
    if (typeof btn._updateCompareState === 'function') btn._updateCompareState();
  });
  const printBtn = lessonEl.querySelector('[data-print]');
  if (printBtn) printBtn.addEventListener('click', () => window.print());
  const resetBtn = lessonEl.querySelector('[data-reset]');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    if (!confirm('이 차시에 입력한 내 기록을 모두 지울까요?')) return;
    saveEls.forEach((el, i) => {
      if (el.closest('[data-sim]')) return;
      localStorage.removeItem('wb:v6:' + currentLessonId + ':' + i);
      el.value = '';
    });
    lessonEl.querySelectorAll('[data-compare]').forEach(btn => {
      if (typeof btn._updateCompareState === 'function') btn._updateCompareState();
    });
    if (status) status.textContent = '기록을 초기화했어요.';
  });
}

/* ================= 시뮬레이터 ================= */
function simDice(el) {
  el.innerHTML = `<div>가상 주사위 (흔드는 대신 눌러 보세요)</div>
    <div class="dice">🎲</div><div><button class="sim-btn">흔들기 🤝</button></div>
    <div class="sim-log">아직 굴리지 않았어요.</div>`;
  const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  const dice = el.querySelector('.dice'), log = el.querySelector('.sim-log');
  let count = 0;
  el.querySelector('.sim-btn').addEventListener('click', () => {
    dice.classList.remove('rolling'); void dice.offsetWidth; dice.classList.add('rolling');
    let t = 0;
    const spin = setInterval(() => {
      dice.textContent = faces[Math.floor(Math.random() * 6)];
      if (++t > 6) { clearInterval(spin); const v = Math.floor(Math.random() * 6) + 1; dice.textContent = faces[v - 1]; count++; log.textContent = `${count}번째 결과: ${v} (범위 1~6 무작위)`; }
    }, 70);
  });
}

function simGuess(el) {
  el.innerHTML = `<div>1~100 사이 숫자를 맞혀 보세요!</div>
    <div style="margin:12px 0">
      <input type="number" class="guess-in" min="1" max="100" placeholder="숫자" />
      <button class="sim-btn guess-btn">확인</button>
      <button class="reveal-btn guess-reset" style="margin-left:6px">새 게임</button>
    </div>
    <div class="predict-out guess-msg">숫자를 입력하고 확인을 누르세요.</div>
    <div class="sim-log guess-log"></div>`;
  let answer, tries;
  const input = el.querySelector('.guess-in'), msg = el.querySelector('.guess-msg'), log = el.querySelector('.guess-log');
  const reset = () => { answer = Math.floor(Math.random() * 100) + 1; tries = 0; msg.textContent = '숫자를 입력하고 확인을 누르세요.'; log.textContent = ''; input.value = ''; };
  el.querySelector('.guess-btn').addEventListener('click', () => {
    const g = parseInt(input.value, 10);
    if (isNaN(g)) { msg.textContent = '숫자를 입력하세요.'; return; }
    tries++;
    if (g === answer) msg.textContent = `🎉 정답! ${tries}번 만에 맞혔어요.`;
    else if (g > answer) msg.textContent = '⬇ 더 작게!';
    else msg.textContent = '⬆ 더 크게!';
    log.textContent = `시도 횟수: ${tries}`;
  });
  el.querySelector('.guess-reset').addEventListener('click', reset);
  reset();
}

const AI_IMG = {
  dog: { name: '강아지', emoji: '🐶', feat: '축 늘어진 귀, 긴 주둥이' },
  cat: { name: '고양이', emoji: '🐱', feat: '뾰족한 귀, 짧은 얼굴' },
  rabbit: { name: '토끼', emoji: '🐰', feat: '아주 긴 귀' },
  penguin: { name: '펭귄', emoji: '🐧', feat: '검은 등, 흰 배' }
};
const AI_SND = {
  tiger: { name: '호랑이', emoji: '🐯', feat: '낮고 굵은 울음' },
  fox: { name: '여우', emoji: '🦊', feat: '높고 날카로운 소리' },
  wolf: { name: '늑대', emoji: '🐺', feat: '길게 이어지는 하울링' }
};
function simAiImage(el) { simClassifier(el, AI_IMG, '이 사진은'); }
function simAiSound(el) { simClassifier(el, AI_SND, '이 소리는'); }

function simClassifier(el, data, lead) {
  const keys = Object.keys(data);
  el.innerHTML = `<div class="ai-sim">
    <div class="samples">${keys.map(k => `<div class="sample" data-key="${k}" title="${data[k].name}">${data[k].emoji}</div>`).join('')}</div>
    <div class="predict-bars"></div>
    <div class="predict-out">위에서 하나를 선택하면 인공지능의 판단을 보여 줍니다.</div>
    <div class="sim-disclaimer">ℹ️ 이 활동은 인공지능의 분류 결과가 <b>확률로 표시되는 방식</b>을 이해하기 위한 <b>모의 체험</b>입니다. 실제 데이터를 학습한 인공지능 모델의 결과가 아닙니다.</div></div>`;
  const bars = el.querySelector('.predict-bars'), out = el.querySelector('.predict-out');
  el.querySelectorAll('.sample').forEach(s => s.addEventListener('click', () => {
    el.querySelectorAll('.sample').forEach(x => x.classList.remove('picked'));
    s.classList.add('picked');
    const scores = classify(s.dataset.key, keys);
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    bars.innerHTML = sorted.map(([k, v]) => `
      <div class="bar-wrap"><div class="bar-label"><span>${data[k].name}</span><span>${v}%</span></div>
      <div class="bar-track"><div class="bar-fill" data-w="${v}"></div></div></div>`).join('');
    requestAnimationFrame(() => bars.querySelectorAll('.bar-fill').forEach(f => f.style.width = f.dataset.w + '%'));
    const top = sorted[0];
    out.textContent = `🤖 ${lead} "${data[top[0]].name}"일 가능성이 가장 높아요 (${top[1]}%). — ${data[top[0]].feat}`;
  }));
}
function classify(pick, keys) {
  const s = {}; let rem = 100;
  const main = 70 + Math.floor(Math.random() * 15); s[pick] = main; rem -= main;
  const others = keys.filter(k => k !== pick);
  others.forEach((k, i) => {
    if (i === others.length - 1) s[k] = rem;
    else { const p = Math.floor(Math.random() * (rem - (others.length - 1 - i))); s[k] = p; rem -= p; }
  });
  return s;
}

/* ---------- 초기화 ---------- */
// 다른 사이트(이론 사이트 등)에서 index.html#a04 처럼 특정 차시로 바로 열 수 있게 한다.
function openFromHash() {
  const id = (location.hash || '').replace('#', '').trim();
  if (id && LESSONS.find(l => l.id === id)) { renderLesson(id); return true; }
  return false;
}
buildHome();
if (!openFromHash()) showHome();
window.addEventListener('hashchange', () => { if (!openFromHash()) showHome(); });
