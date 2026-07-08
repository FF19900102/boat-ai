const venues=['桐生','戸田','江戸川','平和島','多摩川','浜名湖','蒲郡','常滑','津','三国','びわこ','住之江','尼崎','鳴門','丸亀','児島','宮島','徳山','下関','若松','芦屋','福岡','唐津','大村'];

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
      console.warn('Race data load failed', error);
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
let state={venue:null,race:null,entries:[],bets:[],raceMeta:{},weatherSource:'local',resultSource:'local',raceScheduleSource:'local',officialPrediction:null};
const $=id=>document.getElementById(id);
const BANKROLL_STORAGE_KEY='boat_ai_bankroll';
const VENUE_ID_MAP={
  '桐生':'kiryu','戸田':'toda','江戸川':'edogawa','平和島':'heiwajima','多摩川':'tamagawa','浜名湖':'hamanako','蒲郡':'gamagori',
  '常滑':'tokoname','津':'tsu','三国':'mikuni','丸亀':'marugame','児島':'kojima','宮島':'miya'
};

function setText(id,value){
  const el=$(id);
  if(el) el.textContent=value;
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
  return Array.isArray(valueRanking) ? valueRanking.filter((row)=>Number(row?.expectedValue || 0) >= 100) : [];
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
  panel.innerHTML='<div class="section-head compact"><h3>本日のAI結論カード</h3><span id="recommendModeLabel" class="muted">開催中の場から抽出</span></div><div id="todayConclusionCard" class="today-conclusion-card">読み込み中...</div><div id="todayRecommendationList" class="today-recommend-list"></div>';
  const venueGrid=$('venueGrid');
  const venueDetails=$('venueDetails');
  if(venueDetails && venueDetails.parentNode===venuePanel){
    venuePanel.insertBefore(panel, venueDetails);
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
  try{
    const [statsRes, modelRes] = await Promise.all([
      fetch('/api/stats'),
      fetch('/api/model/status')
    ]);
    if(!statsRes.ok || !modelRes.ok) throw new Error('dashboard stats fetch failed');
    const stats=await statsRes.json();
    const modelPayload=await modelRes.json();
    const model=modelPayload?.status || {};

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
  }catch(error){
    if(statsBlock){
      statsBlock.innerHTML='<div class="stat">今日ROI<b>-</b></div><div class="stat">今月ROI<b>-</b></div><div class="stat">全期間ROI<b>-</b></div><div class="stat">総収支<b>-</b></div>';
    }
    if(accuracyBlock){
      accuracyBlock.innerHTML='<div class="accuracy-card">精度データを取得できませんでした</div>';
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

async function renderRecommendPanel(){
  const panel=ensureRecommendPanel();
  if(!panel) return;
  try{
    const response=await fetch('/api/recommend/today');
    if(!response.ok) throw new Error('recommend fetch failed');
    const payload=await response.json();
    const strictRows=Array.isArray(payload?.recommendations)?payload.recommendations:[];
    const fallbackRows=Array.isArray(payload?.fallbackRecommendations)?payload.fallbackRecommendations:[];
    const tradableRows=strictRows.filter((row)=>isTradableDecision(row?.decision));
    const isFallback=!strictRows.length && fallbackRows.length>0;
    const modeLabel=$('recommendModeLabel');
    const card=$('todayConclusionCard');
    const list=$('todayRecommendationList');
    if(modeLabel){
      modeLabel.textContent=isFallback?'勝負レースなし':'開催中の場から抽出';
    }
    if(isFallback || !strictRows.length){
      if(card){
        card.innerHTML='<div class="no-race-box">今日は勝負レースなし<br>無理に買わない方がよい日です</div>';
      }
      if(list){
        list.innerHTML='<div class="no-race-box">今日は勝負レースなし</div>';
      }
      return;
    }

    const topRow=strictRows[0] || null;
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
      list.innerHTML=tradableRows.map((row)=>{
        const topValue=row?.valueRanking?.find((item)=>Number(item?.expectedValue || 0) >= 100) || row?.valueRanking?.[0] || null;
        return `<article class="recommend-mini"><div><div class="recommend-mini-main">${escapeHtml(row.venueName||row.venueId||'-')} ${escapeHtml(`${row.raceNo}R`)}</div><div class="recommend-mini-sub">${escapeHtml(topValue?.combo || row.topPick || '-')} / 期待値${escapeHtml(Number(topValue?.expectedValue || row.expectedValue || 0).toFixed(1))}%</div></div><div><span class="decision-chip ${decisionClassName(row.decision)}">${escapeHtml(row.decision || '-')}</span> <span class="ev-chip ${expectedValueClass(topValue?.expectedValue || row.expectedValue)}">${Number(topValue?.expectedValue || row.expectedValue || 0).toFixed(1)}%</span></div></article>`;
      }).join('') || '<div class="no-race-box">今日は勝負レースなし</div>';
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

async function renderImportLogPanel(){
  return;
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

  const aiDecision=$('aiDecision');
  if(aiDecision){
    aiDecision.textContent='公式AI予想';
    aiDecision.className='decision buy';
  }

  setText('favoriteReason', `◎ ${favorite.lane||'-'}号艇`);
  setText('secondReason', `○ ${second.lane||'-'}号艇`);
  setText('darkReason', `▲ ${dark.lane||'-'}号艇`);
  setText('ticketReason', topTicket.combo ? `${topTicket.valueStars || topTicket.rating || ''} 価値No${topTicket.valueRank || '-'} ${topTicket.combo} 期待値${Math.round(Number(topTicket.expectedValue)||0)}%` : (buys.length ? buys.join(' / ') : '-'));
  setText('confidenceReason', `${confidence.toFixed(1)}%`);
  setText('roughRaceReason', roughRace.stars && roughRace.roughLevel ? `${roughRace.stars} ${roughRace.roughLevel}` : '-');
  setText('decisionReason', decision.decision || '-');
  setText('stakeLevelReason', decision.stakeStars || '-');
  const commentEl=$('aiShortComment');
  if(commentEl){
    commentEl.innerHTML=formatMultilineComment(aiComment);
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
      tbody.innerHTML=valueRanking.slice(0, 15).map((item)=>`<tr><td>${item.valueRank||'-'}</td><td><b>${escapeHtml(item.combo||'-')}</b></td><td>${Number(item.probability||0).toFixed(1)}%</td><td>${Number(item.odds||0).toFixed(1)}</td><td>${Math.round(Number(item.expectedValue)||0)}%</td><td class="${Number(item.expectedValue)>=300?'buy':Number(item.expectedValue)>=100?'watch':'skip'}">${escapeHtml(item.valueStars || '-')}</td></tr>`).join('');
    }
  }

  const detailPanel=$('aiDetailPanel');
  if(detailPanel){
    const ticketHtml=valueRanking.slice(0,5).map((item)=>`<p>${escapeHtml(item.valueStars || '')} 価値No${item.valueRank || '-'} ${escapeHtml(item.combo)} / 期待値${Math.round(Number(item.expectedValue)||0)}% / 勝率${Number(item.probability||0).toFixed(1)}%</p>`).join('');
    const strengthsHtml=(Array.isArray(explanation.strengths)?explanation.strengths:[]).map((item)=>`<li>${escapeHtml(item)}</li>`).join('');
    const risksHtml=(Array.isArray(explanation.risks)?explanation.risks:[]).map((item)=>`<li>${escapeHtml(item)}</li>`).join('');
    const roughReasonsHtml=(Array.isArray(roughRace.reasons)?roughRace.reasons:[]).map((item)=>`<li>${escapeHtml(item)}</li>`).join('');
    detailPanel.innerHTML=`<div class="ai-detail-grid">
      <div><strong>◎ 本命</strong><p>${favorite.lane||'-'}号艇 / score ${Number(favorite.score||0).toFixed(1)}</p></div>
      <div><strong>○ 対抗</strong><p>${second.lane||'-'}号艇 / score ${Number(second.score||0).toFixed(1)}</p></div>
      <div><strong>▲ 穴</strong><p>${dark.lane||'-'}号艇 / score ${Number(dark.score||0).toFixed(1)}</p></div>
      <div><strong>価値ランキング</strong>${ticketHtml || `<p>${buys.length ? buys.join(' / ') : '-'}</p>`}</div>
      <div><strong>AIコメント</strong><p>${formatMultilineComment(aiComment)}</p></div>
      <div><strong>強み</strong><ul>${strengthsHtml || '<li>-</li>'}</ul></div>
      <div><strong>不安要素</strong><ul>${risksHtml || '<li>-</li>'}</ul></div>
      <div><strong>推奨</strong><p>${escapeHtml(explanation.recommendation || '-')}</p></div>
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
    return payload.prediction;
  }catch(error){
    console.warn('official predict fetch failed', error);
    return null;
  }
}

async function applyOfficialPredictionIfAvailable(){
  const prediction=await fetchOfficialPrediction();
  if(!prediction){
    state.officialPrediction=null;
    await renderLeaguePanel();
    await renderWeightsPanel();
    await renderOptimizerPanel();
    await renderImportLogPanel();
    await renderBacktestPanel();
    return;
  }
  state.officialPrediction=prediction;
  renderOfficialPrediction(prediction);
  await renderLeaguePanel();
  await renderWeightsPanel();
  await renderOptimizerPanel();
  await renderImportLogPanel();
  await renderBacktestPanel();
}
const today=new Date();
$('todayLabel').textContent=today.toLocaleDateString('ja-JP');

const raceScheduleDefaults={
  '浜名湖': { '1': { start:'10:45', close:'10:20', status:'live', weather:'晴', windDir:'向かい風', windSpeed:2, wave:3 } },
  '戸田': { '1': { start:'10:45', close:'10:20', status:'live', weather:'雨', windDir:'追い風', windSpeed:5, wave:4 } },
  '蒲郡': { '1': { start:'10:40', close:'10:12', status:'live', weather:'晴', windDir:'横風', windSpeed:3, wave:2 } },
  '常滑': { '1': { start:'10:35', close:'10:08', status:'live', weather:'曇', windDir:'向かい風', windSpeed:2, wave:3 } },
  '大村': { '1': { start:'10:30', close:'10:05', status:'live', weather:'晴', windDir:'追い風', windSpeed:4, wave:2 } }
};

// 公式データへ差し替え可能なように、結果は別オブジェクトとして切り分ける。
const resultData={
  '浜名湖': { '1': { isFinal:true, order:'1-2-5', winMethod:'逃げ', payout:'1,230円', confirmedAt:'12:15' } },
  '戸田': {
    '1': { isFinal:true, order:'2-4-6', winMethod:'差し', payout:'1,980円', confirmedAt:'12:20' },
    '2': { isFinal:true, order:'1-3-5', winMethod:'逃げ', payout:'1,760円', confirmedAt:'12:28' },
    '3': { isFinal:true, order:'3-1-6', winMethod:'まくり', payout:'2,140円', confirmedAt:'12:35' },
    '4': { isFinal:true, order:'4-2-7', winMethod:'差し', payout:'1,540円', confirmedAt:'12:42' },
    '5': { isFinal:true, order:'5-1-3', winMethod:'捲り', payout:'2,310円', confirmedAt:'12:49' },
    '6': { isFinal:true, order:'6-2-4', winMethod:'逃げ', payout:'1,870円', confirmedAt:'12:56' },
    '7': { isFinal:true, order:'2-5-1', winMethod:'差し', payout:'1,940円', confirmedAt:'13:03' },
    '8': { isFinal:true, order:'4-1-7', winMethod:'まくり', payout:'2,060円', confirmedAt:'13:10' },
    '9': { isFinal:true, order:'3-6-2', winMethod:'捲り', payout:'1,720円', confirmedAt:'13:17' },
    '10': { isFinal:true, order:'1-4-8', winMethod:'逃げ', payout:'2,220円', confirmedAt:'13:24' },
    '11': { isFinal:true, order:'5-2-6', winMethod:'差し', payout:'1,860円', confirmedAt:'13:31' },
    '12': { isFinal:true, order:'7-3-1', winMethod:'まくり', payout:'2,480円', confirmedAt:'13:38' }
  },
  '蒲郡': { '1': { isFinal:false, order:'', winMethod:'', payout:'', confirmedAt:'' } },
  '常滑': { '1': { isFinal:false, order:'', winMethod:'', payout:'', confirmedAt:'' } },
  '大村': { '1': { isFinal:false, order:'', winMethod:'', payout:'', confirmedAt:'' } }
};
const raceResultDefaults=resultData;

// 公式データへ差し替え可能なように、開催場の今日情報はローカルJSON/定数として扱う。
const venueHomeData=[
  { venue:'戸田', currentRace:4, closeTime:'12:12', weather:'晴', windSpeed:3 },
  { venue:'浜名湖', currentRace:6, closeTime:'13:05', weather:'曇', windSpeed:2 },
  { venue:'蒲郡', currentRace:5, closeTime:'12:45', weather:'雨', windSpeed:4 },
  { venue:'常滑', currentRace:3, closeTime:'11:50', weather:'晴', windSpeed:1 }
];

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
  return resultData[venue]?.[String(raceNo)] || resultData[venue]?.[raceNo] || null;
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
  syncBankrollInput();
  renderRecommendPanel();
  renderVenueHome();
  renderStats();
  const venueDetails=$('venueDetails');
  const toggleVenueDetailsBtn=$('toggleVenueDetailsBtn');
  const saveBankrollBtn=$('saveBankrollBtn');
  const bankrollInput=$('bankrollInput');
  if(venueDetails){
    venueDetails.open=false;
    venueDetails.classList.add('hidden');
  }
  if(toggleVenueDetailsBtn && venueDetails){
    toggleVenueDetailsBtn.onclick=()=>{
      const willShow=venueDetails.classList.contains('hidden');
      venueDetails.classList.toggle('hidden', !willShow);
      venueDetails.open=willShow;
      toggleVenueDetailsBtn.textContent=willShow?'開催場一覧を閉じる':'開催場一覧を開く';
    };
  }
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
  $('backVenue').onclick=()=>{state.venue=null;state.race=null;renderVenueHome();show('venue');updateSteps(1);};
  $('backRace').onclick=()=>{show('race');updateSteps(2);};
  $('sampleBtn').onclick=sample;
  $('calcBtn').onclick=calculate;
  $('saveBtn').onclick=saveRace;
  $('reflectBtn').onclick=reflect;
  $('toggleDetailsBtn').onclick=toggleDetailRows;
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

function renderVenueHome(){
  officialDataService.getTodayVenues().then((items)=>{
    $('venueGrid').innerHTML=items.map(item=>`<button class="venue ${state.venue===item.venue?'active':''}" data-venue="${item.venue}">
      <strong>${item.venue}</strong>
      <span>現在 ${item.currentRace}R</span>
      <span>締切 ${item.closeTime}</span>
      <span>${item.weather} / ${item.windSpeed}m</span>
    </button>`).join('');
    document.querySelectorAll('.venue').forEach(btn=>btn.onclick=()=>selectVenue(btn.dataset.venue));
  });
}

function renderVenues(){
  $('venueGrid').innerHTML=venues.map(v=>`<button class="venue ${state.venue===v?'active':''}">${v}</button>`).join('');
  document.querySelectorAll('.venue').forEach(b=>b.onclick=()=>selectVenue(b.textContent));
}

function selectVenue(v){
  state.venue=v;
  state.race=null;
  $('venueTitle').textContent=`2. ${v} レース一覧`;
  $('venueHint').textContent=`${v}のレースを選択してください。ローカルJSONの出走表データを読み込みます。`;
  $('raceSummary').innerHTML=`<div class="summary-box__title">${v}</div><p class="muted">ローカルJSONのレースデータを利用して、開催場→レース→AI予想の流れを確認できます。</p>`;
  $('raceGrid').innerHTML=Array.from({length:12},(_,i)=>{
    const resultItem=getResultData(v,i+1);
    const badge=resultItem?.isFinal ? '結果確定' : '結果未確定';
    return `<button class="race" data-race="${i+1}"><span class="race-number">${i+1}R</span><span class="race-badge ${resultItem?.isFinal?'final':'pending'}">${badge}</span></button>`;
  }).join('');
  document.querySelectorAll('.race').forEach(btn=>btn.onclick=()=>selectRace(Number(btn.dataset.race)));
  show('race');
  updateSteps(2);
}

async function selectRace(r){
  state.race=r;
  state.raceMeta=await getRaceMeta(state.venue,r);
  $('raceTitle').textContent=`3. ${state.venue} ${r}R レース詳細・AI予想`;
  $('detailWeather').textContent=state.raceMeta.weather;
  $('detailWindDir').textContent=state.raceMeta.windDir;
  $('detailWindSpeed').textContent=`${state.raceMeta.windSpeed}m`;
  $('detailWave').textContent=`${state.raceMeta.wave}cm`;
  $('raceMainTitle').textContent=`${state.venue} ${r}R / 発走 ${state.raceMeta.start} / ${state.raceMeta.result}`;
  $('raceMetaSummary').textContent=`開催地 ${state.venue} / ${state.raceMeta.raceStatusLabel} ${state.raceMeta.close} / 天候 ${state.raceMeta.weather} (${state.raceMeta.weatherSource})`;
  $('weather').value=state.raceMeta.weather;
  $('windDir').value=state.raceMeta.windDir;
  $('windSpeed').value=state.raceMeta.windSpeed;
  $('wave').value=state.raceMeta.wave;
  renderResultSummary();
  renderRaceOverview();
  $('aiDecision').textContent='読み込み中';
  $('aiReason').textContent='出走表データを取得しています。';
  state.entries=await raceEntryStore.load(state.venue,r);
  renderEntryTable();
  renderDetailRows();
  $('probList').innerHTML='';
  $('betsTable').querySelector('tbody').innerHTML='';
  calculate();
  await applyOfficialPredictionIfAvailable();
  show('analysis');
  updateSteps(4);
}

function show(){
  $('venuePanel').classList.remove('hidden');
  $('raceSection').classList.add('hidden');
  $('analysisSection').classList.add('hidden');
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
  const resultRows=isFinal
    ? `<div class="result-summary-item"><span>着順</span><strong>${resultDetails.order || '-'}</strong></div><div class="result-summary-item"><span>決まり手</span><strong>${resultDetails.winMethod || '-'}</strong></div><div class="result-summary-item"><span>払戻金</span><strong>${resultDetails.payout || '-'}</strong></div><div class="result-summary-item"><span>確定時刻</span><strong>${resultDetails.confirmedAt || '-'}</strong></div>`
    : `<div class="result-summary-item"><span>結果</span><strong>${resultLabel}</strong></div>`;
  resultBox.innerHTML=`<div class="result-summary-head"><span class="result-summary-badge ${isFinal?'final':'pending'}">${resultLabel}</span><strong>${state.venue} ${state.race}R</strong></div><div class="result-summary-grid">${resultRows}</div>`;
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
  if(valueReason) valueReason.textContent=`${top.ev.toFixed(0)}`;
  if(confidenceReason) confidenceReason.textContent=`${confidence}%`;
  if(favoriteDetail) favoriteDetail.textContent=favoriteComment || '-';
  if(secondDetail) secondDetail.textContent=secondComment || '-';
  if(riskDetail) riskDetail.textContent=riskComment || '-';
  if(ticketReason) ticketReason.textContent=top.mark;

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
