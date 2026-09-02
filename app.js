const metros=[
{name:'Toronto',pop2024:7106379,recent:0.0,note:'2024→25: ~0.0%',rank2024:1},
{name:'Montréal',pop2024:4615154,recent:0.5,note:'2024→25: +0.5%',rank2024:2},
{name:'Vancouver',pop2024:3108941,recent:0.2,note:'2024→25: +0.2%',rank2024:3},
{name:'Calgary',pop2024:1778881,recent:2.9,note:'2024→25: +2.9%',rank2024:4},
{name:'Ottawa–Gatineau',pop2024:1660269,recent:null,note:'2024 baseline',rank2024:5},
{name:'Edmonton',pop2024:1631614,recent:3.0,note:'2024→25: +3.0%',rank2024:6},
{name:'Winnipeg',pop2024:941641,recent:1.2,note:'Manitoba CMA total +1.2%',rank2024:7},
{name:'Québec',pop2024:900343,recent:null,note:'2024 baseline',rank2024:8},
{name:'Hamilton',pop2024:860266,recent:null,note:'2024 baseline',rank2024:9},
{name:'Kitchener–Waterloo',pop2024:696417,recent:null,note:'2024 baseline',rank2024:10}
];
const scenarios={
trend:{label:'Current trend',note:'Carries forward the latest published 2024–25 growth signal where available. Missing city rates use 1.0%; Ottawa uses your custom slider.',rates:{Toronto:0.0,'Montréal':0.5,Vancouver:0.2,Calgary:2.9,Edmonton:3.0,Winnipeg:1.2,'Québec':1.0,Hamilton:1.0,'Kitchener–Waterloo':1.0}},
balanced:{label:'Balanced',note:'Illustrative convergence toward steady long-run growth rather than assuming the unusual 2024–25 rates persist for decades.',rates:{Toronto:1.1,'Montréal':1.0,Vancouver:1.0,Calgary:1.4,Edmonton:1.4,Winnipeg:1.0,'Québec':0.9,Hamilton:1.0,'Kitchener–Waterloo':1.2}},
alberta:{label:'Alberta boom',note:'Illustrative scenario with Calgary and Edmonton sustaining materially stronger growth than the rest of the country.',rates:{Toronto:0.9,'Montréal':0.8,Vancouver:0.8,Calgary:2.2,Edmonton:2.3,Winnipeg:1.0,'Québec':0.8,Hamilton:0.9,'Kitchener–Waterloo':1.0}},
ontario:{label:'Ontario rebound',note:'Illustrative scenario with stronger long-run growth in Toronto, Ottawa, Hamilton and Kitchener–Waterloo.',rates:{Toronto:1.6,'Montréal':0.9,Vancouver:0.9,Calgary:1.3,Edmonton:1.3,Winnipeg:1.0,'Québec':0.8,Hamilton:1.4,'Kitchener–Waterloo':1.6}}
};
const tabs=document.querySelectorAll('.tab'),panels=document.querySelectorAll('.panel'),cityCards=document.querySelector('#cityCards'),metrosEl=document.querySelector('#metros'),scenarioNote=document.querySelector('#scenarioNote'),scenarioButtons=document.querySelectorAll('.scenario'),ottawaGrowth=document.querySelector('#ottawaGrowth'),ottawaGrowthLabel=document.querySelector('#ottawaGrowthLabel'),ottawa2050=document.querySelector('#ottawa2050'),ottawaText=document.querySelector('#ottawaText');
let activeScenario='trend';
const fmt=n=>new Intl.NumberFormat('en-CA',{maximumFractionDigits:0}).format(Math.round(n));
const compact=n=>new Intl.NumberFormat('en-CA',{notation:'compact',maximumFractionDigits:2}).format(n);
const project=(pop,rate)=>pop*Math.pow(1+rate/100,26);
function growthClass(v){if(v===null)return'';if(v>=1.5)return'good';if(v>=0.4)return'flat';return'soft'}
function renderCities(){cityCards.innerHTML=metros.map(m=>`<div class='city-card'><div class='city-head'><div><div class='city-name'>${m.name}</div><div class='city-rank'>#${m.rank2024} in 2024</div></div><div class='growth ${growthClass(m.recent)}'>${m.note}</div></div><div class='city-pop'>${fmt(m.pop2024)}</div><div class='city-meta'><span>July 1, 2024 population</span>${m.recent!==null?`<span>Latest growth signal ${m.recent>=0?'+':''}${m.recent.toFixed(1)}%</span>`:'<span>Latest rate not shown</span>'}</div></div>`).join('')}
function rateFor(m){if(m.name==='Ottawa–Gatineau')return Number(ottawaGrowth.value);return scenarios[activeScenario].rates[m.name]??1.0}
function renderScenario(){const s=scenarios[activeScenario];scenarioNote.textContent=s.note;ottawaGrowthLabel.textContent=Number(ottawaGrowth.value).toFixed(1)+'%';const rows=metros.map(m=>({...m,rate:rateFor(m),p2050:project(m.pop2024,rateFor(m))})).sort((a,b)=>b.p2050-a.p2050);metrosEl.innerHTML=rows.map((m,i)=>`<div class='metro'><div class='name'>#${i+1} &nbsp; ${m.name}</div><div class='value'><span>2024 base</span><strong>${compact(m.pop2024)}</strong></div><div class='value'><span>annual growth</span><strong>${m.rate.toFixed(1)}%</strong></div><div class='value'><span>2050 scenario</span><strong>${compact(m.p2050)}</strong></div></div>`).join('');const o=rows.find(m=>m.name==='Ottawa–Gatineau');ottawa2050.textContent=compact(o.p2050);ottawaText.textContent=`At ${o.rate.toFixed(1)}% annual growth from its 2024 population of ${fmt(o.pop2024)}, Ottawa–Gatineau reaches roughly ${fmt(o.p2050)} in 2050 and ranks #${rows.indexOf(o)+1} in this ten-CMA scenario.`}
tabs.forEach(btn=>btn.addEventListener('click',()=>{tabs.forEach(b=>b.classList.remove('active'));panels.forEach(p=>p.classList.remove('active'));btn.classList.add('active');document.querySelector('#'+btn.dataset.tab).classList.add('active');window.scrollTo({top:0,behavior:'smooth'})}));
scenarioButtons.forEach(btn=>btn.addEventListener('click',()=>{activeScenario=btn.dataset.scenario;scenarioButtons.forEach(b=>b.classList.remove('active'));btn.classList.add('active');if(activeScenario==='ontario'&&Number(ottawaGrowth.value)===1.2)ottawaGrowth.value=1.6;renderScenario()}));
ottawaGrowth.addEventListener('input',renderScenario);
renderCities();renderScenario();