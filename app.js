let cmaReferenceYear=2024;
let metros=[
{name:'Toronto',pop:7106379,recent:0.0,rank:1},
{name:'Montréal',pop:4615154,recent:0.5,rank:2},
{name:'Vancouver',pop:3108941,recent:0.2,rank:3},
{name:'Calgary',pop:1778881,recent:2.9,rank:4},
{name:'Ottawa–Gatineau',pop:1660269,recent:null,rank:5},
{name:'Edmonton',pop:1631614,recent:3.0,rank:6},
{name:'Winnipeg',pop:941641,recent:1.2,rank:7},
{name:'Québec',pop:900343,recent:null,rank:8},
{name:'Hamilton',pop:860266,recent:null,rank:9},
{name:'Kitchener–Cambridge–Waterloo',pop:696417,recent:null,rank:10}
];

const scenarios={
trend:{label:'Current trend',note:'Uses each CMA’s latest API-loaded annual growth rate where available. Missing rates fall back to 1.0%; Ottawa uses the custom slider.',rates:{}},
balanced:{label:'Balanced',note:'Illustrative convergence toward steady long-run growth rather than assuming one unusual year persists for decades.',rates:{Toronto:1.1,'Montréal':1.0,Vancouver:1.0,Calgary:1.4,Edmonton:1.4,Winnipeg:1.0,'Québec':0.9,Hamilton:1.0,'Kitchener–Cambridge–Waterloo':1.2}},
alberta:{label:'Alberta boom',note:'Illustrative scenario with Calgary and Edmonton sustaining materially stronger growth than the rest of the country.',rates:{Toronto:0.9,'Montréal':0.8,Vancouver:0.8,Calgary:2.2,Edmonton:2.3,Winnipeg:1.0,'Québec':0.8,Hamilton:0.9,'Kitchener–Cambridge–Waterloo':1.0}},
ontario:{label:'Ontario rebound',note:'Illustrative scenario with stronger long-run growth in Toronto, Ottawa, Hamilton and Kitchener–Waterloo.',rates:{Toronto:1.6,'Montréal':0.9,Vancouver:0.9,Calgary:1.3,Edmonton:1.3,Winnipeg:1.0,'Québec':0.8,Hamilton:1.4,'Kitchener–Cambridge–Waterloo':1.6}}
};

const tabs=document.querySelectorAll('.tab');
const panels=document.querySelectorAll('.panel');
const cityCards=document.querySelector('#cityCards');
const metrosEl=document.querySelector('#metros');
const scenarioNote=document.querySelector('#scenarioNote');
const scenarioButtons=document.querySelectorAll('.scenario');
const ottawaGrowth=document.querySelector('#ottawaGrowth');
const ottawaGrowthLabel=document.querySelector('#ottawaGrowthLabel');
const ottawa2050=document.querySelector('#ottawa2050');
const ottawaText=document.querySelector('#ottawaText');
let activeScenario='trend';
let ottawaCustomized=false;

const fmt=n=>new Intl.NumberFormat('en-CA',{maximumFractionDigits:0}).format(Math.round(n));
const compact=n=>new Intl.NumberFormat('en-CA',{notation:'compact',maximumFractionDigits:2}).format(n);
const signedPct=n=>`${n>=0?'+':''}${Number(n).toFixed(1)}%`;
const prettyDate=value=>{
  if(!value)return'';
  const d=new Date(`${value}T12:00:00`);
  return d.toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric'});
};
const project=(pop,rate)=>pop*Math.pow(1+rate/100,Math.max(0,2050-cmaReferenceYear));

function growthClass(v){if(v===null||v===undefined)return'';if(v>=1.5)return'good';if(v>=0.4)return'flat';return'soft'}

function renderCities(){
  cityCards.innerHTML=metros.map(m=>`<div class='city-card'><div class='city-head'><div><div class='city-name'>${m.name}</div><div class='city-rank'>#${m.rank} in ${cmaReferenceYear}</div></div><div class='growth ${growthClass(m.recent)}'>${m.recent===null||m.recent===undefined?'Growth unavailable':signedPct(m.recent)+' y/y'}</div></div><div class='city-pop'>${fmt(m.pop)}</div><div class='city-meta'><span>July 1, ${cmaReferenceYear} population</span><span>${m.recent===null||m.recent===undefined?'Latest rate not available':'Annual change '+signedPct(m.recent)}</span></div></div>`).join('');
}

