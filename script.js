const venues = [
  '桐生',
  '戸田',
  '江戸川',
  '平和島',
  '多摩川',
  '浜名湖',
  '蒲郡',
  '常滑',
  '津',
  '三国',
  'びわこ',
  '住之江',
  '尼崎',
  '鳴門',
  '丸亀',
  '児島',
  '宮島',
  '徳山',
  '下関',
  '若松',
  '芦屋',
  '福岡',
  '唐津',
  '大村'
];

const raceEntryStore={
  source:'local',
  data:{},
  players:[],
  async init(){
    if(Object.keys(this.data).length) return;
    try{
      const [raceRes, playerRes]=await Promise.all([
        fetch('./data/races.json'),
        fetch('./data/players.json')
      ]);
      if(!raceRes.ok||!playerRes.ok) throw new Error('JSON load failed');
      this.data=await raceRes.json();
      this.players=await playerRes.json();
    }catch(error){
      setDataStatus('出走表取得失敗: ローカルデータへフォールバック');
      this.data={};
      this.players=[];
    }
  },
  async load(venue,raceNo){
    return officialDataService.getEntryList(venue,raceNo);
  },
  mergeEntry(entry){
    const player=this.players.find(p=>p.registrationNo===entry.registrationNo)||{};
    return {
      boat:entry.boat ?? 0,
      registrationNo:entry.registrationNo ?? player.registrationNo ?? 0,
      name:entry.name ?? player.name ?? '',
      branch:entry.branch ?? player.branch ?? '',
      className:entry.className ?? player.className ?? '',
      age:entry.age ?? player.age ?? 0,
      nationalWin:entry.nationalWin ?? player.nationalWin ?? 0,
      localWin:entry.localWin ?? player.localWin ?? 0,
      national2Win:entry.national2Win ?? player.national2Win ?? 0,
      local2Win:entry.local2Win ?? player.local2Win ?? 0,
      avgSt:entry.avgSt ?? player.avgSt ?? 0,
      motorRate:entry.motorRate ?? player.motorRate ?? 0,
      boatRate:entry.boatRate ?? player.boatRate ?? 0,
      exhibitionTime:entry.exhibitionTime ?? player.exhibitionTime ?? 0,
      weight:entry.weight ?? player.weight ?? 0,
      tilt:entry.tilt ?? player.tilt ?? 0,
      currentForm:entry.currentForm ?? player.currentForm ?? '',
      raceNo:entry.raceNo ?? 0
    };
  }
};
let state={venue:null,race:null,entries:[],bets:[],raceMeta:{},weatherSource:'local',resultSource:'local',raceScheduleSource:'local',officialPrediction:null,headCoach:null,pollingId:null,pollingKey:'',isSyncingResult:false,lastSettlement:null};
const $=id=>document.getElementById(id);
const BANKROLL_STORAGE_KEY='boat_ai_bankroll';
const RECOMMEND_DATE_STORAGE_KEY='boat_ai_recommend_date_target';
const VENUE_ID_MAP={
  '桐生':'kiryu','戸田':'toda','江戸川':'edogawa','平和島':'heiwajima','多摩川':'tamagawa','浜名湖':'hamanako','蒲郡':'gamagori',
  '常滑':'tokoname','津':'tsu','三国':'mikuni','びわこ':'biwako','住之江':'suminoe','尼崎':'amagasaki','鳴門':'naruto',
  '丸亀':'marugame','児島':'kojima','宮島':'miyajima','徳山':'tokuyama','下関':'shimonoseki','若松':'wakamatsu','芦屋':'ashiya',
  '福岡':'fukuoka','唐津':'karatsu','大村':'omura'
};
const VENUE_LABEL_TO_ID=VENUE_ID_MAP;
const ALL_VENUE_IDS=Array.from(new Set(Object.values(VENUE_ID_MAP)));

function setText(id,value){
  const el=$(id);
  if(el) el.textContent=value;
}

function setDataStatus(message){
  const el=$('dataStatus');
  if(!el) return;
  el.textContent=String(message || '');
}

function getVenueId(venueName){
  return VENUE_ID_MAP[venueName] || '';
}

function ensureAiConfidenceSlot(){
  const grid=document.querySelector('.ai-summary-grid');
  if(!grid) return;
  let slot=grid.querySelector('[data-role="ai-confidence"]');
  if(slot) return;
  slot=document.createElement('div');
  slot.className='ai-summary-item';
  slot.setAttribute('data-role','ai-confidence');
  slot.innerHTML='<span>信頼度</span><strong id="confidenceReason">-</strong>';
  grid.appendChild(slot);
}

function ensureRoughRaceSlot(){
  const grid=document.querySelector('.ai-summary-grid');
  if(!grid) return;
  let slot=grid.querySelector('[data-role="rough-race"]');
  if(slot) return;
  slot=document.createElement('div');
  slot.className='ai-summary-item';
  slot.setAttribute('data-role','rough-race');
  slot.innerHTML='<span>荒れ度</span><strong id="roughRaceReason">-</strong>';
  grid.appendChild(slot);
}

function ensureDecisionSlots(){
  const grid=document.querySelector('.ai-summary-grid');
  if(!grid) return;
  if(!grid.querySelector('[data-role="decision"]')){
    const slot=document.createElement('div');
    slot.className='ai-summary-item';
    slot.setAttribute('data-role','decision');
    slot.innerHTML='<span>判断</span><strong id="decisionReason">-</strong>';
    grid.appendChild(slot);
  }
  if(!grid.querySelector('[data-role="stake-level"]')){
    const slot=document.createElement('div');
    slot.className='ai-summary-item';
    slot.setAttribute('data-role','stake-level');
    slot.innerHTML='<span>資金レベル</span><strong id="stakeLevelReason">-</strong>';
    grid.appendChild(slot);
  }
}

function ensureBestAiSlot(){
  const commentBox=document.querySelector('.ai-comment-box');
  if(!commentBox) return null;
  let slot=commentBox.querySelector('[data-role="best-ai-recommendation"]');
  if(slot) return slot;
  slot=document.createElement('div');
  slot.setAttribute('data-role','best-ai-recommendation');
  slot.className='muted';
  slot.style.marginBottom='8px';
  slot.style.fontWeight='600';
  slot.innerHTML='<div id="bestAiNowText">現在の最強AI：-</div><div id="bestAiRoiText">直近ROI：-</div>';
  commentBox.insertBefore(slot, commentBox.firstChild);
  return slot;
}

function renderBestAiRecommendation(recommendation){
  ensureBestAiSlot();
  const nowText=$('bestAiNowText');
  const roiText=$('bestAiRoiText');
  const aiId=String(recommendation?.aiId || '-');
  const aiName=String(recommendation?.aiName || '-');
  const roi=Number(recommendation?.roi || 0);
  if(nowText) nowText.textContent=`現在の最強AI：${aiId} ${aiName}`;
  if(roiText) roiText.textContent=`直近ROI：${Math.round(roi)}%`;
}

function formatPercent(value, digits=1){
  return `${Number(value || 0).toFixed(digits)}%`;
}

function periodMetricHtml(label, stats){
  return `<div class="mini-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(formatPercent(stats?.roi ?? 0))}</strong><div class="muted">利益 ${Number(stats?.profit || 0).toLocaleString()}円 / 期待値 ${escapeHtml(formatPercent(stats?.expectedValue ?? 0))} / 的中率 ${escapeHtml(formatPercent(stats?.hitRate ?? 0))}</div></div>`;
}

function formatMoney(value){
  return `${Math.round(Number(value || 0)).toLocaleString('ja-JP')}円`;
}

function valueStarsByRank(valueRank){
  const rank=Math.max(1, Math.min(5, Number(valueRank) || 1));
  return `${'★'.repeat(6 - rank)}${'☆'.repeat(rank - 1)}`;
}

function formatValuePercent(value){
  return `${Math.round(Number(value || 0)).toLocaleString('ja-JP')}%`;
}

function filterBuyableValues(valueRanking){
  return Array.isArray(valueRanking) ? valueRanking.filter((row)=>Boolean(row?.evCalculable) && Number(row?.expectedValue || 0) >= 100) : [];
}

function valueDecisionLabel(item){
  if(!item || !item.evCalculable || Number(item?.odds || 0) <= 0) return '見送り(期待値計算不可)';
  const ev=Number(item?.expectedValue || 0);
  if(ev >= 120) return '買い候補';
  if(ev >= 100) return '注意';
  return '見送り';
}

function valueDecisionClass(item){
  const label=valueDecisionLabel(item);
  if(label.includes('買い')) return 'buy';
  if(label.includes('注意')) return 'watch';
  return 'skip';
}

function hasOfficialTrifectaOdds(valueRanking){
  if(!Array.isArray(valueRanking) || !valueRanking.length) return false;
  return valueRanking.some((row)=>Boolean(row?.evCalculable) && Number(row?.odds || 0) > 0);
}

function renderValueRankHtml(valueRows, emptyMessage='価値100%以上の買い目はありません'){
  const rows=Array.isArray(valueRows) ? valueRows.slice(0, 3) : [];
  if(!rows.length){
    return `<div class="no-race-box">${escapeHtml(emptyMessage)}</div>`;
  }

  return `<div class="value-ranking-grid">${rows.map((row)=>{
    const combo=String(row?.combo || '-');
    const rank=Number(row?.valueRank || 0) || 0;
    const stars=valueStarsByRank(rank || 1);
    return `<article class="value-ranking-card"><div class="value-ranking-head"><span class="value-stars">${stars}</span><span class="value-label">価値No${rank || '-'}</span></div><div class="value-ranking-combo">${escapeHtml(combo)}</div><div class="value-ranking-meta"><span>期待値 ${escapeHtml(formatValuePercent(row?.expectedValue || 0))}</span><span>勝率 ${escapeHtml(Number(row?.probability || 0).toFixed(1))}%</span><span>オッズ ${escapeHtml(Number(row?.odds || 0).toFixed(1))}倍</span></div></article>`;
  }).join('')}</div>`;
}

function renderValueSummaryPills(valueRows){
  const rows=Array.isArray(valueRows) ? valueRows.slice(0, 3) : [];
  if(!rows.length) return '';
  return rows.map((row, index)=>`<div class="ticket-big"><b>${escapeHtml(index === 0 ? '◎ 本線' : index === 1 ? '○ 押さえ' : '▲ 穴')}</b><strong>${escapeHtml(row?.combo || '-')}</strong></div>`).join('');
}

function loadBankroll(){
  const saved=Number(localStorage.getItem(BANKROLL_STORAGE_KEY));
  if(Number.isFinite(saved) && saved >= 0){
    return Math.round(saved);
  }
  return 100000;
}

function saveBankroll(value){
  const bankroll=Math.max(0, Math.round(Number(value) || 0));
  state.bankroll=bankroll;
  localStorage.setItem(BANKROLL_STORAGE_KEY, String(bankroll));
  const input=$('bankrollInput');
  if(input) input.value=String(bankroll);
  return bankroll;
}

function syncBankrollInput(){
  const input=$('bankrollInput');
  if(input) input.value=String(state.bankroll ?? 100000);
}

function loadRecommendDateTarget(){
  const value=String(localStorage.getItem(RECOMMEND_DATE_STORAGE_KEY) || 'today');
  return value === 'tomorrow' ? 'tomorrow' : 'today';
}

function saveRecommendDateTarget(target){
  const value=target === 'tomorrow' ? 'tomorrow' : 'today';
  state.recommendDateTarget=value;
  localStorage.setItem(RECOMMEND_DATE_STORAGE_KEY, value);
  const todayBtn=$('recommendTodayBtn');
  const tomorrowBtn=$('recommendTomorrowBtn');
  if(todayBtn) todayBtn.classList.toggle('active', value === 'today');
  if(tomorrowBtn) tomorrowBtn.classList.toggle('active', value === 'tomorrow');
}