function rateFor(m){
  if(m.name==='Ottawa–Gatineau')return Number(ottawaGrowth.value);
  if(activeScenario==='trend')return m.recent??1.0;
  return scenarios[activeScenario].rates[m.name]??1.0;
}

function renderScenario(){
  const s=scenarios[activeScenario];
  scenarioNote.textContent=s.note;
  ottawaGrowthLabel.textContent=Number(ottawaGrowth.value).toFixed(1)+'%';
  document.querySelector('#projectionBaseText').textContent=`Starts from the latest loaded July 1, ${cmaReferenceYear} CMA population estimates.`;
  const rows=metros.map(m=>({...m,rate:rateFor(m),p2050:project(m.pop,rateFor(m))})).sort((a,b)=>b.p2050-a.p2050);
  metrosEl.innerHTML=rows.map((m,i)=>`<div class='metro'><div class='name'>#${i+1} &nbsp; ${m.name}</div><div class='value'><span>${cmaReferenceYear} base</span><strong>${compact(m.pop)}</strong></div><div class='value'><span>annual growth</span><strong>${m.rate.toFixed(1)}%</strong></div><div class='value'><span>2050 scenario</span><strong>${compact(m.p2050)}</strong></div></div>`).join('');
  const o=rows.find(m=>m.name==='Ottawa–Gatineau');
  if(o){
    ottawa2050.textContent=compact(o.p2050);
    ottawaText.textContent=`At ${o.rate.toFixed(1)}% annual growth from its ${cmaReferenceYear} population of ${fmt(o.pop)}, Ottawa–Gatineau reaches roughly ${fmt(o.p2050)} in 2050 and ranks #${rows.indexOf(o)+1} in this ten-CMA scenario.`;
  }
}

function updatePopulationPulse(growth){
  const title=document.querySelector('#populationPulseTitle');
  const text=document.querySelector('#populationPulseText');
  const score=document.querySelector('#populationPulseScore');
  if(growth<0){
    title.textContent='Canada’s population edged down in the latest quarter.';
    text.textContent=`The latest official quarterly estimate changed ${signedPct(growth)} from the previous quarter.`;
    score.textContent='Cooling';
  }else if(growth<0.3){
    title.textContent='Canada’s population is growing slowly.';
    text.textContent=`The latest official quarterly estimate increased ${signedPct(growth)} from the previous quarter.`;
    score.textContent='Slow growth';
  }else{
    title.textContent='Canada’s population is growing.';
    text.textContent=`The latest official quarterly estimate increased ${signedPct(growth)} from the previous quarter.`;
    score.textContent='Growing';
  }
}