async function renderMoneyPlan(row){
  const block=$('moneyPlanBlock');
  if(!block) return;
  if(!row?.venueId || !row?.raceNo || !state.bankroll){
    block.innerHTML='<div class="money-plan-head"><span>推奨購入金額</span><span>0円</span></div><div class="money-plan-stake">0円</div><div class="money-plan-reason">見送りのため資金配分なし</div>';
    return;
  }

  block.innerHTML='<div class="money-plan-head"><span>推奨購入金額</span><span>計算中</span></div><div class="money-plan-stake">計算中...</div>';

  try{
    const response=await fetch('/api/money/calculate', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        bankroll:state.bankroll,
        venueId:row.venueId,
        raceNo:String(row.raceNo)
      })
    });
    if(!response.ok) throw new Error('money fetch failed');
    const payload=await response.json();
    if(!payload?.success) throw new Error(payload?.error || 'money calc failed');

    block.innerHTML=`<div class="money-plan-head"><span>推奨購入金額</span><span>${escapeHtml(`${Number(payload.bankrollRate || 0).toFixed(1)}%`)}</span></div><div class="money-plan-stake">${escapeHtml(formatMoney(payload.recommendedStake || 0))}</div><div class="money-plan-breakdown"><div class="money-plan-piece"><span>本線</span><strong>${escapeHtml(formatMoney(payload.mainStake || 0))}</strong></div><div class="money-plan-piece"><span>押さえ</span><strong>${escapeHtml(formatMoney(payload.reserveStake || 0))}</strong></div><div class="money-plan-piece"><span>穴</span><strong>${escapeHtml(formatMoney(payload.holeStake || 0))}</strong></div></div><div class="money-plan-reason">${escapeHtml(payload.reason || '期待値と信頼度をもとに判断')}</div>`;
  }catch(error){
    block.innerHTML='<div class="money-plan-head"><span>推奨購入金額</span><span>0円</span></div><div class="money-plan-stake">0円</div><div class="money-plan-reason">金額計算に失敗しました</div>';
  }
}

async function renderAnalysisMoneyPlan(){
  const amountEl=$('analysisMoneyPlan');
  if(!amountEl) return;
  if(!state.venue || !state.race || !state.bankroll){
    amountEl.textContent='-';
    return;
  }

  const venueId=getVenueId(state.venue);
  if(!venueId){
    amountEl.textContent='-';
    return;
  }

  try{
    const response=await fetch('/api/money/calculate', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        bankroll:state.bankroll,
        venueId,
        raceNo:String(state.race)
      })
    });
    if(!response.ok) throw new Error('analysis money fetch failed');
    const payload=await response.json();
    if(!payload?.success) throw new Error('analysis money calc failed');
    amountEl.textContent=formatMoney(payload.recommendedStake || 0);
  }catch(error){
    amountEl.textContent='-';
  }
}

function normalizeTicket(value){
  return String(value || '')
    .trim()
    .replace(/[\s・／]+/g,'-')
    .replace(/-+/g,'-')
    .replace(/^-|-$/g,'');
}

function renderOddsListHtml(rows){
  const list=Array.isArray(rows) ? rows.filter((row)=>row?.odds).slice(0,12) : [];
  if(!list.length) return '<div class="muted">データなし</div>';
  return `<div class="table-wrap small"><table><thead><tr><th>買い目</th><th>オッズ</th></tr></thead><tbody>${list.map((row,index)=>`<tr><td>${escapeHtml(normalizeTicket(row.ticket) || `No.${index+1}`)}</td><td>${escapeHtml(String(row.odds))}</td></tr>`).join('')}</tbody></table></div>`;
}

function renderOddsSummary(oddsPayload){
  const odds=oddsPayload?.odds || {};
  const trifecta=Array.isArray(odds?.trifecta) ? odds.trifecta : [];
  const exacta=Array.isArray(odds?.exacta) ? odds.exacta : [];
  const quinellaPlace=Array.isArray(odds?.quinellaPlace) ? odds.quinellaPlace : [];
  const trifectaEl=$('oddsTrifecta');
  const exactaEl=$('oddsExacta');
  const quinellaEl=$('oddsQuinellaPlace');
  if(trifectaEl) trifectaEl.innerHTML=renderOddsListHtml(trifecta);
  if(exactaEl) exactaEl.innerHTML=renderOddsListHtml(exacta);
  if(quinellaEl) quinellaEl.innerHTML=renderOddsListHtml(quinellaPlace);
}

function applyOfficialOddsToBets(oddsPayload){
  const trifecta=Array.isArray(oddsPayload?.odds?.trifecta) ? oddsPayload.odds.trifecta : [];
  if(!trifecta.length || !Array.isArray(state.bets) || !state.bets.length) return;

  const oddsMap=new Map(
    trifecta
      .filter((row)=>row?.ticket && row?.odds)
      .map((row)=>[normalizeTicket(row.ticket), Number(row.odds)])
      .filter(([,odds])=>Number.isFinite(odds) && odds > 0)
  );

  if(!oddsMap.size) return;
  state.bets.forEach((bet)=>{
    const marketOdds=oddsMap.get(normalizeTicket(bet.mark));
    if(Number.isFinite(marketOdds) && marketOdds > 0){
      bet.odds=marketOdds;
      bet.ev=bet.p*marketOdds*100;
    }
  });
  state.bets.sort((a,b)=>b.ev-a.ev);
}

function ensureAiAnalysisPanel(){
  const hero=document.querySelector('.ai-hero');
  if(!hero) return null;
  let panel=hero.querySelector('[data-role="ai-analysis"]');
  if(panel) return panel;
  panel=document.createElement('div');
  panel.setAttribute('data-role','ai-analysis');
  panel.style.marginTop='10px';
  panel.style.padding='10px 12px';
  panel.style.border='1px solid #dbeafe';
  panel.style.borderRadius='10px';
  panel.style.background='white';
  hero.insertBefore(panel, $('toggleAiDetailBtn'));
  return panel;
}

function ensureConferencePanel(){
  const analysisSection=$('analysisSection');
  if(!analysisSection) return null;
  let panel=analysisSection.querySelector('[data-role="ver10-conference-panel"]');
  if(panel) return panel;
  panel=document.createElement('div');
  panel.className='result-card full';
  panel.setAttribute('data-role','ver10-conference-panel');
  panel.innerHTML='<h3 style="margin:0 0 10px;">AI会議</h3><div id="ver10ConferenceBody" class="muted">読み込み中...</div>';
  const resultSummary=$('resultSummaryBox');
  if(resultSummary && resultSummary.parentNode===analysisSection){
    analysisSection.insertBefore(panel, resultSummary);
  }else{
    analysisSection.appendChild(panel);
  }
  return panel;
}

function conferenceDecisionClass(decision){
  const text=String(decision || '');
  if(text.includes('買い')) return 'decision-buy';
  if(text.includes('少額')) return 'decision-watch';
  return 'decision-skip';
}

function renderConferenceFallback(message){
  ensureConferencePanel();
  const body=$('ver10ConferenceBody');
  if(!body) return;
  body.innerHTML=`<div class="no-race-box">${escapeHtml(message || 'AI会議データを取得できませんでした')}</div>`;
}

async function renderConferencePanel(){
  ensureConferencePanel();
  const body=$('ver10ConferenceBody');
  if(!body) return;
  if(!state.venue || !state.race){
    renderConferenceFallback('レース選択後にAI会議を表示します');
    return;
  }

  const venueId=getVenueId(state.venue);
  if(!venueId){
    renderConferenceFallback('会場IDを判定できません');
    return;
  }

  body.textContent='AI会議を集計中...';

  try{
    const response=await fetch(apiPath(`/api/ver10/conference?venueId=${encodeURIComponent(venueId)}&raceNo=${encodeURIComponent(state.race)}`));
    const payload=await response.json();
    const conference=payload?.conference;
    const aiDecisions=Array.isArray(conference?.aiDecisions)?conference.aiDecisions:[];
    const roleRanking=Array.isArray(conference?.roleRanking)?conference.roleRanking:[];
    const roleMap=new Map(roleRanking.map((row)=>[String(row?.roleId||''), row]));
    const verdict=conference?.verdict || {};
    if(!response.ok || !conference || !aiDecisions.length){
      throw new Error(payload?.error || 'conference fetch failed');
    }

    const starsHtml=aiDecisions.map((row)=>{
      const rankRow=roleMap.get(String(row?.roleId || '')) || {};
      return `<article class="conference-ai-card"><div class="conference-ai-head"><strong>${escapeHtml(row?.roleName || '-')}</strong><span class="muted">重み ${Number(rankRow?.weight || 1).toFixed(2)} / Ver9順位 ${Number(rankRow?.rank || 0)}</span></div><div class="conference-stars">${escapeHtml(row?.stars || '-')}</div><div class="conference-kv-grid"><div><span>本命</span><b>${escapeHtml(String(row?.anchors?.honmei || '-'))}号艇</b></div><div><span>対抗</span><b>${escapeHtml(String(row?.anchors?.taiko || '-'))}号艇</b></div><div><span>穴</span><b>${escapeHtml(String(row?.anchors?.ana || '-'))}号艇</b></div><div><span>期待値</span><b>${Number(row?.expectedValue || 0).toFixed(1)}%</b></div><div><span>購入可否</span><b>${escapeHtml(row?.buyable ? '買い' : '見送り')}</b></div></div><p class="muted" style="margin:8px 0 0;">${escapeHtml(row?.reason || '-')}</p></article>`;
    }).join('');

    body.innerHTML=`<div class="conference-grid">${starsHtml}</div><div class="conference-final"><h4 style="margin:0 0 8px;">最終結論</h4><div class="conference-final-grid"><div><span>判断</span><strong class="decision-chip ${conferenceDecisionClass(verdict?.finalDecision)}">${escapeHtml(verdict?.finalDecision || '見送り')}</strong></div><div><span>期待値</span><strong>${Number(verdict?.expectedValue || 0).toFixed(1)}%</strong></div><div><span>購入金額</span><strong>${formatMoney(verdict?.purchaseAmount || 0)}</strong></div><div><span>信頼度</span><strong>${escapeHtml(verdict?.confidenceStars || '-')}</strong></div></div><div class="conference-reason">${escapeHtml(verdict?.reason || '-')}</div></div>`;
  }catch(error){
    renderConferenceFallback('AI会議データを取得できませんでした');
  }
}

function ensureLeaguePanel(){
  const analysisSection=$('analysisSection');
  if(!analysisSection) return null;
  let panel=analysisSection.querySelector('[data-role="league-panel"]');
  if(panel) return panel;
  panel=document.createElement('div');
  panel.className='result-card full';
  panel.setAttribute('data-role','league-panel');
  panel.innerHTML='<details><summary><strong>AIリーグ</strong></summary><div id="leagueLeaderSummary" class="muted" style="margin-top:8px;">読み込み中</div><div class="table-wrap small"><table id="leagueTable"><thead><tr><th>順位</th><th>AI名</th><th>回収率</th><th>利益</th><th>的中率</th><th>ひとこと</th></tr></thead><tbody></tbody></table></div></details>';
  const statsCard=$('stats')?.closest('.result-card');
  if(statsCard && statsCard.parentNode===analysisSection){
    analysisSection.insertBefore(panel, statsCard);
  }else{
    analysisSection.appendChild(panel);
  }
  return panel;
}

function ensureRecommendPanel(){
  const venuePanel=$('venuePanel');
  if(!venuePanel) return null;
  let panel=venuePanel.querySelector('[data-role="today-recommend"]');
  if(panel) return panel;
  panel=document.createElement('div');
  panel.className='summary-box';
  panel.setAttribute('data-role','today-recommend');
  panel.innerHTML='<div class="section-head compact"><h3 id="recommendTitleLabel">本日のAI結論カード</h3><div class="recommend-date-switch"><button id="recommendTodayBtn" class="ghost-btn active">今日</button><button id="recommendTomorrowBtn" class="ghost-btn">明日</button></div><span id="recommendModeLabel" class="muted">開催中の場から抽出</span></div><div id="todayConclusionCard" class="today-conclusion-card">読み込み中...</div><div id="todayRecommendationList" class="today-recommend-list"></div>';
  const venueGrid=$('venueGrid');
  const venueCard=venueGrid?.closest('.result-card');
  if(venueCard && venueCard.parentNode===venuePanel){
    venuePanel.insertBefore(panel, venueCard);
  }else if(venueGrid && venueGrid.parentNode===venuePanel){
    venuePanel.insertBefore(panel, venueGrid);
  }else{
    venuePanel.appendChild(panel);
  }
  return panel;
}

async function renderDashboardStats(bestAiRecommendation){
  const statsBlock=$('dashboardStats') || $('stats');
  const accuracyBlock=$('dashboardAccuracy');
  let dbSummaryBlock=$('dashboardDatabaseSummary');
  if(!dbSummaryBlock && statsBlock && statsBlock.parentNode){
    dbSummaryBlock=document.createElement('div');
    dbSummaryBlock.id='dashboardDatabaseSummary';
    dbSummaryBlock.className='dashboard-stats';
    statsBlock.parentNode.appendChild(dbSummaryBlock);
  }
  try{
    const [statsRes, modelRes, dbRes] = await Promise.all([
      fetch('/api/stats'),
      fetch('/api/model/status'),
      fetch('/api/ver12/database/status')
    ]);
    if(!statsRes.ok || !modelRes.ok) throw new Error('dashboard stats fetch failed');
    const stats=await statsRes.json();
    const modelPayload=await modelRes.json();
    const model=modelPayload?.status || {};
    const dbPayload=dbRes.ok ? await dbRes.json() : null;

    if(statsBlock){
      statsBlock.innerHTML=`
        <div class="stat">今日ROI<b>${formatPercent(stats.todayROI ?? 0)}</b></div>
        <div class="stat">今月ROI<b>${formatPercent(stats.monthROI ?? 0)}</b></div>
        <div class="stat">全期間ROI<b>${formatPercent(stats.periods?.all?.roi ?? 0)}</b></div>
        <div class="stat">総収支<b>${Number(stats.profit || 0).toLocaleString()}円</b></div>`;
    }

    if(accuracyBlock){
      accuracyBlock.innerHTML=[
        periodMetricHtml('今日', stats.periods?.today),
        periodMetricHtml('今月', stats.periods?.month),
        periodMetricHtml('全期間', stats.periods?.all)
      ].join('') + `<div class="accuracy-card"><span class="muted">モデル状態</span><strong style="display:block;margin-top:4px;">${escapeHtml(model.available ? '学習済み' : '未学習')}</strong><div class="muted">精度 ${escapeHtml(formatPercent(model.trainingAccuracy ?? 0))} / サンプル ${Number(model.sampleCount || 0).toLocaleString()} / 最強AI ${escapeHtml(bestAiRecommendation?.aiName || '-')}${bestAiRecommendation?.roi != null ? ` / ROI ${formatPercent(bestAiRecommendation?.roi || 0)}` : ''}</div></div>`;
    }

    if(dbSummaryBlock){
      const summary=dbPayload?.success ? dbPayload : null;
      dbSummaryBlock.innerHTML=summary
        ? `<div class="stat">保存レース<b>${Number(summary.totalRaces || 0).toLocaleString()}</b></div><div class="stat">会場数<b>${Number(summary.venues || 0).toLocaleString()}</b></div><div class="stat">最新取込日<b>${escapeHtml(summary.latestDate || '-')}</b></div><div class="stat">学習対象<b>${Number(summary.learningRaceCount || 0).toLocaleString()}</b></div><div class="stat">統計信頼度<b>${Number(summary.statsConfidence || 0).toFixed(1)}%</b></div>`
        : '<div class="stat">保存レース<b>-</b></div><div class="stat">会場数<b>-</b></div><div class="stat">最新取込日<b>-</b></div><div class="stat">学習対象<b>-</b></div><div class="stat">統計信頼度<b>-</b></div>';
    }
  }catch(error){
    if(statsBlock){
      statsBlock.innerHTML='<div class="stat">今日ROI<b>-</b></div><div class="stat">今月ROI<b>-</b></div><div class="stat">全期間ROI<b>-</b></div><div class="stat">総収支<b>-</b></div>';
    }
    if(accuracyBlock){
      accuracyBlock.innerHTML='<div class="accuracy-card">精度データを取得できませんでした</div>';
    }
    if(dbSummaryBlock){
      dbSummaryBlock.innerHTML='<div class="stat">保存レース<b>-</b></div><div class="stat">会場数<b>-</b></div><div class="stat">最新取込日<b>-</b></div><div class="stat">学習対象<b>-</b></div><div class="stat">統計信頼度<b>-</b></div>';
    }
  }
}

function decisionClassName(decision){
  const value=String(decision || '');
  if(value.includes('買い')) return 'decision-buy';
  if(value.includes('少額') || value.includes('注意')) return 'decision-watch';
  return 'decision-skip';
}

function isTradableDecision(decision){
  const value=String(decision || '');
  return value.includes('買い') || value.includes('少額') || value.includes('注意');
}

function expectedValueClass(expectedValue){
  const ev=Number(expectedValue || 0);
  if(ev >= 130) return 'ev-130';
  if(ev >= 110) return 'ev-110';
  if(ev >= 100) return 'ev-100';
  return 'ev-under';
}

function shortenReasonList(reasonText, row){
  const source=String(reasonText || '');
  const tokens=[];
  const push=(label)=>{
    if(label && !tokens.includes(label)) tokens.push(label);
  };

  if(/一致/.test(source)) push('AI一致');
  if(/期待値/.test(source)) push('期待値良好');
  if(/荒れ/.test(source)) push('荒れ度適正');
  if(/信頼/.test(source)) push('本命信頼');
  if(/買い判断|少額判断|判断/.test(source)) push('判断妥当');
  if(/優先/.test(source)) push('AI優先');

  if(Number(row?.expectedValue || 0) >= 120) push('期待値良好');
  if(String(row?.decision || '').includes('買い')) push('買い判断');
  if(String(row?.roughLevel || '').includes('本命')) push('本命信頼');

  return tokens.slice(0, 4).length ? tokens.slice(0, 4) : ['総合評価'];
}

function recommendApiUrl(){
  const target=state.recommendDateTarget === 'tomorrow' ? 'tomorrow' : 'today';
  const isViteDev = typeof window !== 'undefined'
    && String(window.location?.hostname || '') === 'localhost'
    && String(window.location?.port || '') !== '3001';
  const path=target === 'tomorrow' ? '/api/recommend/tomorrow' : '/api/recommend/today';
  return isViteDev
    ? `http://localhost:3001${path}`
    : path;
}

function apiPath(path){
  const isViteDev = typeof window !== 'undefined'
    && String(window.location?.hostname || '') === 'localhost'
    && String(window.location?.port || '') !== '3001';
  return isViteDev ? `http://localhost:3001${path}` : path;
}

async function renderRecommendPanel(){
  const panel=ensureRecommendPanel();
  if(!panel) return;
  try{
    const titleLabel=$('recommendTitleLabel');
    if(titleLabel){
      titleLabel.textContent=state.recommendDateTarget === 'tomorrow' ? '明日のAI結論カード' : '本日のAI結論カード';
    }
    const response=await fetch(recommendApiUrl());
    const payload=await response.json();
    const recommendationRows=Array.isArray(payload?.recommendations)?payload.recommendations:[];
    const fallbackRows=Array.isArray(payload?.fallbackRecommendations)?payload.fallbackRecommendations:[];
    const rows=recommendationRows.length>0 ? recommendationRows : fallbackRows;
    const statusMessage=String(payload?.statusMessage || '');
    const mode=String(payload?.mode || '');
    if(!response.ok && recommendationRows.length===0 && fallbackRows.length===0){
      throw new Error('recommend fetch failed');
    }
    const modeLabel=$('recommendModeLabel');
    const card=$('todayConclusionCard');
    const list=$('todayRecommendationList');
    if(modeLabel){
      if(statusMessage){
        modeLabel.textContent=statusMessage;
      }else if(mode === 'unpublished'){
        modeLabel.textContent='明日の出走表はまだ公開されていません';
      }else if(mode === 'reference' || mode === 'small'){
        modeLabel.textContent='積極的に買うレースはありません';
      }else if(mode === 'no-race'){
        modeLabel.textContent='今日は勝負レースなし';
      }else{
        modeLabel.textContent='開催中の場から抽出';
      }
    }

    if(!rows.length){
      if(card){
        const noRaceText=(mode === 'unpublished')
          ? '明日の出走表はまだ公開されていません'
          : (mode === 'no-race')
          ? '今日は勝負レースなし'
          : '積極的に買うレースはありません';
        card.innerHTML=`<div class="no-race-box">${escapeHtml(noRaceText)}<br>無理に買わない方がよい日です</div>`;
      }
      if(list){
        const noRaceText=(mode === 'unpublished')
          ? '明日の出走表はまだ公開されていません'
          : (mode === 'no-race')
          ? '今日は勝負レースなし'
          : '積極的に買うレースはありません';
        list.innerHTML=`<div class="no-race-box">${escapeHtml(noRaceText)}</div>`;
      }
      return;
    }

    const topRow=rows[0] || null;
    const valueRows=filterBuyableValues(topRow?.valueRanking);
    const reasons=shortenReasonList(topRow?.reason, topRow);
    const evClass=expectedValueClass(valueRows[0]?.expectedValue || topRow?.expectedValue);
    if(card && topRow){
      const valuePlanHtml=renderValueRankHtml(valueRows);
      const valueBuysHtml=renderValueSummaryPills(valueRows);
      card.innerHTML=`<div class="today-conclusion-head"><div class="today-fire">🔥 今日買う価値がある舟券</div><span class="decision-chip ${decisionClassName(topRow.decision)}">${escapeHtml(topRow.decision||'見送り')}</span></div><div class="today-race-main">No.${Number(topRow.rank||1)} ${escapeHtml(topRow.venueName||topRow.venueId||'-')} ${escapeHtml(`${topRow.raceNo || '-'}R`)}</div><div class="today-main-grid"><div class="today-main-item"><span>判断</span><strong>${escapeHtml(topRow.decision || '見送り')}</strong></div><div class="today-main-item"><span>価値No1</span><strong><span class="ev-chip ${evClass}">${Number(valueRows[0]?.expectedValue || 0).toFixed(1)}%</span></strong></div></div>${valuePlanHtml}<div class="ticket-big-list">${valueBuysHtml || ''}</div><div id="moneyPlanBlock" class="money-plan-card"><div class="money-plan-head"><span>推奨購入金額</span><span>計算中</span></div><div class="money-plan-stake">計算中...</div></div><div class="reason-pills">${reasons.map((item)=>`<span class="reason-pill">${escapeHtml(item)}</span>`).join('')}</div>`;
      renderMoneyPlan(topRow);
    }

    if(list){
      list.innerHTML=rows.map((row)=>{
        const topValue=row?.valueRanking?.find((item)=>Number(item?.expectedValue || 0) >= 100) || row?.valueRanking?.[0] || null;
        return `<article class="recommend-mini"><div><div class="recommend-mini-main">${escapeHtml(row.venueName||row.venueId||'-')} ${escapeHtml(`${row.raceNo}R`)}</div><div class="recommend-mini-sub">${escapeHtml(topValue?.combo || row.topPick || '-')} / 期待値${escapeHtml(Number(topValue?.expectedValue || row.expectedValue || 0).toFixed(1))}%</div></div><div><span class="decision-chip ${decisionClassName(row.decision)}">${escapeHtml(row.decision || '-')}</span> <span class="ev-chip ${expectedValueClass(topValue?.expectedValue || row.expectedValue)}">${Number(topValue?.expectedValue || row.expectedValue || 0).toFixed(1)}%</span></div></article>`;
      }).join('') || '<div class="no-race-box">積極的に買うレースはありません</div>';
    }
  }catch(error){
    const modeLabel=$('recommendModeLabel');
    const card=$('todayConclusionCard');
    const list=$('todayRecommendationList');
    if(modeLabel) modeLabel.textContent='取得に失敗しました';
    if(card) card.innerHTML='<div class="no-race-box">勝負レースを取得できませんでした</div>';
    if(list) list.innerHTML='';
  }
}