function applyLiveData(data){
  const canada=data.canada||{};
  const cmas=data.cmas||{};
  const economy=data.economy||{};

  if(Number.isFinite(canada.population)){
    document.querySelector('#canadaPopulation').textContent=fmt(canada.population);
    const growth=Number(canada.quarterlyGrowthPct);
    document.querySelector('#canadaPopulationMeta').textContent=`${prettyDate(canada.populationDate)} · ${Number.isFinite(growth)?signedPct(growth):'—'} q/q`;
    if(Number.isFinite(growth))updatePopulationPulse(growth);
  }

  if(Number.isFinite(cmas.totalPopulation)){
    document.querySelector('#cmaTotal').textContent=fmt(cmas.totalPopulation);
    document.querySelector('#cmaTotalMeta').textContent=`July 1, ${cmas.referenceYear} · ${Number.isFinite(cmas.annualGrowthPct)?signedPct(cmas.annualGrowthPct):'—'} y/y`;
    document.querySelector('#urbanTotal').textContent=compact(cmas.totalPopulation);
    document.querySelector('#urbanYear').textContent=`July 1, ${cmas.referenceYear}`;
    document.querySelector('#urbanHeadline').textContent=`${compact(cmas.totalPopulation)} Canadians live in CMAs`;
  }
  if(Number.isFinite(cmas.sharePct)){
    document.querySelector('#cmaShare').textContent=Number(cmas.sharePct).toFixed(1)+'%';
    document.querySelector('#cmaShareMeta').textContent=`July 1, ${cmas.referenceYear}`;
    document.querySelector('#urbanShare').textContent=Number(cmas.sharePct).toFixed(1)+'%';
  }
  if(Number.isFinite(cmas.count)){
    document.querySelector('#cmaCount').textContent=fmt(cmas.count);
    document.querySelector('#cmaCountMeta').textContent=`Statistics Canada · July 1, ${cmas.referenceYear}`;
    document.querySelector('#urbanCountLabel').textContent=`${fmt(cmas.count)} CMAs`;
  }
  if(Number.isFinite(cmas.annualGrowthPct)){
    document.querySelector('#urbanGrowth').textContent=signedPct(cmas.annualGrowthPct);
    document.querySelector('#urbanGrowthMeta').textContent=`${cmas.previousYear} → ${cmas.referenceYear}`;
  }

  if(Array.isArray(cmas.top10)&&cmas.top10.length>=10){
    cmaReferenceYear=Number(cmas.referenceYear)||cmaReferenceYear;
    metros=cmas.top10.map(row=>({name:row.name,pop:Number(row.population),recent:row.annualGrowthPct===null?null:Number(row.annualGrowthPct),rank:Number(row.rank)}));
    document.querySelector('#cmaSubtitle').textContent=`July 1, ${cmaReferenceYear} population estimates and year-over-year growth, auto-loaded from Statistics Canada.`;
    document.querySelector('#cmaSource').textContent=`Auto-synced from Statistics Canada table 17-10-0148-01 (${cmas.previousYear}–${cmaReferenceYear}).`;
    const ottawa=metros.find(m=>m.name==='Ottawa–Gatineau');
    if(ottawa){
      document.querySelector('#ottawaRank').textContent='#'+ottawa.rank;
      document.querySelector('#ottawaWatchText').textContent=`Population ${fmt(ottawa.pop)} on July 1, ${cmaReferenceYear}; ranked #${ottawa.rank} nationally${ottawa.recent===null?'':`, with ${signedPct(ottawa.recent)} year-over-year growth`}.`;
      if(!ottawaCustomized&&Number.isFinite(ottawa.recent)&&ottawa.recent>=0&&ottawa.recent<=3)ottawaGrowth.value=ottawa.recent.toFixed(1);
    }
  }

  if(Number.isFinite(economy.policyRate)){
    document.querySelector('#policyRate').textContent=Number(economy.policyRate).toFixed(2)+'%';
    document.querySelector('#policyRateMeta').textContent=`Bank of Canada · ${prettyDate(economy.policyRateDate)}`;
  }

  const generated=data.generatedAt?new Date(data.generatedAt):null;
  document.querySelector('#syncStatus').textContent='Official API data loaded';
  document.querySelector('#syncDetail').textContent=`Auto-refresh cache${generated&&!Number.isNaN(generated)?' · synced '+generated.toLocaleString('en-CA',{dateStyle:'medium',timeStyle:'short'}):''}${canada.populationDate?' · Canada '+prettyDate(canada.populationDate):''}${cmas.referenceYear?' · CMAs July '+cmas.referenceYear:''}`;
  renderCities();
  renderScenario();
}

async function loadLiveData(){
  try{
    const response=await fetch(`data/live.json?ts=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    applyLiveData(data);
  }catch(error){
    document.querySelector('#syncStatus').textContent='Using built-in fallback data';
    document.querySelector('#syncDetail').textContent='The live cache could not be loaded. The dashboard still works with its last built-in snapshot.';
    document.querySelector('#syncDot').style.background='#c99019';
    console.warn('Live data unavailable:',error);
  }
}

tabs.forEach(btn=>btn.addEventListener('click',()=>{
  tabs.forEach(b=>b.classList.remove('active'));
  panels.forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  document.querySelector('#'+btn.dataset.tab).classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}));

scenarioButtons.forEach(btn=>btn.addEventListener('click',()=>{
  activeScenario=btn.dataset.scenario;
  scenarioButtons.forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(activeScenario==='ontario'&&!ottawaCustomized)ottawaGrowth.value=1.6;
  renderScenario();
}));

ottawaGrowth.addEventListener('input',()=>{ottawaCustomized=true;renderScenario();});
renderCities();
renderScenario();
loadLiveData();