function ensureWeightsPanel(){
  const analysisSection=$('analysisSection');
  if(!analysisSection) return null;
  let panel=analysisSection.querySelector('[data-role="weights-panel"]');
  if(panel) return panel;
  panel=document.createElement('div');
  panel.className='result-card full';
  panel.setAttribute('data-role','weights-panel');
  panel.innerHTML='<details><summary><strong>AI重みダッシュボード</strong></summary><div class="table-wrap small"><table id="weightsTable"><thead><tr><th>AI</th><th>現在の重み</th><th>変更量</th><th>直近20R ROI</th></tr></thead><tbody></tbody></table></div></details>';
  const leaguePanel=analysisSection.querySelector('[data-role="league-panel"]');
  if(leaguePanel){
    analysisSection.insertBefore(panel, leaguePanel.nextSibling);
  }else{
    analysisSection.appendChild(panel);
  }
  return panel;
}

function ensureOptimizerPanel(){
  const analysisSection=$('analysisSection');
  if(!analysisSection) return null;
  let panel=analysisSection.querySelector('[data-role="optimizer-panel"]');
  if(panel) return panel;
  panel=document.createElement('div');
  panel.className='result-card full';
  panel.setAttribute('data-role','optimizer-panel');
  panel.innerHTML='<details><summary><strong>AI改善履歴</strong></summary><div style="margin:8px 0;"><button id="runOptimizerBtn" class="ghost-btn">最適化を実行</button><span id="optimizerRunSummary" class="muted" style="margin-left:10px;">-</span></div><div class="table-wrap small"><table id="optimizerHistoryTable"><thead><tr><th>学習日時</th><th>AI名</th><th>ROI変化</th><th>利益変化</th><th>変更した重み</th></tr></thead><tbody><tr><td colspan="5">読み込み中</td></tr></tbody></table></div></details>';
  const weightsPanel=analysisSection.querySelector('[data-role="weights-panel"]');
  if(weightsPanel && weightsPanel.parentNode===analysisSection){
    analysisSection.insertBefore(panel, weightsPanel.nextSibling);
  }else{
    analysisSection.appendChild(panel);
  }
  return panel;
}

function ensureImportLogPanel(){
  const analysisSection=$('analysisSection');
  if(!analysisSection) return null;
  let panel=analysisSection.querySelector('[data-role="import-log-panel"]');
  if(panel) return panel;
  panel=document.createElement('div');
  panel.className='result-card full';
  panel.setAttribute('data-role','import-log-panel');
  panel.innerHTML='<details><summary><strong>取込ログ</strong></summary><div class="table-wrap small"><table id="importLogTable"><thead><tr><th>取込日時</th><th>成功件数</th><th>失敗件数</th><th>主な失敗理由</th></tr></thead><tbody><tr><td colspan="4">読み込み中</td></tr></tbody></table></div></details>';
  const optimizerPanel=analysisSection.querySelector('[data-role="optimizer-panel"]');
  if(optimizerPanel){
    analysisSection.insertBefore(panel, optimizerPanel.nextSibling);
  }else{
    analysisSection.appendChild(panel);
  }
  return panel;
}

function ensureVer12ImportPanel(){
  const analysisSection=$('analysisSection');
  if(!analysisSection) return null;
  let panel=analysisSection.querySelector('[data-role="ver12-import-panel"]');
  if(panel) return panel;
  panel=document.createElement('div');
  panel.className='result-card full';
  panel.setAttribute('data-role','ver12-import-panel');
  panel.innerHTML='<details open><summary><strong>過去データ取込 (Ver12)</strong></summary><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin:8px 0;align-items:end;"><label>開始日<input id="ver12DateFrom" type="text" placeholder="YYYYMMDD" style="width:100%;"></label><label>終了日<input id="ver12DateTo" type="text" placeholder="YYYYMMDD" style="width:100%;"></label><label>会場(カンマ区切り)<input id="ver12VenueIds" type="text" placeholder="toda,hamanako" style="width:100%;"></label><label>日数上限<input id="ver12DayMaxLimit" type="number" min="1" max="365" value="120" style="width:100%;"></label><label><input id="ver12Resume" type="checkbox" checked> 再開モード</label><label><input id="ver12ContinueOnFailure" type="checkbox" checked> 失敗継続</label><div style="display:flex;gap:8px;"><button id="ver12ImportStartBtn" class="ghost-btn">取込開始</button><button id="ver12ImportStopBtn" class="ghost-btn">停止</button></div></div><div id="ver12ImportSummary" class="muted">待機中</div><div class="table-wrap small" style="margin-top:8px;"><table><thead><tr><th>項目</th><th>値</th></tr></thead><tbody id="ver12ImportStatusTable"><tr><td colspan="2">読み込み中</td></tr></tbody></table></div></details>';
  const backtestPanel=analysisSection.querySelector('[data-role="backtest-panel"]');
  if(backtestPanel){
    analysisSection.insertBefore(panel, backtestPanel.nextSibling);
  }else{
    analysisSection.appendChild(panel);
  }
  return panel;
}

function ensureBacktestPanel(){
  const analysisSection=$('analysisSection');
  if(!analysisSection) return null;
  let panel=analysisSection.querySelector('[data-role="backtest-panel"]');
  if(panel) return panel;
  panel=document.createElement('div');
  panel.className='result-card full';
  panel.setAttribute('data-role','backtest-panel');
  panel.innerHTML='<details><summary><strong>バックテスト</strong></summary><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin:8px 0;align-items:end;"><label>開始日<input id="backtestDateFrom" type="text" placeholder="YYYYMMDD" style="width:100%;"></label><label>終了日<input id="backtestDateTo" type="text" placeholder="YYYYMMDD" style="width:100%;"></label><label>対象場<input id="backtestVenueIds" type="text" placeholder="kiryu,hamanako" style="width:100%;"></label><label>AI<select id="backtestAiId" style="width:100%;"><option value="">全AI</option><option value="AI-01">AI-01</option><option value="AI-02">AI-02</option><option value="AI-03">AI-03</option><option value="AI-04">AI-04</option><option value="AI-05">AI-05</option></select></label><div><button id="runBacktestBtn" class="ghost-btn">バックテストを実行</button><div id="backtestRunSummary" class="muted" style="margin-top:6px;">-</div></div></div><div class="table-wrap small"><table id="backtestHistoryTable"><thead><tr><th>実行日時</th><th>AI名</th><th>対象期間</th><th>対象場</th><th>ROI</th><th>利益</th><th>的中率</th><th>対象レース数</th></tr></thead><tbody><tr><td colspan="8">読み込み中</td></tr></tbody></table></div></details>';
  const importLogPanel=analysisSection.querySelector('[data-role="import-log-panel"]');
  if(importLogPanel){
    analysisSection.insertBefore(panel, importLogPanel.nextSibling);
  }else{
    analysisSection.appendChild(panel);
  }
  return panel;
}

async function renderLeaguePanel(){
  return;
}

function summarizeWeights(row){
  return `枠${Number(row.laneWeight||0).toFixed(1)} / 展示${Number(row.exhibitionWeight||0).toFixed(1)} / ST${Number(row.stWeight||0).toFixed(1)} / モーター${Number(row.motorWeight||0).toFixed(1)}`;
}

function summarizeDelta(delta){
  const parts=Object.entries(delta||{}).filter(([,value])=>Number(value)!==0).slice(0,3).map(([key,value])=>`${key.replace('Weight','')}${Number(value)>0?'+':''}${Number(value).toFixed(1)}`);
  return parts.join(' / ') || '-';
}

async function renderWeightsPanel(){
  return;
}

function summarizeOptimizerDelta(before, after){
  const keys=['laneWeight','exhibitionWeight','stWeight','nationalWeight','localWeight','motorWeight','boatWeight','weatherWeight','oddsWeight'];
  const parts=keys
    .map((key)=>{
      const prev=Number(before?.[key]||0);
      const next=Number(after?.[key]||0);
      const diff=Math.round((next-prev)*100)/100;
      if(diff===0) return '';
      return `${key.replace('Weight','')}${diff>0?'+':''}${diff.toFixed(2)}`;
    })
    .filter(Boolean)
    .slice(0,4);
  return parts.join(' / ') || '-';
}

async function runOptimizerFromUi(){
  const summary=$('optimizerRunSummary');
  if(summary) summary.textContent='実行中...';
  try{
    const response=await fetch('/api/optimizer/run',{method:'POST'});
    if(!response.ok) throw new Error('optimizer run failed');
    const payload=await response.json();
    if(summary){
      summary.textContent=`改善AI ${Number(payload?.improvedAI||0)}/${Number(payload?.updatedAI||0)} / ROI ${Number(payload?.averageRoiBefore||0).toFixed(1)}%→${Number(payload?.averageRoiAfter||0).toFixed(1)}%`;
    }
    await renderLeaguePanel();
    await renderWeightsPanel();
    await renderOptimizerPanel();
    await renderImportLogPanel();
  }catch(error){
    if(summary) summary.textContent='最適化に失敗しました';
  }
}

async function renderOptimizerPanel(){
  return;
}

function normalizeVer12VenueIds(input){
  const text=String(input || '').trim();
  if(!text) return [];
  return text
    .split(',')
    .map((value)=>String(value || '').trim())
    .filter(Boolean)
    .map((value)=>VENUE_LABEL_TO_ID[value] || value);
}

function defaultVer12DateRange(){
  const to=new Date();
  const from=new Date(to.getTime());
  from.setDate(from.getDate()-6);
  const fmt=(d)=>`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return { dateFrom: fmt(from), dateTo: fmt(to) };
}

async function refreshVer12ImportStatus(){
  const table=$('ver12ImportStatusTable');
  const summary=$('ver12ImportSummary');
  if(!table) return;
  try{
    const response=await fetch(apiPath('/api/ver12/import/status'));
    const payload=await response.json();
    if(!response.ok || !payload?.success) throw new Error(payload?.error || 'status failed');
    const status=payload.status || {};
    const progress=status.progress || {};
    const running=Boolean(status.running);
    const percent=Number(progress.percent || 0).toFixed(1);
    const text=running
      ? `取込中: ${percent}% (${Number(progress.processedPairs||0)}/${Number(progress.totalPairs||0)} 組)`
      : (status.stopRequested ? '停止要求中' : '待機中');
    if(summary) summary.textContent=text;
    table.innerHTML=`<tr><td>状態</td><td>${escapeHtml(running ? 'running' : 'idle')}</td></tr><tr><td>ジョブID</td><td>${escapeHtml(String(status.lastJobId || '-'))}</td></tr><tr><td>進捗</td><td>${percent}% / ${Number(progress.processedPairs||0)} / ${Number(progress.totalPairs||0)}</td></tr><tr><td>保存</td><td>新規 ${Number(progress.imported||0)} / 更新 ${Number(progress.updated||0)} / 失敗 ${Number(progress.failed||0)}</td></tr><tr><td>現在</td><td>${escapeHtml(String(progress.currentDate || '-'))} ${escapeHtml(String(progress.currentVenueId || ''))}</td></tr><tr><td>開始</td><td>${escapeHtml(String(status.startedAt || '-'))}</td></tr><tr><td>終了</td><td>${escapeHtml(String(status.finishedAt || '-'))}</td></tr>`;
  }catch(error){
    if(summary) summary.textContent='取込ステータス取得失敗';
    table.innerHTML='<tr><td colspan="2">取込ステータス取得失敗</td></tr>';
  }
}

async function runVer12ImportFromUi(){
  const summary=$('ver12ImportSummary');
  const dateFrom=String($('ver12DateFrom')?.value || '').trim();
  const dateTo=String($('ver12DateTo')?.value || '').trim();
  const venueIds=normalizeVer12VenueIds($('ver12VenueIds')?.value);
  const dayMaxLimit=Number($('ver12DayMaxLimit')?.value || 120);
  const resume=Boolean($('ver12Resume')?.checked);
  const continueOnFailure=Boolean($('ver12ContinueOnFailure')?.checked);
  const payload={
    dateFrom,
    dateTo,
    venueIds: venueIds.length ? venueIds : ALL_VENUE_IDS,
    dayMaxLimit,
    resume,
    continueOnFailure,
    maxRacesPerVenue: 12
  };
  if(summary) summary.textContent='取込開始要求を送信中...';
  try{
    const response=await fetch(apiPath('/api/ver12/import'), {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
    const result=await response.json();
    if(!response.ok || !result?.success) throw new Error(result?.error || 'import start failed');
    if(summary) summary.textContent=`取込開始: job=${result.jobId || '-'}`;
    await refreshVer12ImportStatus();
  }catch(error){
    if(summary) summary.textContent=`取込開始失敗: ${error.message || 'error'}`;
  }
}

async function stopVer12ImportFromUi(){
  const summary=$('ver12ImportSummary');
  if(summary) summary.textContent='停止要求を送信中...';
  try{
    const response=await fetch(apiPath('/api/ver12/import/stop'), { method:'POST' });
    const result=await response.json();
    if(!response.ok || !result?.success) throw new Error(result?.error || 'import stop failed');
    if(summary) summary.textContent='停止要求を送信しました';
    await refreshVer12ImportStatus();
  }catch(error){
    if(summary) summary.textContent='停止要求に失敗しました';
  }
}

async function renderImportLogPanel(){
  ensureImportLogPanel();
  ensureVer12ImportPanel();
  const tbody=$('importLogTable')?.querySelector('tbody');
  if(tbody){
    try{
      const response=await fetch(apiPath('/api/database/import-log'));
      const payload=await response.json();
      const logs=Array.isArray(payload?.logs) ? payload.logs : [];
      tbody.innerHTML=logs.length
        ? logs.slice(0,50).map((row)=>{
          const failedDetails=Array.isArray(row?.failedDetails) ? row.failedDetails : [];
          const reason=failedDetails[0]?.reason || '-';
          const imported=Number(row?.imported || 0) + Number(row?.updated || 0);
          return `<tr><td>${escapeHtml(String(row?.timestamp || '-'))}</td><td>${imported.toLocaleString()}</td><td>${Number(row?.failed || 0).toLocaleString()}</td><td>${escapeHtml(reason)}</td></tr>`;
        }).join('')
        : '<tr><td colspan="4">ログなし</td></tr>';
    }catch(error){
      tbody.innerHTML='<tr><td colspan="4">取込ログの取得に失敗しました</td></tr>';
    }
  }

  const dateFromInput=$('ver12DateFrom');
  const dateToInput=$('ver12DateTo');
  if(dateFromInput && dateToInput && !dateFromInput.value && !dateToInput.value){
    const defaults=defaultVer12DateRange();
    dateFromInput.value=defaults.dateFrom;
    dateToInput.value=defaults.dateTo;
  }

  const startBtn=$('ver12ImportStartBtn');
  const stopBtn=$('ver12ImportStopBtn');
  if(startBtn) startBtn.onclick=()=>{ void runVer12ImportFromUi(); };
  if(stopBtn) stopBtn.onclick=()=>{ void stopVer12ImportFromUi(); };
  await refreshVer12ImportStatus();
}

async function runBacktestFromUi(){
  const summary=$('backtestRunSummary');
  if(summary) summary.textContent='実行中...';

  const payload={
    dateFrom:String($('backtestDateFrom')?.value || '').trim(),
    dateTo:String($('backtestDateTo')?.value || '').trim(),
    venueIds:String($('backtestVenueIds')?.value || '').split(',').map((value)=>value.trim()).filter(Boolean),
    aiId:String($('backtestAiId')?.value || '').trim()
  };

  try{
    const response=await fetch('/api/backtest/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!response.ok) throw new Error('backtest run failed');
    const result=await response.json();
    const display=result || {};
    if(summary){
      summary.textContent=`${display.aiName || '-'} / ROI ${Number(display.roi||0).toFixed(1)}% / 利益 ${Number(display.profit||0).toLocaleString()}円 / 的中率 ${Number(display.hitRate||0).toFixed(1)}%`;
    }
    await renderBacktestPanel();
  }catch(error){
    if(summary) summary.textContent='バックテストに失敗しました';
  }
}

async function renderBacktestPanel(){
  return;
}

function escapeHtml(value){
  return String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function formatMultilineComment(text){
  return escapeHtml(text).replace(/\n/g,'<br>');
}

function renderOfficialPrediction(prediction){
  if(!prediction) return;

  ensureAiConfidenceSlot();
  ensureRoughRaceSlot();
  ensureDecisionSlots();
  ensureBestAiSlot();
  const analysisPanel=ensureAiAnalysisPanel();
  renderBestAiRecommendation(prediction.bestAiRecommendation);
  const headCoach=state.headCoach || prediction.headCoach || null;
  const coach=headCoach?.coach || null;

  const scoreRows=Array.isArray(prediction.score)?prediction.score.slice():[];
  const buyDetails=Array.isArray(prediction.buyDetails)?prediction.buyDetails.slice():[];
  const valueRanking=Array.isArray(prediction.valueRanking)?prediction.valueRanking.slice():[];
  const buyableValueRanking=filterBuyableValues(valueRanking);
  const explanation=prediction.explanation || {};
  const analysis=explanation.analysis || {};
  const roughRace=prediction.roughRace || {};
  const decision=prediction.decision || {};
  scoreRows.sort((a,b)=>(a.rank||999)-(b.rank||999) || (b.score||0)-(a.score||0));
  const favorite=scoreRows[0]||{};
  const second=scoreRows[1]||{};
  const dark=scoreRows[2]||scoreRows[scoreRows.length-1]||{};
  const confidence=Math.max(0, Math.min(99.9, Number(favorite.score)||0));
  const buys=(Array.isArray(prediction.buy)?prediction.buy:[]).slice(0,5);
  const topTicket=buyableValueRanking[0] || valueRanking[0] || buyDetails[0] || {};
  const aiComment=prediction.aiComment || `◎${favorite.lane||'-'}号艇中心で組み立て。`;
  const coachSummary=coach?.summary || '';
  const coachReason=coach?.reason || '';
  const coachDecision=String(coach?.finalDecision || '').trim();
  const visibleDecision=coachDecision || String(decision?.decision || '見送り');
  const visibleStake=coach?.purchaseAmount ? `${Number(coach.purchaseAmount).toLocaleString('ja-JP')}円` : (decision.stakeStars || '-');

  const aiDecision=$('aiDecision');
  if(aiDecision){
    const decisionText=visibleDecision;
    aiDecision.textContent=decisionText;
    aiDecision.className=`decision ${decisionClassName(decisionText).replace('decision-','')}`;
  }

  setText('favoriteReason', `◎ ${favorite.lane||'-'}号艇`);
  setText('secondReason', `○ ${second.lane||'-'}号艇`);
  setText('darkReason', `▲ ${dark.lane||'-'}号艇`);
  const oddsAvailable=hasOfficialTrifectaOdds(valueRanking);
  const topTicketEvText=topTicket?.evCalculable ? `${Math.round(Number(topTicket.expectedValue)||0)}%` : '期待値計算不可';
  setText('ticketReason', topTicket.combo ? `${topTicket.valueStars || topTicket.rating || ''} 価値No${topTicket.valueRank || '-'} ${topTicket.combo} ${topTicketEvText}` : (buys.length ? buys.join(' / ') : '-'));
  setText('valueReason', oddsAvailable ? topTicketEvText : '公式3連単オッズ未取得');
  setText('confidenceReason', coach ? `${coach.confidenceStars || '-'} / ${coach.trustScore?.toFixed ? coach.trustScore.toFixed(3) : coach.trustScore || '-'} ` : `${confidence.toFixed(1)}%`);
  setText('roughRaceReason', roughRace.stars && roughRace.roughLevel ? `${roughRace.stars} ${roughRace.roughLevel}` : '-');
  setText('decisionReason', visibleDecision || '-');
  setText('stakeLevelReason', visibleStake || '-');
  const commentEl=$('aiShortComment');
  if(commentEl){
    commentEl.innerHTML=formatMultilineComment(coachSummary ? `${coachSummary}\n${aiComment}` : aiComment);
  }

  if(analysisPanel){
    analysisPanel.innerHTML=`
      <p class="ai-comment-label">AI分析</p>
      <div class="ai-summary-grid compact-grid">
        <div class="ai-summary-item"><span>全国勝率</span><strong>${escapeHtml(analysis.national || '★☆☆☆☆')}</strong></div>
        <div class="ai-summary-item"><span>展示</span><strong>${escapeHtml(analysis.exhibition || '★☆☆☆☆')}</strong></div>
        <div class="ai-summary-item"><span>モーター</span><strong>${escapeHtml(analysis.motor || '★☆☆☆☆')}</strong></div>
        <div class="ai-summary-item"><span>風</span><strong>${escapeHtml(analysis.wind || '★☆☆☆☆')}</strong></div>
        <div class="ai-summary-item"><span>期待値</span><strong>${escapeHtml(analysis.expectedValue || '★☆☆☆☆')}</strong></div>
        <div class="ai-summary-item"><span>荒れ度</span><strong>${escapeHtml(roughRace.stars && roughRace.roughLevel ? `${roughRace.stars} ${roughRace.roughLevel}` : '★☆☆☆☆ 本命')}</strong></div>
        <div class="ai-summary-item"><span>判断</span><strong>${escapeHtml(decision.decision || '-')}</strong></div>
        <div class="ai-summary-item"><span>資金レベル</span><strong>${escapeHtml(decision.stakeStars || '-')}</strong></div>
        <div class="ai-summary-item"><span>理由</span><strong>${escapeHtml(decision.reason || '-')}</strong></div>
      </div>`;
  }

  const betsTable=$('betsTable');
  if(betsTable){
    const tbody=betsTable.querySelector('tbody');
    if(tbody && valueRanking.length){
      tbody.innerHTML=valueRanking.slice(0, 15).map((item)=>`<tr><td>${item.valueRank||'-'}</td><td><b>${escapeHtml(item.combo||'-')}</b></td><td>${Number(item.probability||0).toFixed(1)}%</td><td>${Number(item.odds||0).toFixed(1)}</td><td>${item.evCalculable ? `${Math.round(Number(item.expectedValue)||0)}%` : '計算不可'}</td><td class="${valueDecisionClass(item)}">${escapeHtml(valueDecisionLabel(item))}</td></tr>`).join('');
    }
  }

  const detailPanel=$('aiDetailPanel');
  if(detailPanel){
    const top3Rows=valueRanking.slice(0,3);
    const ticketHtml=top3Rows.map((item)=>`<p>${escapeHtml(item.valueStars || '')} 価値No${item.valueRank || '-'} ${escapeHtml(item.combo)} / 予測確率${Number(item.probability||0).toFixed(1)}% / 公式オッズ${Number(item.odds||0).toFixed(1)}倍 / 期待値${item.evCalculable ? `${Math.round(Number(item.expectedValue)||0)}%` : '計算不可'} / 判断${escapeHtml(valueDecisionLabel(item))}</p>`).join('');
    const oddsStatusHtml=oddsAvailable ? '' : '<p>公式3連単オッズ未取得</p>';
    const strengthsHtml=(Array.isArray(explanation.strengths)?explanation.strengths:[]).map((item)=>`<li>${escapeHtml(item)}</li>`).join('');
    const risksHtml=(Array.isArray(explanation.risks)?explanation.risks:[]).map((item)=>`<li>${escapeHtml(item)}</li>`).join('');
    const roughReasonsHtml=(Array.isArray(roughRace.reasons)?roughRace.reasons:[]).map((item)=>`<li>${escapeHtml(item)}</li>`).join('');
    detailPanel.innerHTML=`<div class="ai-detail-grid">
      <div><strong>◎ 本命</strong><p>${favorite.lane||'-'}号艇 / score ${Number(favorite.score||0).toFixed(1)}</p></div>
      <div><strong>○ 対抗</strong><p>${second.lane||'-'}号艇 / score ${Number(second.score||0).toFixed(1)}</p></div>
      <div><strong>▲ 穴</strong><p>${dark.lane||'-'}号艇 / score ${Number(dark.score||0).toFixed(1)}</p></div>
      <div><strong>AI監督コメント</strong><p>${escapeHtml(coachSummary || '監督AIの判定を集計中')}</p><p>${escapeHtml(coachReason || '-')}</p><p>${escapeHtml(coach?.trustedRoleName ? `採用AI: ${coach.trustedRoleName}` : '-')}</p><p>${escapeHtml(coachDecision ? `最終判断: ${coachDecision}` : '-')}</p></div>
      <div><strong>価値ランキング</strong>${oddsStatusHtml}${ticketHtml || `<p>${buys.length ? buys.join(' / ') : '-'}</p>`}</div>
      <div><strong>AIコメント</strong><p>${formatMultilineComment(aiComment)}</p></div>
      <div><strong>強み</strong><ul>${strengthsHtml || '<li>-</li>'}</ul></div>
      <div><strong>不安要素</strong><ul>${risksHtml || '<li>-</li>'}</ul></div>
      <div><strong>推奨</strong><p>${escapeHtml(explanation.recommendation || '-')}</p><p>${escapeHtml(visibleDecision || '-')}</p><p>${escapeHtml(visibleStake || '-')}</p></div>
      <div><strong>荒れ度</strong><p>${escapeHtml(roughRace.stars && roughRace.roughLevel ? `${roughRace.stars} ${roughRace.roughLevel}` : '-')}</p><ul>${roughReasonsHtml || '<li>-</li>'}</ul></div>
      <div><strong>判断</strong><p>${escapeHtml(decision.decision || '-')}</p><p>${escapeHtml(decision.reason || '-')}</p><p>${escapeHtml(decision.recommendedBudgetRate || '-')}</p></div>
    </div>`;
  }
}

async function fetchOfficialPrediction(){
  if(!state.venue || !state.race) return null;
  const venueId=getVenueId(state.venue);
  if(!venueId) return null;

  try{
    const response=await fetch(`/api/predict/${venueId}/${state.race}`);
    if(!response.ok) return null;
    const payload=await response.json();
    if(!payload || !payload.success || !payload.prediction) return null;
    setDataStatus('');
    return payload.prediction;
  }catch(error){
    setDataStatus('予想取得失敗: 予想APIはフォールバック中');
    return null;
  }
}

async function fetchHeadCoachRecommendation(){
  if(!state.venue || !state.race) return null;
  const venueId=getVenueId(state.venue);
  if(!venueId) return null;

  try{
    const response=await fetch(`/api/ver11/headcoach?venueId=${encodeURIComponent(venueId)}&raceNo=${encodeURIComponent(state.race)}`);
    if(!response.ok) return null;
    const payload=await response.json();
    if(!payload || !payload.success || !payload.headCoach) return null;
    return payload.headCoach;
  }catch(error){
    return null;
  }
}

async function applyOfficialPredictionIfAvailable(){
  const prediction=await fetchOfficialPrediction();
  if(!prediction){
    state.officialPrediction=null;
    state.headCoach=null;
    await renderConferencePanel();
    await renderLeaguePanel();
    await renderWeightsPanel();
    await renderOptimizerPanel();
    await renderImportLogPanel();
    await renderBacktestPanel();
    return;
  }
  state.officialPrediction=prediction;
  state.headCoach=await fetchHeadCoachRecommendation();
  renderOfficialPrediction(prediction);
  await renderConferencePanel();
  await renderLeaguePanel();
  await renderWeightsPanel();
  await renderOptimizerPanel();
  await renderImportLogPanel();
  await renderBacktestPanel();
}
const today=new Date();
$('todayLabel').textContent=today.toLocaleDateString('ja-JP');

const raceScheduleDefaults={};
const resultData={};
const venueHomeData=[];

const officialDataService=createDataHubService({
  venues,
  raceScheduleDefaults,
  venueHomeData,
  resultData,
  localRaceData: {},
  localPlayers: [],
  fallbackEntries: []
});

function getResultData(venue,raceNo){
  if(state.venue===venue && Number(state.race)===Number(raceNo) && state.raceMeta?.resultDetails){
    return state.raceMeta.resultDetails;
  }
  return resultData[venue]?.[String(raceNo)] || resultData[venue]?.[raceNo] || null;
}

function getPredictedTopMark(){
  if(state.officialPrediction?.buyDetails?.[0]?.combo){
    return String(state.officialPrediction.buyDetails[0].combo);
  }
  if(Array.isArray(state.bets) && state.bets[0]?.mark){
    return String(state.bets[0].mark);
  }
  return '';
}

function renderPredictionVsResult(resultDetails){
  const predicted=getPredictedTopMark();
  const actual=String(resultDetails?.order || '');
  if(!predicted){
    return '<div class="result-compare-box"><div class="muted">予想データを読み込み中です</div></div>';
  }
  if(!actual){
    return `<div class="result-compare-box"><div class="overview-item"><span>予想買い目</span><strong>${escapeHtml(predicted)}</strong></div><div class="overview-item"><span>判定</span><strong>結果待ち</strong></div></div>`;
  }
  const hit=predicted===actual;
  const label=hit ? '的中' : '不的中';
  const cls=hit ? 'final' : 'pending';
  const hasSettlement=state.lastSettlement && state.lastSettlement.purchaseAmount != null;
  const purchase=hasSettlement ? Number(state.lastSettlement.purchaseAmount) : 0;
  const payout=hasSettlement ? Number(state.lastSettlement.payoutAmount) : Number(resultDetails?.trifectaPayout || 0);
  const profit=hasSettlement ? Number(state.lastSettlement.profit) : (hit ? payout - purchase : -purchase);
  const roi=hasSettlement ? Number(state.lastSettlement.roi) : (purchase > 0 ? (payout / purchase) * 100 : 0);
  return `<div class="result-compare-box"><div class="overview-item"><span>予想買い目</span><strong>${escapeHtml(predicted)}</strong></div><div class="overview-item"><span>実着順</span><strong>${escapeHtml(actual)}</strong></div><div class="overview-item"><span>判定</span><strong class="result-summary-badge ${cls}">${label}</strong></div><div class="overview-item"><span>払戻</span><strong>${Number(payout || 0).toLocaleString()}円</strong></div><div class="overview-item"><span>利益</span><strong>${Number(profit || 0).toLocaleString()}円</strong></div><div class="overview-item"><span>ROI</span><strong>${Number(roi || 0).toFixed(1)}%</strong></div></div>`;
}

async function refreshVer8Dashboard(){
  const statsBlock=$('dashboardStats') || $('stats');
  if(!statsBlock) return;
  try{
    const response=await fetch('/api/ver8/dashboard');
    const payload=await response.json();
    const dash=payload?.dashboard;
    if(!response.ok || !dash) return;
    statsBlock.innerHTML=`
      <div class="stat">本日投資<b>${Number(dash.purchaseAmount||0).toLocaleString()}円</b></div>
      <div class="stat">本日回収<b>${Number(dash.payoutAmount||0).toLocaleString()}円</b></div>
      <div class="stat">本日収支<b>${Number(dash.profit||0).toLocaleString()}円</b></div>
      <div class="stat">本日ROI<b>${Number(dash.roi||0).toFixed(1)}%</b></div>
      <div class="stat">的中数<b>${Number(dash.hitCount||0)}件</b></div>
      <div class="stat">購入数<b>${Number(dash.buyCount||0)}件</b></div>`;
  }catch(error){
    // keep existing dashboard rendering
  }
}

function stopRacePolling(){
  if(state.pollingId){
    clearInterval(state.pollingId);
    state.pollingId=null;
  }
  state.pollingKey='';
}

async function refreshRaceMetaAndSummary(){
  if(!state.venue || !state.race) return;
  state.raceMeta=await getRaceMeta(state.venue,state.race);
  renderResultSummary();
  renderRaceOverview();
}

function startRacePolling(){
  stopRacePolling();
  if(!state.venue || !state.race) return;
  state.pollingKey=`${state.venue}-${state.race}`;
  state.pollingId=setInterval(async()=>{
    if(!state.venue || !state.race) return;
    const result=getResultData(state.venue,state.race) || {};
    if(Boolean(result.isFinal)){
      stopRacePolling();
      return;
    }
    try{
      await syncRaceResult(true);
    }catch(error){
      // ignore silent polling failures
    }
  },60000);
}

async function syncRaceResult(silent=false){
  if(!state.venue || !state.race || state.isSyncingResult) return;
  const venueId=getVenueId(state.venue);
  if(!venueId) return;
  state.isSyncingResult=true;
  const statusEl=$('resultSyncStatus');
  if(statusEl) statusEl.textContent='結果を更新中...';
  try{
    const response=await fetch('/api/ver8/result/sync',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({venueId,raceNo:state.race})
    });
    const payload=await response.json();
    await refreshRaceMetaAndSummary();
    await refreshVer8Dashboard();
    if(payload?.settled){
      state.lastSettlement={
        hit:Boolean(payload?.hit),
        purchaseAmount:Number(payload?.purchaseAmount || 0),
        payoutAmount:Number(payload?.payoutAmount || 0),
        profit:Number(payload?.profit || 0),
        roi:Number(payload?.roi || 0)
      };
      renderResultSummary();
      renderRaceOverview();
      if(statusEl) statusEl.textContent='結果を確定して収支・学習を更新しました';
      stopRacePolling();
    }else if(statusEl){
      statusEl.textContent='まだ結果未確定です';
    }
    if(!silent && payload?.error){
      setDataStatus(`結果更新に失敗: ${payload.error}`);
    }
  }catch(error){
    if(statusEl) statusEl.textContent='結果更新に失敗しました';
    if(!silent) setDataStatus('結果更新APIの呼び出しに失敗しました');
  }finally{
    state.isSyncingResult=false;
  }
}

async function getRaceMeta(venue,raceNo){
  const [weather, result, status] = await Promise.all([
    officialDataService.getWeather(venue,raceNo),
    officialDataService.getRaceResult(venue,raceNo),
    officialDataService.getRaceStatus(venue,raceNo)
  ]);
  const resultDefaults=result || { isFinal:false, order:'', winMethod:'', payout:'', confirmedAt:'' };
  const resultStatus=resultDefaults.isFinal ? '結果確定' : '結果未確定';
  return {
    venue,
    raceNo,
    start:weather.start || '10:45',
    close:weather.close || '10:20',
    status:weather.status || 'live',
    result:resultStatus,
    weather:weather.weather || '晴',
    windDir:weather.windDir || '向かい風',
    windSpeed:weather.windSpeed || 2,
    wave:weather.wave || 3,
    weatherSource:weather.source || state.weatherSource,
    resultSource:state.resultSource,
    raceScheduleSource:state.raceScheduleSource,
    raceStatusLabel:status.raceStatusLabel || '発売中',
    resultDetails:resultDefaults
  };
}

function init(){
  state.bankroll=loadBankroll();
  state.recommendDateTarget=loadRecommendDateTarget();
  syncBankrollInput();
  renderRecommendPanel();
  void renderVenueHome();
  renderStats();
  const saveBankrollBtn=$('saveBankrollBtn');
  const bankrollInput=$('bankrollInput');
  const recommendTodayBtn=$('recommendTodayBtn');
  const recommendTomorrowBtn=$('recommendTomorrowBtn');
  if(saveBankrollBtn){
    saveBankrollBtn.onclick=()=>{
      saveBankroll(bankrollInput?.value ?? state.bankroll);
      renderRecommendPanel();
    };
  }
  if(bankrollInput){
    bankrollInput.value=String(state.bankroll);
    bankrollInput.onkeydown=(event)=>{
      if(event.key==='Enter'){
        event.preventDefault();
        saveBankroll(bankrollInput.value);
        renderRecommendPanel();
      }
    };
  }
  if(recommendTodayBtn){
    recommendTodayBtn.onclick=()=>{
      saveRecommendDateTarget('today');
      renderRecommendPanel();
    };
  }
  if(recommendTomorrowBtn){
    recommendTomorrowBtn.onclick=()=>{
      saveRecommendDateTarget('tomorrow');
      renderRecommendPanel();
    };
  }
  saveRecommendDateTarget(state.recommendDateTarget);
  $('backVenue').onclick=()=>{state.venue=null;state.race=null;void renderVenueHome();show('venue');updateSteps(1);};
  $('backRace').onclick=()=>{show('race');updateSteps(2);};
  $('sampleBtn').onclick=sample;
  $('calcBtn').onclick=calculate;
  $('saveBtn').onclick=saveRace;
  $('reflectBtn').onclick=reflect;
  $('toggleDetailsBtn').onclick=toggleDetailRows;
  document.addEventListener('click',(event)=>{
    const target=event.target;
    if(!(target instanceof HTMLElement)) return;
    if(target.id==='refreshResultBtn'){
      void syncRaceResult(false);
    }
  });
  const toggleAiDetailBtn=$('toggleAiDetailBtn');
  if(toggleAiDetailBtn){
    toggleAiDetailBtn.onclick=()=>{
      const panel=$('aiDetailPanel');
      if(!panel) return;
      panel.classList.toggle('hidden');
    };
  }
  $('resetBtn').onclick=()=>{if(confirm('保存データを消しますか？')){localStorage.removeItem('boat_ai_records');renderStats();}};
  updateSteps(1);
  show('venue');
}

async function renderVenueHome(){
  const venueGrid = $('venueGrid');
  if(!venueGrid){
    return;
  }

  const renderVenues = (items=[]) => {
    const itemMap = new Map((Array.isArray(items) ? items : []).map((item) => [String(item?.venue || '').trim(), item]));
    venueGrid.innerHTML = venues.map((venueName) => {
      const item = itemMap.get(venueName);
      const isOpen = Boolean(item);
      const currentRace = item?.currentRace ? `現在 ${item.currentRace}R` : '本日非開催';
      const closeTime = item?.closeTime ? `締切 ${item.closeTime}` : 'レース情報なし';
      const weather = isOpen ? `${item?.weather || '-'} / ${item?.windSpeed ?? '-'}m` : '本日は開催がありません';
      return `<button class="venue ${state.venue===venueName?'active':''} ${isOpen?'open':'closed'}" data-venue="${venueName}"><strong>${venueName}</strong><span>${currentRace}</span><span>${closeTime}</span><span>${weather}</span></button>`;
    }).join('');
    venueGrid.querySelectorAll('.venue').forEach((btn)=>btn.onclick=()=>selectVenue(btn.dataset.venue));
  };

  renderVenues();

  officialDataService.getTodayVenues().then((items)=>{
    renderVenues(items);
    const lastError=officialDataService.getLastError ? officialDataService.getLastError() : '';
    if(lastError) setDataStatus(`${lastError}（ローカルへフォールバック）`);
  }).catch(()=>{
    setDataStatus('開催場取得失敗: ローカル表示へフォールバック');
  });
}

async function selectVenue(v){
  state.venue=v;
  state.race=null;
  const raceList=await officialDataService.getRaceList(v).catch(()=>[]);
  const raceRows=Array.isArray(raceList)?raceList:[];
  const listError=officialDataService.getLastError ? officialDataService.getLastError() : '';
  if(listError) setDataStatus(`${listError}（ローカルへフォールバック）`);
  const hasHolding=raceRows.length>0;
  const raceMap=new Map(raceRows.map((row)=>[Number(row?.raceNo||0), row]));
  state.hasRaceHolding=hasHolding;
  $('venueTitle').textContent=`3. ${v} レース一覧`;
  $('venueHint').textContent=`${v}のレースを選択してください。`;
  $('raceSummary').innerHTML=hasHolding
    ? `<div class="summary-box__title">${v}</div><p class="muted">1R〜12Rを選択して予想を表示します。</p>`
    : `<div class="summary-box__title">${v}</div><p class="muted">本日は開催がありません</p>`;
  $('raceGrid').innerHTML=Array.from({length:12},(_,i)=>{
    const raceNo=i+1;
    const raceInfo=raceMap.get(raceNo);
    const resultItem=getResultData(v,raceNo);
    const status=!hasHolding
      ? '本日非開催'
      : resultItem?.isFinal
      ? '結果確定'
      : raceInfo?.status
      ? String(raceInfo.status)
      : '未公開';
    const start=raceInfo?.start ? `発走 ${raceInfo.start}` : '発走 --:--';
    const close=raceInfo?.close ? `締切 ${raceInfo.close}` : '締切 --:--';
    const statusClass=resultItem?.isFinal?'final':(status==='未公開'?'pending':'live');
    return `<button class="race" data-race="${raceNo}"><span class="race-number">${raceNo}R</span><span>${start}</span><span>${close}</span><span class="race-badge ${statusClass}">${status}</span></button>`;
  }).join('');
  document.querySelectorAll('.race').forEach(btn=>btn.onclick=()=>selectRace(Number(btn.dataset.race)));
  show('race');
  updateSteps(2);
}

async function selectRace(r){
  state.race=r;
  state.raceMeta=await getRaceMeta(state.venue,r);
  $('raceTitle').textContent=`4. ${state.venue} ${r}R レース詳細・AI予想`;
  $('detailWeather').textContent=state.raceMeta.weather;
  $('detailWindDir').textContent=state.raceMeta.windDir;
  $('detailWindSpeed').textContent=`${state.raceMeta.windSpeed}m`;
  $('detailWave').textContent=`${state.raceMeta.wave}cm`;
  $('raceMainTitle').textContent=`${state.venue} ${r}R / 発走 ${state.raceMeta.start} / ${state.raceMeta.result}`;
  $('raceMetaSummary').textContent=`開催地 ${state.venue} / ${state.raceMeta.raceStatusLabel} ${state.raceMeta.close} / 天候 ${state.raceMeta.weather} (${state.raceMeta.weatherSource})`;
  setDataStatus('');
  $('weather').value=state.raceMeta.weather;
  $('windDir').value=state.raceMeta.windDir;
  $('windSpeed').value=state.raceMeta.windSpeed;
  $('wave').value=state.raceMeta.wave;
  renderResultSummary();
  renderRaceOverview();
  $('aiDecision').textContent='読み込み中';
  setText('aiReason','出走表データを取得しています。');
  state.entries=await raceEntryStore.load(state.venue,r);
  renderEntryTable();
  renderDetailRows();
  $('probList').innerHTML='';
  $('betsTable').querySelector('tbody').innerHTML='';
  calculate();
  const oddsPayload=await officialDataService.getOdds(state.venue,r).catch(()=>null);
  if(oddsPayload?.odds){
    renderOddsSummary(oddsPayload);
    applyOfficialOddsToBets(oddsPayload);
    renderBets();
    decision();
  }else{
    renderOddsSummary(null);
  }
  await applyOfficialPredictionIfAvailable();
  const lastError=officialDataService.getLastError ? officialDataService.getLastError() : '';
  if(lastError){
    setDataStatus(`${lastError}（ローカルへフォールバック）`);
  }
  await renderAnalysisMoneyPlan();
  await refreshVer8Dashboard();
  startRacePolling();
  show('analysis');
  updateSteps(4);
}

function show(stage='venue'){
  const venuePanel=$('venuePanel');
  const raceSection=$('raceSection');
  const analysisSection=$('analysisSection');
  if(!venuePanel || !raceSection || !analysisSection) return;
  venuePanel.classList.toggle('hidden', stage!=='venue');
  raceSection.classList.toggle('hidden', stage!=='race');
  analysisSection.classList.toggle('hidden', stage!=='analysis');
  if(stage!=='analysis') stopRacePolling();
}

function updateSteps(step){
  document.querySelectorAll('.flow-step').forEach((el,index)=>{
    const n=index+1;
    el.classList.toggle('active',n===step);
    el.classList.toggle('done',n<step);
  });
}

function defaultEntries(){
  return [];
}
function renderEntryTable(){
  const tb=$('entryTable').querySelector('tbody');
  tb.innerHTML=state.entries.map((e,i)=>`<tr>
    <td>${e.boat}</td>
    <td>${e.name}</td>
    <td>${e.className}</td>
    <td>${Number(e.nationalWin ?? 0).toFixed(1)}</td>
    <td>${Number(e.localWin ?? 0).toFixed(1)}</td>
    <td>${Number(e.avgSt ?? 0).toFixed(2)}</td>
    <td>${Number(e.motorRate ?? 0)}%</td>
    <td>${Number(e.boatRate ?? 0)}%</td>
    <td>${e.currentForm}</td>
    <td><button class="ghost small" data-index="${i}" data-action="toggle">詳細</button></td>
  </tr>`).join('');
  tb.querySelectorAll('button[data-action="toggle"]').forEach(btn=>btn.onclick=()=>toggleEntryDetail(Number(btn.dataset.index)));
}
function toggleEntryDetail(index){
  const entry=state.entries[index];
  if(!entry) return;
  const rows=$('detailRows');
  const current=rows.dataset.openIndex;
  if(current===String(index)){
    rows.classList.add('hidden');
    rows.dataset.openIndex='';
    return;
  }
  rows.dataset.openIndex=String(index);
  rows.innerHTML=`<div class="detail-row-grid">${[
    ['登録番号', entry.registrationNo],
    ['支部', entry.branch],
    ['年齢', entry.age],
    ['全国2連率', Number(entry.national2Win ?? 0).toFixed(1)],
    ['当地2連率', Number(entry.local2Win ?? 0).toFixed(1)],
    ['展示タイム', Number(entry.exhibitionTime ?? 0).toFixed(2)],
    ['体重', entry.weight],
    ['チルト', entry.tilt],
    ['今節成績', entry.currentForm]
  ].map(([label, value])=>`<div class="detail-row"><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>`;
  rows.classList.remove('hidden');
}
function toggleDetailRows(){
  const rows=$('detailRows');
  rows.classList.toggle('hidden');
  if(rows.classList.contains('hidden')){
    $('toggleDetailsBtn').textContent='詳細項目を表示';
  }else{
    $('toggleDetailsBtn').textContent='詳細項目を隠す';
  }
}
function renderDetailRows(){
  $('detailRows').classList.add('hidden');
  $('detailRows').dataset.openIndex='';
  $('detailRows').innerHTML='';
  $('toggleDetailsBtn').textContent='詳細項目を表示';
}
function renderResultSummary(){
  const resultBox=$('resultSummaryBox');
  if(!state.venue || !state.race){
    resultBox.innerHTML='';
    return;
  }
  const resultDetails=getResultData(state.venue,state.race) || {};
  const isFinal=Boolean(resultDetails.isFinal);
  const resultLabel=isFinal ? '結果確定' : '結果未確定';
  const compareHtml=renderPredictionVsResult(resultDetails);
  const resultRows=isFinal
    ? `<div class="result-summary-item"><span>着順</span><strong>${resultDetails.order || '-'}</strong></div><div class="result-summary-item"><span>決まり手</span><strong>${resultDetails.winMethod || '-'}</strong></div><div class="result-summary-item"><span>払戻金</span><strong>${resultDetails.payout || '-'}</strong></div><div class="result-summary-item"><span>確定時刻</span><strong>${resultDetails.confirmedAt || '-'}</strong></div>`
    : `<div class="result-summary-item"><span>結果</span><strong>${resultLabel}</strong></div>`;
  resultBox.innerHTML=`<div class="result-summary-head"><span class="result-summary-badge ${isFinal?'final':'pending'}">${resultLabel}</span><strong>${state.venue} ${state.race}R</strong><button id="refreshResultBtn" class="ghost" style="margin-left:auto;">結果を更新</button></div><div id="resultSyncStatus" class="muted" style="margin-bottom:6px;"></div><div class="result-summary-grid">${resultRows}</div>${compareHtml}`;
}

function renderRaceOverview(){
  const resultDetails=getResultData(state.venue,state.race) || {};
  const resultBlock=resultDetails.isFinal
    ? `<div class="overview-item"><span>着順</span><strong>${resultDetails.order || '-'}</strong></div><div class="overview-item"><span>決まり手</span><strong>${resultDetails.winMethod || '-'}</strong></div><div class="overview-item"><span>払戻金</span><strong>${resultDetails.payout || '-'}</strong></div><div class="overview-item"><span>確定時刻</span><strong>${resultDetails.confirmedAt || '-'}</strong></div>`
    : `<div class="overview-item"><span>結果</span><strong>${state.raceMeta.result}</strong></div>`;
  $('raceOverview').innerHTML=`<div class="overview-item"><span>開催地</span><strong>${state.venue}</strong></div><div class="overview-item"><span>レース番号</span><strong>${state.race}R</strong></div><div class="overview-item"><span>発走時刻</span><strong>${state.raceMeta.start}</strong></div><div class="overview-item"><span>状態</span><strong>${state.raceMeta.raceStatusLabel}</strong></div>${resultBlock}`;
  const top=state.entries[0];
  if(top){
    $('topPlayerSummary').innerHTML=`<div class="overview-item"><span>本命候補</span><strong>${top.boat}号艇 ${top.name}</strong></div><div class="overview-item"><span>級別</span><strong>${top.className}</strong></div><div class="overview-item"><span>勝率</span><strong>${Number(top.nationalWin ?? 0).toFixed(1)} / ${Number(top.localWin ?? 0).toFixed(1)}</strong></div><div class="overview-item"><span>ST</span><strong>${Number(top.avgSt ?? 0).toFixed(2)}</strong></div>`;
  }else{
    $('topPlayerSummary').innerHTML='<div class="overview-item"><span>本命候補</span><strong>読み込み中</strong></div>';
  }
}
function sample(){
  if(!state.race) return;
  raceEntryStore.load(state.venue,state.race).then(entries=>{
    state.entries=entries;
    renderEntryTable();
    renderRaceOverview();
    renderDetailRows();
  });
}
function score(e){
  let s=0;
  const nationalWin=Number(e.nationalWin ?? e.nat ?? 0);
  const localWin=Number(e.localWin ?? e.local ?? 0);
  const avgSt=Number(e.avgSt ?? e.st ?? 0);
  const motorRate=Number(e.motorRate ?? e.motor ?? 0);
  const boatRate=Number(e.boatRate ?? 0);
  const exhibitionTime=Number(e.exhibitionTime ?? e.exhibition ?? 0);
  s+=nationalWin*8;
  s+=localWin*5;
  s+=motorRate*.45;
  s+=boatRate*.25;
  s+=(.22-avgSt)*180;
  s+=(6.9-exhibitionTime)*55;
  s+=[18,8,3,0,-4,-8][e.boat-1];
  const wind=parseFloat($('windSpeed').value)||0;
  if(wind>=5&&e.boat===1)s-=5;
  if(wind>=5&&[3,4,5].includes(e.boat))s+=2;
  return Math.max(1,s);
}
function calculate(){const scores=state.entries.map(e=>score(e));const sum=scores.reduce((a,b)=>a+b,0);state.entries.forEach((e,i)=>{e.score=scores[i];e.p1=scores[i]/sum; e.p2=Math.min(.95,e.p1*1.65); e.p3=Math.min(.99,e.p1*2.2);});renderProb();makeBets();renderBets();decision();renderRaceOverview();}
function renderProb(){const list=[...state.entries].sort((a,b)=>b.p1-a.p1);$('probList').innerHTML=list.map(e=>`<div class="prob-row"><b>${e.boat}号艇</b><div><div>${e.name}</div><div class="bar"><span style="width:${e.p1*100}%"></span></div></div><span>1着 ${(e.p1*100).toFixed(1)}%</span><span>2内 ${(e.p2*100).toFixed(1)}%</span><span>3内 ${(e.p3*100).toFixed(1)}%</span></div>`).join('');}
function makeBets(){let bets=[];for(let a of state.entries)for(let b of state.entries)for(let c of state.entries){if(new Set([a.boat,b.boat,c.boat]).size<3)continue;let p=a.p1*(b.p2/2)*(c.p3/3);let odds=autoOdds(p);bets.push({mark:`${a.boat}-${b.boat}-${c.boat}`,p,odds,ev:p*odds*100});}state.bets=bets.sort((x,y)=>y.ev-x.ev);}
function autoOdds(p){return Math.max(3,Math.min(250,Math.round((0.78/p)/1)*1));}
function renderBets(){const tb=$('betsTable').querySelector('tbody');tb.innerHTML=state.bets.slice(0,30).map((b,i)=>`<tr><td>${i+1}</td><td><b>${b.mark}</b></td><td>${(b.p*100).toFixed(2)}%</td><td><input data-mark="${b.mark}" class="odds" type="number" step="0.1" value="${b.odds}"></td><td>${b.ev.toFixed(0)}</td><td class="${b.ev>=120?'buy':b.ev>=100?'watch':'skip'}">${b.ev>=120?'買い候補':b.ev>=100?'注意':'買わない'}</td></tr>`).join('');tb.querySelectorAll('.odds').forEach(inp=>inp.oninput=()=>{let b=state.bets.find(x=>x.mark===inp.dataset.mark);b.odds=parseFloat(inp.value)||0;b.ev=b.p*b.odds*100;renderBets();decision();});}
function buildEntryEvidence(entry){
  const parts=[];
  const add=(label,value,digits=1,suffix='')=>{
    const numeric=Number(value);
    if(Number.isFinite(numeric)) parts.push(`${label}${numeric.toFixed(digits)}${suffix}`);
  };
  add('全国勝率', entry?.nationalWin,1);
  add('当地勝率', entry?.localWin,1);
  add('平均ST', entry?.avgSt,2);
  add('モーター2連率', entry?.motorRate,1,'%');
  add('ボート2連率', entry?.boatRate,1,'%');
  add('展示タイム', entry?.exhibitionTime,2);
  add('体重', entry?.weight,1,'kg');
  add('チルト', entry?.tilt,1);
  if(entry?.currentForm) parts.push(`今節成績${entry.currentForm}`);
  return parts;
}
function buildConditionEvidence(){
  const weather=$('weather').value;
  const windDir=$('windDir').value;
  const windSpeed=parseFloat($('windSpeed').value);
  const wave=parseFloat($('wave').value);
  const parts=[];
  if(weather) parts.push(`天候${weather}`);
  if(windDir) parts.push(`風向${windDir}`);
  if(Number.isFinite(windSpeed)) parts.push(`風速${windSpeed.toFixed(1)}m`);
  if(Number.isFinite(wave)) parts.push(`波高${wave.toFixed(0)}cm`);
  return parts;
}
function buildEntryComment(entry){
  const evidence=buildEntryEvidence(entry);
  if(!evidence.length) return '';
  const label=entry?.name || `${entry?.boat ? `${entry.boat}号艇` : ''}`.trim() || '対象艇';
  return `${label}は ${evidence.join('・')}。`;
}
function buildRiskComment(entry){
  const windSpeed=parseFloat($('windSpeed').value);
  const wave=parseFloat($('wave').value);
  const parts=[];
  if(Number.isFinite(windSpeed)&&windSpeed>=5) parts.push(`風速${windSpeed.toFixed(1)}m`);
  if(Number.isFinite(wave)&&wave>=10) parts.push(`波高${wave.toFixed(0)}cm`);
  const avgSt=Number(entry?.avgSt);
  if(Number.isFinite(avgSt)&&avgSt>3.8) parts.push(`平均ST${avgSt.toFixed(2)}`);
  const tilt=Number(entry?.tilt);
  if(Number.isFinite(tilt)&&tilt>2.8) parts.push(`チルト${tilt.toFixed(1)}`);
  if(entry?.currentForm) parts.push(`今節成績${entry.currentForm}`);
  if(!parts.length) return '';
  const label=entry?.name || `${entry?.boat ? `${entry.boat}号艇` : ''}`.trim() || '対象艇';
  return `${label}は ${parts.join('・')} のため、条件変化に弱い可能性がある。`;
}
function decision(){
  // AI評価と根拠を上段の要点表示と下段の説明に分けて見せる。
  let top=state.bets[0];
  let d=$('aiDecision');
  let favoriteReason=$('favoriteReason'),secondReason=$('secondReason'),darkReason=$('darkReason');
  let riskReason=$('riskReason'),valueReason=$('valueReason'),confidenceReason=$('confidenceReason');
  let favoriteDetail=$('favoriteDetail'),secondDetail=$('secondDetail'),riskDetail=$('riskDetail'),ticketReason=$('ticketReason');
  ensureAiConfidenceSlot();
  if(!top){
    if(d){
      d.textContent='未計算';
      d.className='decision';
    }
    setText('aiShortComment','レースを選択してAI計算を行ってください。');
    [favoriteReason,secondReason,darkReason,riskReason,valueReason,confidenceReason,favoriteDetail,secondDetail,riskDetail,ticketReason].forEach(el=>{ if(el) el.textContent='-'; });
    return;
  }
  const ranked=[...state.entries].sort((a,b)=>b.p1-a.p1);
  const favorite=ranked[0]||{};
  const second=ranked[1]||{};
  const dark=ranked[ranked.length-1]||{};
  const wind=parseFloat($('windSpeed').value)||0;
  const wave=parseFloat($('wave').value)||0;
  const confidence=Math.min(99, Math.round((top.ev/180)*100));
  const favoriteSummary=`${favorite.boat ? `${favorite.boat}号艇` : '不明'} ${favorite.name || ''}`.trim();
  const secondSummary=`${second.boat ? `${second.boat}号艇` : '不明'} ${second.name || ''}`.trim();
  const darkSummary=`${dark.boat ? `${dark.boat}号艇` : '不明'} ${dark.name || ''}`.trim();
  const conditionSummary=buildConditionEvidence().join('・');
  const favoriteComment=buildEntryComment(favorite);
  const secondComment=buildEntryComment(second);
  const riskComment=buildRiskComment(dark);
  let label='見送り判定';
  let detail='';
  if(top.ev>=120){
    label=`購入候補 ${top.mark}`;
    d.className='decision buy';
    detail=[favoriteComment, secondComment].filter(Boolean).join(' ');
    if(conditionSummary) detail=`${detail} 条件は ${conditionSummary}。`;
  }else if(top.ev>=100){
    label='注意して少額';
    d.className='decision watch';
    detail=[favoriteComment, secondComment].filter(Boolean).join(' ');
    if(conditionSummary) detail=`${detail} 条件は ${conditionSummary}。`;
  }else{
    label='見送り推奨';
    d.className='decision skip';
    detail=[favoriteComment, secondComment].filter(Boolean).join(' ');
    if(conditionSummary) detail=`${detail} 条件は ${conditionSummary}。`;
  }
  if(d) d.textContent=label;
  setText('aiShortComment', detail || '現在のデータからコメントを生成できません。');
  if(favoriteReason) favoriteReason.textContent=favoriteSummary || '-';
  if(secondReason) secondReason.textContent=secondSummary || '-';
  if(darkReason) darkReason.textContent=darkSummary || '-';
  if(riskReason) riskReason.textContent=riskComment || '-';
  if(confidenceReason) confidenceReason.textContent=`${confidence}%`;
  if(favoriteDetail) favoriteDetail.textContent=favoriteComment || '-';
  if(secondDetail) secondDetail.textContent=secondComment || '-';
  if(riskDetail) riskDetail.textContent=riskComment || '-';
  if(ticketReason) ticketReason.textContent=top.mark;
  if(valueReason) valueReason.textContent=`${top.ev.toFixed(0)}%`;

  if(state.officialPrediction){
    renderBestAiRecommendation(state.officialPrediction.bestAiRecommendation);
    renderOfficialPrediction(state.officialPrediction);
  }
}
function saveRace(){if(!state.venue||!state.race)return alert('レースを選択してください');let records=getRecords();records.push({date:today.toISOString().slice(0,10),venue:state.venue,race:state.race,entries:state.entries,bets:state.bets.slice(0,10),createdAt:Date.now()});localStorage.setItem('boat_ai_records',JSON.stringify(records));alert('保存しました');renderStats();}
function reflect(){let result=$('finalResult').value.trim();let payout=parseInt($('payout').value)||0;let stake=parseInt($('stake').value)||0;let top=state.bets[0];if(!top)return alert('先にAI計算してください');let hit=top.mark===result;let profit=hit?payout-stake:-stake;$('reflectResult').textContent=hit?`的中 +${profit.toLocaleString()}円`:`不的中 ${profit.toLocaleString()}円`;let records=getRecords();records.push({date:today.toISOString().slice(0,10),venue:state.venue,race:state.race,buy:top.mark,result,hit,payout,stake,profit,ev:top.ev,createdAt:Date.now()});localStorage.setItem('boat_ai_records',JSON.stringify(records));renderStats();}
function getRecords(){return JSON.parse(localStorage.getItem('boat_ai_records')||'[]');}
async function renderStats(bestAiRecommendation){
  return renderDashboardStats(bestAiRecommendation);
}
init();
