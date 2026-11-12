const KEY='five-wordgame-v5-round-score';
const TARGETS=[[250,450,750],[600,950,1400],[1100,1700,2500],[2000,3000,4500],[3600,5500,8000]];
// From Stage 6 onward, use the Stage 5 targets as the baseline and grow ~75%
// per stage, retaining the intended dip from each boss to the next stage opener.
function targetForRound(index){
 const stage=Math.floor(index/3), phase=index%3;
 if(stage<TARGETS.length)return TARGETS[stage][phase];
 return Math.round(TARGETS[4][phase]*Math.pow(1.75,stage-4)/25)*25;
}
const GREEN_CHIPS=[100,60,35,20,10,5],YELLOW_CHIPS=[40,24,14,8,4,2],EARLY_MULT=[6,4,3,2,1.5,1];
const board=document.getElementById('board'),keyboard=document.getElementById('keyboard'),toast=document.getElementById('toast');
let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{}
let stats=saved.stats||{played:0,wins:0,streak:0,maxStreak:0};
let solution=saved.solution&&ANSWERS.includes(saved.solution.toLowerCase())?saved.solution.toUpperCase():ANSWERS[Math.floor(Math.random()*ANSWERS.length)].toUpperCase();
let guesses=Array.isArray(saved.guesses)?saved.guesses.filter(x=>typeof x==='string'&&x.length===5).slice(0,6):[];
let current='',busy=false,done=guesses.includes(solution)||guesses.length>=6;
let roundTotal=Number(saved.roundTotal)||0;
let roundPaid=Boolean(saved.roundPaid);
let gold=Math.max(0,Number(saved.gold)||0);
let lastGoldBreakdown=saved.lastGoldBreakdown||null;
// Saved as tier levels 0–5. Convert any old additive-Chip saves from the prototype.
let upgrades=(saved.upgrades&&typeof saved.upgrades==='object')?saved.upgrades:{};
const LETTER_LEVELS=[
 {name:'Base',chips:0,price:0,color:'#405161',ink:'#f5f3ea'},
 {name:'Silver',chips:20,price:3,color:'#bac4d2',ink:'#1e303d'},
 {name:'Gold',chips:40,price:5,color:'#e5bd60',ink:'#3b3019'},
 {name:'Emerald',chips:70,price:8,color:'#62c9a0',ink:'#133f32'},
 {name:'Diamond',chips:120,price:12,color:'#9bd8ed',ink:'#183f59'},
 {name:'Platinum',chips:200,price:18,color:'#d6bdf3',ink:'#402857'}
];
const oldSaveStyle=Object.values(upgrades).some(v=>Number(v)>5);
for(const letter of Object.keys(upgrades)){
 const v=Number(upgrades[letter])||0;
 upgrades[letter]=oldSaveStyle ? (v>=200?5:v>=120?4:v>=70?3:v>=40?2:v>=20?1:0) : Math.min(5,Math.max(0,Math.floor(v)));
}
const upgradeChips=letter=>LETTER_LEVELS[upgrades[letter]||0].chips;

let shopOffers=Array.isArray(saved.shopOffers)?saved.shopOffers.filter(o=>o&&typeof o.letter==='string'&&Number.isInteger(o.level)&&o.level>=1&&o.level<=5):[];
let shopOpened=Boolean(saved.shopOpened);
// Original collectible cards: simple art, two shop offers, up to three equipped.
const JOKER_CARDS=[
 {id:'vowel',name:'Vowel Vault',rarity:'common',price:5,art:'vault',description:'×1.25 Mult for every vowel in the solved word.',type:'mult'},
 {id:'consonant',name:'Consonant Cache',rarity:'common',price:5,art:'cache',description:'×1.15 Mult for every consonant in the solved word.',type:'mult'},
 {id:'thumb',name:'Green Thumb',rarity:'common',price:4,art:'sprout',description:'+60 Chips per green tile in your first guess.',type:'chips'},
 {id:'yellow',name:'Yellow Fellow',rarity:'common',price:4,art:'sun',description:'+40 Chips per yellow tile in your first guess.',type:'chips'},
 {id:'early',name:'Early Bird',rarity:'common',price:5,art:'bird',description:'×1.5 Mult when solved within 3 guesses.',type:'mult'},
 {id:'soup',name:'Alphabet Soup',rarity:'common',price:5,art:'soup',description:'×1.5 Mult if the answer has 5 unique letters.',type:'mult'},
 {id:'double',name:'Double Trouble',rarity:'common',price:5,art:'duplicate',description:'×1.6 Mult if the answer contains a repeated letter.',type:'mult'},
 {id:'impression',name:'First Impression',rarity:'common',price:5,art:'stamp',description:'+150 Chips if your first guess has at least 2 green tiles.',type:'chips'},
 {id:'pig',name:'Piggy Bank',rarity:'common',price:4,art:'pig',description:'+1 Gold after every successful round.',type:'gold'},
 {id:'payout',name:'Bonus Payout',rarity:'common',price:5,art:'coins',description:'+2 Gold if you solve within 3 guesses.',type:'gold'},
 {id:'swift',name:'Quick Draw',rarity:'uncommon',price:7,art:'bolt',description:'×2 Mult when solved within 2 guesses.',type:'mult'},
 {id:'loyalty',name:'Letter Loyalty',rarity:'uncommon',price:8,art:'shield',description:'+120 Chips for each upgraded letter in the solved word.',type:'chips'},
 {id:'perfect',name:'Perfect Start',rarity:'uncommon',price:8,art:'target',description:'×2 Mult if the first guess has no gray tiles.',type:'mult'},
 {id:'ratio',name:'Golden Ratio',rarity:'uncommon',price:7,art:'spiral',description:'×2 Mult if the solved word has exactly 2 vowels.',type:'mult'},
 {id:'green',name:'Green Machine',rarity:'uncommon',price:8,art:'gear',description:'×1.25 Mult per green tile in the solved word.',type:'mult'},
 {id:'weaver',name:'Word Weaver',rarity:'uncommon',price:8,art:'thread',description:'×1.8 Mult if 3+ letters in the solved word are upgraded.',type:'mult'},
 {id:'goose',name:'Golden Goose',rarity:'uncommon',price:8,art:'egg',description:'+1 Gold per upgraded letter in the solved word (maximum +5).',type:'gold'},
 {id:'boss',name:'Boss Bonus',rarity:'uncommon',price:8,art:'flag',description:'+4 Gold when you defeat a boss round.',type:'gold'},
 {id:'down',name:'Double Down',rarity:'rare',price:11,art:'stack',description:'×2.5 Mult if solved within 3 guesses.',type:'mult'},
 {id:'royal',name:'Royal Flush',rarity:'rare',price:11,art:'crown',description:'×2.5 Mult if at least 3 letters in the solved word are upgraded.',type:'mult'},
 {id:'kingdom',name:'Vowel Kingdom',rarity:'rare',price:10,art:'castle',description:'×2.5 Mult if the solved word contains 3+ vowels.',type:'mult'},
 {id:'house',name:'Full House',rarity:'rare',price:11,art:'house',description:'×2.5 Mult if the answer contains 5 unique letters.',type:'mult'},
 {id:'map',name:'Treasure Map',rarity:'rare',price:10,art:'map',description:'First purchase in each shop costs 2 less Gold.',type:'discount'},
 {id:'crown',name:'The Crown',rarity:'legendary',price:16,art:'crown',description:'×3 Mult on every solved word.',type:'mult'},
 {id:'midas',name:'Midas Touch',rarity:'legendary',price:18,art:'hand',description:'×1.5 Mult per upgraded letter in the solved word.',type:'mult'}
];
const CARD_RARITY=[['common',50],['uncommon',30],['rare',15],['legendary',5]];
// All artwork is tiny original, flat SVG; no remote images or dependencies.
const ART={
 vault:'<rect x="13" y="16" width="54" height="47" rx="7"/><circle cx="40" cy="39" r="13"/><circle cx="40" cy="39" r="3"/><path d="M40 42v5"/>',
 cache:'<path d="M13 29 40 17l27 12v29L40 71 13 58Z"/><path d="m13 29 27 12 27-12M40 41v30"/>',
 sprout:'<path d="M40 68V35M40 48C22 48 19 35 20 27c16-1 20 7 20 21ZM40 39c0-17 13-22 23-22 1 13-8 22-23 22Z"/>',
 sun:'<circle cx="40" cy="40" r="15"/><path d="M40 10v8M40 62v8M10 40h8M62 40h8M19 19l6 6m30 30 6 6m0-42-6 6M25 55l-6 6"/>',
 bird:'<path d="M15 48q18-34 39-6l12-6-7 14q-20 21-40-2Z"/><circle cx="52" cy="39" r="2" fill="currentColor" stroke="none"/><path d="m26 50-3 12m8-10 2 10M18 33q13-4 20 9"/>',
 soup:'<path d="M12 41h56q-2 26-28 27T12 41ZM9 38h62M24 24q-8 8 0 14m16-18q-8 8 0 17m16-13q-8 8 0 14"/>',
 duplicate:'<rect x="12" y="22" width="35" height="37" rx="5"/><rect x="32" y="27" width="35" height="37" rx="5"/><path d="M23 32h12m-6-6v13M43 43h12m-6-6v13"/>',
 stamp:'<path d="M31 12h18l-4 19 14 11v13H21V42l14-11Z"/><path d="M17 61h46M13 69h54"/>',
 pig:'<path d="M17 42q-3-12 3-20l11 5q24-11 36 9l7 1v13l-9 2-6 9h-7l-3-5H32l-3 5h-7l-2-12-7-3Z"/><circle cx="57" cy="37" r="2" fill="currentColor" stroke="none"/>',
 coins:'<ellipse cx="30" cy="52" rx="18" ry="7"/><path d="M12 52v10q18 14 36 0V52"/><ellipse cx="49" cy="32" rx="18" ry="7"/><path d="M31 32v12q18 14 36 0V32"/>',
 bolt:'<path d="M45 12 20 44h19l-4 25 27-37H43Z"/>',
 shield:'<path d="M40 10 66 20v18q0 21-26 33Q14 59 14 38V20Z"/><path d="m28 42 9 9 17-21"/>',
 target:'<circle cx="40" cy="40" r="29"/><circle cx="40" cy="40" r="18"/><circle cx="40" cy="40" r="6"/><path d="m39 40 25-25"/>',
 spiral:'<path d="M12 15h56v52H12Zm0 29h33V15M45 44h23M45 44v23m0-23q-16-1-16 12 0 8 9 8 7 0 7-7 0-5-5-5"/>',
 gear:'<path d="m35 10 10 0 3 9 9 3 8-4 7 9-6 8 0 10 6 8-7 9-8-4-9 3-3 9H35l-3-9-9-3-8 4-7-9 6-8V35l-6-8 7-9 8 4 9-3Z"/><circle cx="40" cy="40" r="13"/>',
 thread:'<rect x="19" y="12" width="42" height="56" rx="5"/><path d="M19 29h42M19 49h42M29 12v56m21-56v56M14 20l52 41m0-41L14 61"/>',
 egg:'<path d="M40 12c-16 0-25 22-25 38a25 25 0 0 0 50 0c0-16-9-38-25-38Z"/><path d="M29 49q11-9 22 0"/>',
 flag:'<path d="M20 70V13m0 2q13-9 26 0t24 0v31q-12 8-24 0t-26 0"/><path d="m39 30 7-7 7 7-3 10H42Z"/>',
 stack:'<rect x="17" y="27" width="46" height="40" rx="5"/><path d="M25 20h46v39M9 35v40h46"/><path d="m29 45 22 0m-11-11v22"/>',
 crown:'<path d="m12 26 13 11 15-23 15 23 13-11-7 35H19Z"/><path d="M17 67h46M23 51h34"/>',
 castle:'<path d="M15 68V27h14v10h22V27h14v41ZM11 27V16h18v11m22 0V16h18v11M33 68V53h14v15"/>',
 house:'<path d="M10 39 40 15l30 24v28H10Z"/><path d="M32 67V47h16v20M19 42h8m26 0h8"/>',
 map:'<path d="m10 20 20-8 20 8 20-8v48l-20 8-20-8-20 8Z"/><path d="M30 12v48m20-40v48M19 35q10-13 22 2t19-1m-7 15 13 13m0-13L53 64"/>',
 hand:'<path d="M23 70q-14-8-11-19l5-5 15 7V25q0-8 7-8t7 8v13q1-7 8-6 6 1 5 8 6-4 10 1 4 4 1 10 4 1 4 7-1 12-14 18Z"/>',
};
function cardArt(card){return `<svg viewBox="0 0 80 80" role="img" aria-label="${card.name} illustration" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${ART[card.art]||ART.vault}</g></svg>`;}
function cardFace(card){return `<div class="collectible rarity-${card.rarity}" data-card-id="${card.id}" tabindex="0" role="img" aria-label="${card.name}. ${card.description}"><span class="card-name">${card.name}</span><div class="card-art">${cardArt(card)}</div><div class="card-mark">✦</div><div class="card-tooltip"><strong>${card.name}</strong><span>${card.rarity.toUpperCase()}</span><p>${card.description}</p></div></div>`;}
// V10: Displayed 1× is V9's 2×, so timing uses 2 / 3 / 4 as effective speeds.
// Saved settings remain the user-facing 1 / 1.5 / 2 values for compatibility.
const savedAnimationSpeed=[1,1.5,2].includes(Number(saved.animationSpeed))?Number(saved.animationSpeed):1;
let animationSpeed=savedAnimationSpeed * 2;
document.documentElement.style.setProperty('--play-speed',String(animationSpeed));
const speedSelect=document.getElementById('animation-speed');
speedSelect.value=String(savedAnimationSpeed);
function updateAnimationSpeed(){
 animationSpeed=Number(speedSelect.value)*2;
 document.documentElement.style.setProperty('--play-speed',String(animationSpeed));
 speedSelect.setAttribute('aria-valuetext',speedSelect.value+' times speed');
 save();
}
speedSelect.addEventListener('input',updateAnimationSpeed);
speedSelect.setAttribute('aria-valuetext',speedSelect.value+' times speed');
let lastScoreBreakdown=saved.lastScoreBreakdown||null;
let jokers=Array.isArray(saved.jokers)?saved.jokers.filter(id=>JOKER_CARDS.some(j=>j.id===id)).slice(0,3):[];
let jokerOffers=Array.isArray(saved.jokerOffers)?saved.jokerOffers.filter(id=>JOKER_CARDS.some(j=>j.id===id)&&!jokers.includes(id)).slice(0,2):[];
let shopDiscountUsed=Boolean(saved.shopDiscountUsed);
// Track actual paid prices, including discounts, for fair 40% resale.
let cardPaidPrices=(saved.cardPaidPrices && typeof saved.cardPaidPrices==='object')?saved.cardPaidPrices:{};
for(const id of jokers){if(!Number.isFinite(cardPaidPrices[id]))cardPaidPrices[id]=cardOf(id).price;}
const resaleValue=id=>Math.floor(Math.max(0,cardPaidPrices[id]??cardOf(id).price)*0.4);
function renderShopOwned(){
 const count=document.getElementById('shop-owned-count'),list=document.getElementById('shop-owned-list');
 count.textContent=jokers.length+' / 3 equipped';
 list.innerHTML=jokers.length?jokers.map(id=>{
   const card=cardOf(id);
   return `<div class="shop-owned-item">${cardFace(card)}${orderControls(id)}<button class="sell-card-button" data-sell-card="${id}" aria-label="Sell ${card.name} for ${resaleValue(id)} gold">Sell · +${resaleValue(id)} G</button></div>`;
 }).join(''):'<div class="owned-empty">No cards equipped yet. Buy a card above to fill a slot.</div>';
}
function orderControls(id){return '';}
function moveCard(id,direction){
 // Order is locked while a guess scores, but freely editable between guesses and in shop.
 if(busy)return;
 const index=jokers.indexOf(id),next=index+direction;
 if(index<0||next<0||next>=jokers.length)return;
 [jokers[index],jokers[next]]=[jokers[next],jokers[index]];
 renderJokers();renderShopOwned();save();
}
function sellCard(id){
 // Selling is shop-only; never change active effects during a scoring animation.
 if(document.getElementById('shop-modal').hidden||busy||!jokers.includes(id))return;
 gold+=resaleValue(id);
 jokers=jokers.filter(x=>x!==id);
 delete cardPaidPrices[id];
 // A sold card is removed from the current equipped set, but the shop offers remain unchanged.
 renderJokers();shopRender();updateScore();save();
}
document.getElementById('shop-owned-list').addEventListener('click',event=>{
 const move=event.target.closest('[data-move-card]');if(move){moveCard(move.dataset.moveCard,Number(move.dataset.direction));return;}
 const button=event.target.closest('[data-sell-card]');
 if(button)sellCard(button.dataset.sellCard);
});

function cardOf(id){return JOKER_CARDS.find(j=>j.id===id)}
function renderJokers(){
 
 document.getElementById('joker-strip').innerHTML=jokers.map(id=>`<div class="rack-card">${cardFace(cardOf(id))}${orderControls(id)}</div>`).join('')+Array.from({length:3-jokers.length},()=>'<div class="card-slot-empty" aria-label="Empty card slot">+</div>').join('');
}
document.getElementById('joker-strip').addEventListener('click',event=>{
 const move=event.target.closest('[data-move-card]');if(move)moveCard(move.dataset.moveCard,Number(move.dataset.direction));
});
function pickJokerOffers(){
 const pool=JOKER_CARDS.filter(j=>!jokers.includes(j.id));jokerOffers=[];
 for(let i=0;i<2&&pool.length;i++){
  let r=Math.random()*CARD_RARITY.reduce((s,x)=>s+x[1]*(pool.some(c=>c.rarity===x[0])?1:0),0);
  let rarity=pool[0].rarity;
  for(const [tier,w] of CARD_RARITY){if(!pool.some(c=>c.rarity===tier))continue;r-=w;if(r<=0){rarity=tier;break}}
  const eligible=pool.filter(c=>c.rarity===rarity);const card=eligible[Math.floor(Math.random()*eligible.length)];
  jokerOffers.push(card.id);pool.splice(pool.findIndex(c=>c.id===card.id),1);
 }
}
function discount(price){return jokers.includes('map')&&!shopDiscountUsed?Math.max(0,price-2):price}
function renderJokerOffer(){
 const area=document.getElementById('joker-offer');
 area.innerHTML=jokerOffers.map(id=>{
  const j=cardOf(id),cost=discount(j.price),canBuy=jokers.length<3&&gold>=cost;
  return `<div class="card-shop-item">${cardFace(j)}<button data-buy-joker="${id}" ${canBuy?'':'disabled'}>${jokers.length>=3?'Slots full':cost+' G'}</button></div>`;
 }).join('') || '<small>No more cards available.</small>';
}
document.getElementById('joker-offer').addEventListener('click',e=>{
 const b=e.target.closest('[data-buy-joker]');if(!b)return;
 const id=b.dataset.buyJoker,j=cardOf(id);if(!j||!jokerOffers.includes(id)||jokers.length>=3||gold<discount(j.price))return;
 const paid=discount(j.price);gold-=paid;if(jokers.includes('map'))shopDiscountUsed=true;
 cardPaidPrices[id]=paid;jokers.push(id);jokerOffers=jokerOffers.filter(x=>x!==id);
 shopRender();updateScore();renderJokers();save();
});
function cardEffects(word,guessIndex){
 const first=guesses[0]?evaluate(guesses[0]):[];
 const greens=first.filter(x=>x==='correct').length,yellows=first.filter(x=>x==='present').length;
 const vowelCount=[...word].filter(l=>'AEIOU'.includes(l)).length;
 const upgradeCount=[...word].filter(l=>(upgrades[l]||0)>0).length;
 const unique=new Set(word).size;
 return jokers.map(id=>{
  let chips=0,mult=1,goldExtra=0;switch(id){
   case 'vowel':mult=1.25**vowelCount;break;
   case 'consonant':mult=1.15**(5-vowelCount);break;
   case 'thumb':chips=60*greens;break;
   case 'yellow':chips=40*yellows;break;
   case 'early':if(guessIndex<=2)mult=1.5;break;
   case 'soup':if(unique===5)mult=1.5;break;
   case 'double':if(unique<5)mult=1.6;break;
   case 'impression':if(greens>=2)chips=150;break;
   case 'pig':goldExtra=1;break;
   case 'payout':if(guessIndex<=2)goldExtra=2;break;
   case 'swift':if(guessIndex<=1)mult=2;break;
   case 'loyalty':chips=120*upgradeCount;break;
   case 'perfect':if(first.length&&first.every(x=>x!=='absent'))mult=2;break;
   case 'ratio':if(vowelCount===2)mult=2;break;
   case 'green':mult=1.25**5;break;
   case 'weaver':if(upgradeCount>=3)mult=1.8;break;
   case 'goose':goldExtra=Math.min(5,upgradeCount);break;
   case 'boss':if(roundIndex%3===2)goldExtra=4;break;
   case 'down':if(guessIndex<=2)mult=2.5;break;
   case 'royal':if(upgradeCount>=3)mult=2.5;break;
   case 'kingdom':if(vowelCount>=3)mult=2.5;break;
   case 'house':if(unique===5)mult=2.5;break;
   case 'crown':mult=3;break;
   case 'midas':mult=1.5**upgradeCount;break;
  }
  return {id,chips,mult,goldExtra,active:chips>0||mult!==1||goldExtra>0};
 });
}
// Approximate letter frequency groups for familiar 5-letter English words. Sampling is
// weighted per LETTER; the tiers below are intentionally moderated for variety.
const SHOP_TIERS=[
 {letters:'ETAOIRNSL',weight:5,label:'Common'},
 {letters:'UCDPMHGBFY',weight:3,label:'Uncommon'},
 {letters:'WKVXZQJ',weight:1,label:'Rare'}
];
function randomShopLetter(excluded){
 const pool=SHOP_TIERS.flatMap(t=>[...t.letters]
  .filter(letter=>!excluded.has(letter)&&(upgrades[letter]||0)<5)
  .map(letter=>({letter,weight:t.weight,frequency:t.label})));
 if(!pool.length)return null;
 let r=Math.random()*pool.reduce((sum,o)=>sum+o.weight,0);
 for(const o of pool){r-=o.weight;if(r<=0)return o}return pool.at(-1);
}
function generateShop(){
 const used=new Set();shopOffers=[];
 for(let i=0;i<3;i++){
  const pick=randomShopLetter(used);if(!pick)break;
  used.add(pick.letter);
  const level=(upgrades[pick.letter]||0)+1;
  shopOffers.push({...pick,level,bought:false});
 }
 shopOpened=false;pickJokerOffers();
}
function renderGoldBreakdown(){
 const box=document.getElementById('gold-breakdown');
 const detail=lastGoldBreakdown;
 if(!detail || detail.roundIndex!==roundIndex || !lastRoundPassed){box.hidden=true;box.innerHTML='';return;}
 const entries=[['Round completion',detail.base],['Early solve (guess '+detail.guess+')',detail.early],['Score bonus',detail.performance],...detail.cardRewards.map(c=>[c.name,c.amount])];
 box.innerHTML='<h3>GOLD EARNED THIS ROUND</h3>'+entries.map(([name,value])=>`<div class="gold-line"><span>${name}</span><span>+${value} G</span></div>`).join('')+`<div class="gold-line gold-total-line"><span>TOTAL EARNED</span><span>+${detail.total} G</span></div>`;
 box.hidden=false;
}
function renderScoreBreakdown(){
 const box=document.getElementById('score-breakdown'),detail=lastScoreBreakdown;
 if(!detail||detail.roundIndex!==roundIndex||!lastRoundPassed){box.hidden=true;box.innerHTML='';return;}
 const format=n=>Math.round(n).toLocaleString();
 const rows=[['Base green/yellow Chips',`+${format(detail.baseTiles)}`],['Letter upgrade Chips',`+${format(detail.upgradeTiles)}`],
 ...detail.effects.map(x=>[x.name,x.type==='chips'?`+${format(x.value)} → ${format(x.after)}`:`×${Number(x.value.toFixed(3))} → ${format(x.after)}`]),
 [`Early solve (guess ${detail.guess})`,`×${detail.early} → ${format(detail.total)}`]];
 box.innerHTML='<h3>SCORE BREAKDOWN THIS ROUND</h3>'+rows.map(([name,val])=>`<div class="score-line"><span>${name}</span><span>${val}</span></div>`).join('')+`<div class="score-line score-total-line"><span>FINAL SCORE</span><span>${format(detail.total)}</span></div>`;
 box.hidden=false;
}
function shopRender(){
 renderGoldBreakdown();renderScoreBreakdown();
 const reroll=document.getElementById('reroll-shop');
 if(reroll){reroll.disabled=gold<3;reroll.textContent=gold<3?'↻ Reroll · 3 G (not enough gold)':'↻ Reroll · 3 G';}
 document.getElementById('shop-gold').textContent=gold;
 renderJokerOffer();renderShopOwned();
 document.getElementById('shop-offers').innerHTML=shopOffers.map((o,i)=>{
   const level=LETTER_LEVELS[o.level];
   const cost=discount(level.price);const canBuy=!o.bought && gold>=cost && (upgrades[o.letter]||0)===o.level-1;
   return `<div class="shop-card ${o.bought?'purchased':''}" style="--tier-color:${level.color};--tier-ink:${level.ink}">
      <div class="shop-letter" aria-label="${level.name} ${o.letter}">${o.letter}</div>
      <h3>${level.name}</h3>
      <small>+${level.chips} Chips when ${o.letter} scores</small>
      <small>${o.level===1?'Base':LETTER_LEVELS[o.level-1].name} → ${level.name}</small>
      <button data-buy="${i}" ${canBuy?'':'disabled'}>${o.bought?'Purchased':gold<cost?cost+' G':!canBuy?'Unavailable':cost+' G'}</button>
    </div>`;
 }).join('') || '<p class="shop-empty">Every letter is fully upgraded!</p>';
}
function openShop(){if(!lastRoundPassed||runEnded)return;
 if(!shopOffers.length)generateShop();else if(!jokerOffers.length&&!shopOpened)pickJokerOffers();shopOpened=true;shopRender();document.getElementById('shop-modal').hidden=false;save()}
function buyUpgrade(index){
 const o=shopOffers[index];if(!o||o.bought)return;
 const level=LETTER_LEVELS[o.level];
 if(!level || gold<discount(level.price) || (upgrades[o.letter]||0)!==o.level-1)return;
 gold-=discount(level.price);if(jokers.includes('map'))shopDiscountUsed=true;
 upgrades[o.letter]=o.level;
 o.bought=true;
 shopRender();updateScore();styleKeyboardUpgrades();save();
}
function styleKeyboardUpgrades(){
 for(const key of keyboard.querySelectorAll('.key')){
  const letter=key.dataset.key;
  const lvl=upgrades[letter]||0;
  key.classList.toggle('upgraded',lvl>0);
  key.classList.remove('tier-silver','tier-gold','tier-emerald','tier-diamond','tier-platinum');
  key.style.removeProperty('--upgrade-bg');key.style.removeProperty('--upgrade-ink');key.style.removeProperty('--upgrade-border');key.style.removeProperty('--upgrade-glow');
  if(lvl>0){
   const tier=LETTER_LEVELS[lvl];
   key.classList.add('tier-'+tier.name.toLowerCase());
   key.style.setProperty('--upgrade-bg',tier.color);
   key.style.setProperty('--upgrade-ink',tier.ink);
   key.style.setProperty('--upgrade-border',tier.color);
   key.style.setProperty('--upgrade-glow',tier.color+'65');
   key.title='';key.dataset.bonus=`+${tier.chips} CHIPS`;
   key.setAttribute('aria-label',`${letter}, ${tier.name} upgrade, plus ${tier.chips} Chips`);
  }else{key.title='';delete key.dataset.bonus;key.setAttribute('aria-label',letter)}
 }
}
document.getElementById('reroll-shop').addEventListener('click',()=>{
 if(document.getElementById('shop-modal').hidden||gold<3)return;
 gold-=3;
 // Discard only unpurchased offers; bought upgrades and equipped cards remain.
 generateShop();shopOpened=true;
 shopRender();updateScore();save();
});
document.getElementById('shop-offers').addEventListener('click' ,e=>{const b=e.target.closest('[data-buy]');if(b)buyUpgrade(Number(b.dataset.buy))});
document.getElementById('leave-shop').onclick=()=>{document.getElementById('shop-modal').hidden=true;newRound()};
// Performance rewards are calculated on each round's FINAL score, including card effects.
// 25% above target: +1 G; 50% above: +2 G; twice target: +3 G maximum.
function performanceGold(score,target){
 if(score>=target*2)return 3;
 if(score>=target*1.5)return 2;
 if(score>=target*1.25)return 1;
 return 0;
}
const EARLY_GOLD=[3,2,1,0,0,0];
const completionGold=()=>Math.floor(roundIndex/3)+2+2*(roundIndex%3);
let roundIndex=Number.isInteger(saved.roundIndex)?Math.max(0,saved.roundIndex):0;
let runEnded=Boolean(saved.runEnded);
let lastRoundPassed=Boolean(saved.lastRoundPassed);
const roundTarget=()=>targetForRound(roundIndex);
 let liveRoundChips=done?0:guesses.reduce((n,word,i)=>n+scoreGuess(word,i).chips,0);
function scoreGuess(word,index){const res=evaluate(word);const g=res.filter(x=>x==='correct').length,y=res.filter(x=>x==='present').length;const bonus=res.reduce((sum,color,i)=>sum+(color==='correct'||color==='present'?upgradeChips(word[i]):0),0);return {chips:g*GREEN_CHIPS[index]+y*YELLOW_CHIPS[index]+bonus,g,y}}
function updateScore(animate=false){
 document.getElementById('target-word').textContent=solution;
 const el=document.getElementById('run-total');
 el.textContent=Math.round(roundTotal+liveRoundChips).toLocaleString();
 document.getElementById('score-target').textContent=roundTarget().toLocaleString();
 document.getElementById('gold-total').textContent=gold.toLocaleString();
 document.getElementById('stage-track').innerHTML=Array.from({length:Math.max(5,Math.floor(roundIndex/3)+1)},(_,stage)=>`<div class="stage-dots" aria-label="Stage ${stage+1}">${Array.from({length:3},(_,r)=>{const idx=stage*3+r;return `<span class="stage-dot ${idx<roundIndex||idx===roundIndex&&lastRoundPassed?'cleared':''} ${idx===roundIndex&&!lastRoundPassed?'current':''}" title="Stage ${stage+1}, round ${r+1}${r===2?' (boss)':''}"></span>`}).join('')}</div>`).join('');

 if(animate){el.classList.remove('pulse');void el.offsetWidth;el.classList.add('pulse')}
}
let toastTimer;

function save(){try{localStorage.setItem(KEY,JSON.stringify({solution,guesses,stats,roundTotal,roundPaid,roundIndex,runEnded,lastRoundPassed,gold,lastGoldBreakdown,upgrades,shopOffers,shopOpened,jokers,jokerOffers,shopDiscountUsed,cardPaidPrices,animationSpeed:animationSpeed/2,lastScoreBreakdown}))}catch{}}
function newRound(){
 if(runEnded){roundIndex=0;runEnded=false;lastRoundPassed=false;gold=0;lastGoldBreakdown=null;upgrades={};jokers=[];cardPaidPrices={};jokerOffers=[];shopDiscountUsed=false;shopOffers=[];shopOpened=false;renderJokers()}
 else if(done&&lastRoundPassed){roundIndex++;shopOffers=[];jokerOffers=[];shopOpened=false;shopDiscountUsed=false;lastRoundPassed=false;}
 // Each Wordle round has its own score. No points carry into the next puzzle.
 roundTotal=0;
 liveRoundChips=0;
 lastGoldBreakdown=null;lastScoreBreakdown=null;
 const previous=solution;let next=previous;
 while(next===previous)next=ANSWERS[Math.floor(Math.random()*ANSWERS.length)].toUpperCase();
 solution=next;guesses=[];roundPaid=false;current='';busy=false;done=false;
 toast.hidden=true;document.getElementById('next-round').hidden=true;
 closeModals();makeBoard();save();
}
function evaluate(word){const result=Array(5).fill('absent'),counts={};for(let i=0;i<5;i++){if(word[i]===solution[i])result[i]='correct';else counts[solution[i]]=(counts[solution[i]]||0)+1}for(let i=0;i<5;i++){if(result[i]==='correct')continue;if((counts[word[i]]||0)>0){result[i]='present';counts[word[i]]--}}return result}
function makeBoard(){board.innerHTML='';for(let r=0;r<6;r++){const row=document.createElement('div');row.className='board-row';row.setAttribute('role','row');for(let c=0;c<5;c++){const tile=document.createElement('div');tile.className='tile';tile.setAttribute('role','gridcell');row.append(tile)}board.append(row)}refresh()}
function refresh(){
 for(let r=0;r<6;r++){
  const text=guesses[r]||(r===guesses.length&&!done?current:'');
  const result=guesses[r]?evaluate(guesses[r]):null;
  for(let c=0;c<5;c++){
   const tile=board.children[r].children[c],letter=text?.[c]||'';
   tile.textContent=letter;
   tile.className='tile'+(letter?' filled':'')+(result?' '+result[c]:'');
   tile.setAttribute('aria-label',letter?(letter+(result?' '+result[c]:'')):'empty');
  }
 }
 // The keyboard shows only purchased letter tiers; no gray/yellow/green guess history.
 for(const key of keyboard.querySelectorAll('.key'))key.className='key'+(key.dataset.key.length>1?' wide':'');
 styleKeyboardUpgrades();updateScore();
}
function buildKeyboard(){for(const rowText of ['QWERTYUIOP','ASDFGHJKL','↵ZXCVBNM⌫']){const row=document.createElement('div');row.className='keyrow';let keys=rowText==='↵ZXCVBNM⌫'?['ENTER',...'ZXCVBNM','BACKSPACE']:[...rowText];for(const letter of keys){const b=document.createElement('button');b.className='key'+(letter.length>1?' wide':'');b.textContent=letter==='BACKSPACE'?'⌫':letter==='ENTER'?'ENTER':letter;b.dataset.key=letter;b.setAttribute('aria-label',letter);b.onclick=()=>handle(letter);row.append(b)}keyboard.append(row)}}
function message(s,ms=1700){clearTimeout(toastTimer);toast.textContent=s;toast.hidden=false;toastTimer=setTimeout(()=>toast.hidden=true,ms)}
function shake(){const row=board.children[guesses.length];if(!row)return;row.classList.remove('shake');void row.offsetWidth;row.classList.add('shake')}
function handle(key){if(busy||done||!document.getElementById('help-modal').hidden||!document.getElementById('stats-modal').hidden||!document.getElementById('settings-modal').hidden||!document.getElementById('shop-modal').hidden)return;if(key==='ENTER'){submit();return}if(key==='BACKSPACE'){current=current.slice(0,-1)}else if(/^[A-Z]$/.test(key)&&current.length<5){current+=key}refresh()}
function floatValue(element,text,kind){
 const gain=document.createElement('span');gain.className='gain '+(kind||'');gain.textContent=text;
 element.appendChild(gain);setTimeout(()=>gain.remove(),(kind==='word-mult'?1500:800)/animationSpeed);
}
// Time all scoring phases against the same user-selected rate.
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms/animationSpeed));
// Return one tile per condition match, in left-to-right order. This makes
// repeated letters (e.g., the two Es in NEVER) trigger separately.
function individualTriggers(effect, word, guessIndex){
 const onSolved=(predicate)=>[...word].flatMap((letter,i)=>predicate(letter,i)?[{row:guessIndex,column:i}]:[]);
 const onFirst=(color)=>evaluate(guesses[0]).flatMap((v,i)=>v===color?[{row:0,column:i}]:[]);
 switch(effect.id){
  case 'vowel':return onSolved(l=>'AEIOU'.includes(l)).map(p=>({...p,mult:1.25}));
  case 'consonant':return onSolved(l=>!'AEIOU'.includes(l)).map(p=>({...p,mult:1.15}));
  case 'thumb':return onFirst('correct').map(p=>({...p,chips:60}));
  case 'yellow':return onFirst('present').map(p=>({...p,chips:40}));
  case 'loyalty':return onSolved(l=>(upgrades[l]||0)>0).map(p=>({...p,chips:120}));
  case 'green':return onSolved(()=>true).map(p=>({...p,mult:1.25}));
  case 'midas':return onSolved(l=>(upgrades[l]||0)>0).map(p=>({...p,mult:1.5}));
  case 'goose':return onSolved(l=>(upgrades[l]||0)>0).slice(0,5).map(p=>({...p,gold:1}));
  default:return [];
 }
}
function highlightTrigger(effect,step,card){
 const tile=step?board.children[step.row]?.children[step.column]:null;
 if(card){card.classList.remove('perk-firing');void card.offsetWidth;card.classList.add('perk-firing')}
 if(tile){
  tile.classList.remove('perk-hit','slam','tilting');tile.style.transform='';void tile.offsetWidth;tile.classList.add('perk-hit');
  const text=step.chips?'+'+step.chips:step.gold?'+'+step.gold+' G':'×'+step.mult;
  floatValue(tile,text,step.chips?'perk-chips':step.gold?'perk-gold':'perk-mult');
 }else if(card){
  const text=effect.chips?'+'+effect.chips:effect.mult!==1?'×'+Number(effect.mult.toFixed(2)):'+'+effect.goldExtra+' G';
  floatValue(card,text,effect.goldExtra?'gold-card':'mult-card');
 }
}
async function animateCardEffect(effect,guessIndex,word,amount,onStep){
 const card=[...document.querySelectorAll('#joker-strip .collectible')].find(el=>el.dataset.cardId===effect.id);
 const steps=individualTriggers(effect,word,guessIndex);
 if(steps.length){
  for(const step of steps){
   highlightTrigger(effect,step,card);
   if(step.chips)amount+=step.chips;
   if(step.mult)amount*=step.mult;
   if(onStep)onStep(step,amount);
   liveRoundChips=amount;updateScore(true);
   await wait(670);
  }
 }else if(effect.chips||effect.mult!==1){
  highlightTrigger(effect,null,card);
  if(effect.chips)amount+=effect.chips;
  if(effect.mult!==1)amount*=effect.mult;
  if(onStep)onStep({chips:effect.chips||0,mult:effect.mult===1?0:effect.mult},amount);
  liveRoundChips=amount;updateScore(true);
  await wait(670);
 }
 if(card)card.classList.remove('perk-firing');
 return amount;
}
async function scoreSolvedWord(word,guessIndex,lastTile){
 done=true;stats.played++;stats.wins++;stats.streak++;stats.maxStreak=Math.max(stats.maxStreak,stats.streak);
 let baseTiles=0,upgradeTiles=0;
 for(let r=0;r<guesses.length;r++){
  const result=evaluate(guesses[r]);
  result.forEach((color,i)=>{
   if(color==='correct'||color==='present'){
    baseTiles+=color==='correct'?GREEN_CHIPS[r]:YELLOW_CHIPS[r];
    upgradeTiles+=upgradeChips(guesses[r][i]);
   }
  });
 }
 let amount=baseTiles+upgradeTiles;
 const effectRows=[];
 const effects=cardEffects(word,guessIndex);
 // Base Chips for all submitted letters finish before the equipped cards trigger.
 for(const effect of effects){
  if(!effect.active||(!effect.chips&&effect.mult===1))continue;
  let chipsAdded=0, factor=1;
  amount=await animateCardEffect(effect,guessIndex,word,amount,(step)=>{
   if(step.chips)chipsAdded+=step.chips;
   if(step.mult)factor*=step.mult;
  });
  effectRows.push({name:cardOf(effect.id).name,type:chipsAdded?'chips':'mult',value:chipsAdded||factor,after:amount});
 }
 const early=EARLY_MULT[guessIndex];
 // Finish and visibly settle every letter/card perk before starting the
 // separate, whole-word early-solve multiplier. This prevents an instant
 // jump from the base score to thousands while the last perk is firing.
 liveRoundChips=amount;updateScore();
 await wait(1000);
 const beforeEarlyMult=amount;
 const afterEarlyMult=beforeEarlyMult*early;
 // Only the whole word shakes for the solve-speed multiplier.
 const solvedRow=board.children[guessIndex];
 for(const tile of solvedRow.children){
  tile.classList.remove('perk-hit','slam','tilting','word-mult-hit');
  tile.style.transform='';void tile.offsetWidth;
  tile.classList.add('word-mult-hit');
 }
 floatValue(solvedRow,'×'+early,'word-mult');
 // Count the multiplier into the score over multiple frames rather than
 // committing the entire new score on the same frame as the red label.
 const increments=18;
 for(let frame=1;frame<=increments;frame++){
  const progress=frame/increments;
  amount=beforeEarlyMult+(afterEarlyMult-beforeEarlyMult)*progress;
  liveRoundChips=amount;updateScore();
  await wait(90);
 }
 amount=afterEarlyMult;
 liveRoundChips=amount;updateScore(true);
 lastScoreBreakdown={roundIndex,baseTiles,upgradeTiles,effects:effectRows,early,guess:guessIndex+1,total:Math.round(amount)};
 await wait(600);
 for(const tile of solvedRow.children)tile.classList.remove('word-mult-hit');
 await wait(350);
 const finalScore=Math.round(amount);
 lastRoundPassed=finalScore>=roundTarget();
 if(!roundPaid){
  // Commit the final score exactly once. The live animation accumulator
  // must be cleared at the same time or the dashboard briefly doubles it
  // during the gold-award sequence before dropping back down.
  roundTotal=finalScore;liveRoundChips=0;roundPaid=true;
  updateScore();
  if(lastRoundPassed){
   const base=completionGold(),earlyGold=EARLY_GOLD[guessIndex],performance=performanceGold(finalScore,roundTarget());
   const cardRewards=effects.filter(e=>e.goldExtra).map(e=>({id:e.id,name:cardOf(e.id).name,amount:e.goldExtra}));
   lastGoldBreakdown={roundIndex,base,early:earlyGold,guess:guessIndex+1,performance,cardRewards,total:base+earlyGold+performance+cardRewards.reduce((n,c)=>n+c.amount,0)};
   // Show the gold as it is awarded, one component at a time.
   for(const value of [base,earlyGold,performance]){
    if(value<=0)continue;
    gold+=value;updateScore();
    const goldEl=document.getElementById('gold-total');goldEl.classList.remove('pulse');void goldEl.offsetWidth;goldEl.classList.add('pulse');
    floatValue(goldEl.parentElement,'+'+value+' G','gold-card');
    await wait(560);
   }
   for(const effect of effects.filter(e=>e.goldExtra)){
    const card=[...document.querySelectorAll('#joker-strip .collectible')].find(el=>el.dataset.cardId===effect.id);
    const steps=individualTriggers(effect,word,guessIndex);
    if(steps.length){
     for(const step of steps){highlightTrigger(effect,step,card);gold+=step.gold;updateScore();await wait(670)}
    }else{
     highlightTrigger(effect,null,card);gold+=effect.goldExtra;updateScore();await wait(850);
    }
    if(card)card.classList.remove('perk-firing');
   }
  }
 }
 liveRoundChips=0;runEnded=!lastRoundPassed;updateScore(true);
 message(lastRoundPassed?(roundIndex===14?'All 5 stages cleared — endless unlocked!':'Round cleared!'):'Target missed: '+finalScore.toLocaleString()+' / '+roundTarget().toLocaleString(),3200);
 // Let the last scoring and reward animation settle before the shop opens.
 await wait(1450);
 completeRoundUI();
}
function completeRoundUI(){
 // Called only after all tile, card, early Mult and gold animations finish.
 const nextButton=document.getElementById('next-round');nextButton.hidden=false;
 nextButton.textContent=runEnded?'Restart Run →':(roundIndex===14?'Enter Endless →':roundIndex%3===2?'Next Stage →':'Next Round →');
 busy=false;save();refresh();if(lastRoundPassed&&!runEnded)openShop();
}
async function submit(){
 if(current.length!==5){shake();message('Not enough letters');return}
 if(!WORDS.has(current.toLowerCase())){shake();message('Not in word list');return}
 busy=true;const word=current;guesses.push(word);current='';save();
 const row=board.children[guesses.length-1],result=evaluate(word),guessIndex=guesses.length-1;
 for(let c=0;c<5;c++){
  await wait(670);
  const tile=row.children[c],color=result[c];tile.textContent=word[c];tile.className='tile filled '+color+' slam';
  const chips=(color==='correct'?GREEN_CHIPS[guessIndex]:color==='present'?YELLOW_CHIPS[guessIndex]:0)+(color!=='absent'?upgradeChips(word[c]):0);
  if(chips){liveRoundChips+=chips;floatValue(tile,'+'+chips,'');updateScore(true)}
 }
 await wait(350);
 const won=word===solution;done=won||guesses.length===6;
 if(won){await scoreSolvedWord(word,guessIndex,row.children[4]);return}
 if(done){stats.played++;stats.streak=0;runEnded=true;lastRoundPassed=false;liveRoundChips=0;updateScore(true);message('Run over. The word was '+solution,3200);completeRoundUI();return}
 busy=false;save();refresh();
}
// Settings is a dedicated dialog; backdrop clicks never close it.
const settingsModal=document.getElementById('settings-modal');
const settingsButton=document.getElementById('open-settings');
const settingsClose=document.getElementById('close-settings');
let settingsPreviousFocus=null;
function openSettings(){
 if(!document.getElementById('shop-modal').hidden||busy)return;
 settingsPreviousFocus=document.activeElement;
 settingsModal.hidden=false;
 settingsClose.focus();
}
function closeSettings(){
 settingsModal.hidden=true;
 (settingsPreviousFocus||settingsButton).focus();
}
settingsButton.addEventListener('click',openSettings);
settingsClose.addEventListener('click',closeSettings);

// V17: live card swapping. Hovering another slot immediately moves its card
// into the original vacant position; release confirms, cancel restores.
let cardDrag=null;
function dragContainerOf(el){return el.closest('#joker-strip,#shop-owned-list')}
function ownedCardFromPoint(x,y,container){
 // Use bounding rectangles rather than elementFromPoint: SVG art and pointer
 // capture can intercept hit testing while a card is being dragged.
 for(const item of container.querySelectorAll('.rack-card,.shop-owned-item')){
  const r=item.getBoundingClientRect();
  if(x>=r.left && x<=r.right && y>=r.top && y<=r.bottom)return item;
 }
 return null;
}
function animateSwap(container,oldPositions){
 for(const item of container.querySelectorAll('.rack-card,.shop-owned-item')){
  const id=item.querySelector('.collectible[data-card-id]')?.dataset.cardId;
  const old=id&&oldPositions.get(id);if(!old)continue;
  const now=item.getBoundingClientRect();
  const dx=old.left-now.left,dy=old.top-now.top;
  if(Math.abs(dx)+Math.abs(dy)>1){
   item.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0px,0px)'}],
    {duration:180,easing:'cubic-bezier(.22,.8,.25,1)'});
  }
 }
}
function liveSwap(d,target){
 const sourceItem=d.source.closest('.rack-card,.shop-owned-item');
 if(!sourceItem||!target||sourceItem===target)return;
 const container=d.container;
 const positions=new Map([...container.querySelectorAll('.rack-card,.shop-owned-item')].map(item=>{
  const id=item.querySelector('.collectible[data-card-id]')?.dataset.cardId;
  return [id,item.getBoundingClientRect()];
 }));
 const sourceMarker=document.createComment('card-swap');
 sourceItem.parentNode.insertBefore(sourceMarker,sourceItem);
 target.parentNode.insertBefore(sourceItem,target);
 sourceMarker.parentNode.insertBefore(target,sourceMarker);
 sourceMarker.remove();
 animateSwap(container,positions);
}
function syncJokerOrder(container){
 const order=[...container.querySelectorAll('.collectible[data-card-id]')].map(e=>e.dataset.cardId);
 if(order.length===jokers.length && order.every(id=>jokers.includes(id))){
  jokers=order;renderJokers();renderShopOwned();save();
 }
}
for(const el of [document.getElementById('joker-strip'),document.getElementById('shop-owned-list')]){
 el.addEventListener('pointerdown',e=>{
  if(busy||e.button!==0)return;
  const card=e.target.closest('.collectible[data-card-id]');
  if(!card||!el.contains(card)||jokers.length<2)return;
  cardDrag={pointerId:e.pointerId,source:card,container:el,x:e.clientX,y:e.clientY,preview:null,
   original:jokers.slice(),lastIndex:[...el.querySelectorAll('.rack-card,.shop-owned-item')].indexOf(card.closest('.rack-card,.shop-owned-item')),slots:[...el.querySelectorAll('.rack-card,.shop-owned-item')].map(item=>item.getBoundingClientRect())};
  el.setPointerCapture(e.pointerId);e.preventDefault();
 });
 el.addEventListener('pointermove',e=>{
  const d=cardDrag;if(!d||d.container!==el||d.pointerId!==e.pointerId)return;
  if(!d.preview&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>6){
   const preview=d.source.cloneNode(true);
   preview.classList.remove('perk-firing','trigger');
   preview.querySelector('.card-tooltip')?.remove();
   // The floating preview lives outside the card rack. Capture the source
   // dimensions and typography before moving it, so it stays the *same card*
   // instead of growing the title or changing the art proportions mid-drag.
   const sourceRect=d.source.getBoundingClientRect();
   const sourceElements=[...d.source.querySelectorAll('*')];
   const previewElements=[...preview.querySelectorAll('*')];
   const keep=['font-family','font-size','font-weight','font-style','line-height',
    'letter-spacing','text-align','text-transform','white-space','padding',
    'margin','width','height','min-height','max-height','flex','align-items',
    'justify-content','color','background-color','border-radius','stroke-width'];
   for(let i=0;i<sourceElements.length;i++){
    if(!previewElements[i])continue;
    const css=getComputedStyle(sourceElements[i]);
    for(const property of keep)previewElements[i].style.setProperty(property,css.getPropertyValue(property));
   }
   preview.classList.add('drag-card-preview');
   preview.style.width=sourceRect.width+'px';
   preview.style.height=sourceRect.height+'px';
   document.body.appendChild(preview);d.preview=preview;
   d.source.classList.add('drag-source');
  }
  if(!d.preview)return;
  d.preview.style.left=e.clientX+'px';d.preview.style.top=e.clientY+'px';
  const hoveredIndex=d.slots.findIndex(r=>e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom);
  if(hoveredIndex>=0 && hoveredIndex!==d.lastIndex){
   const item=[...el.querySelectorAll('.rack-card,.shop-owned-item')][hoveredIndex];
   if(item){liveSwap(d,item);d.lastIndex=hoveredIndex;}
  }
 });
 function endDrag(e){
  const d=cardDrag;if(!d||d.container!==el||d.pointerId!==e.pointerId)return;
  cardDrag=null;
  if(d.preview){
   const preview=d.preview;const rect=d.source.getBoundingClientRect();
   preview.style.transition='left 170ms ease-out,top 170ms ease-out,transform 170ms ease-out,opacity 170ms ease-out';
   preview.style.left=(rect.left+rect.width/2)+'px';
   preview.style.top=(rect.top+rect.height/2)+'px';
   preview.style.transform='translate(-50%,-50%) rotate(0deg) scale(1)';
   preview.style.opacity='.65';
   const cancelled=e.type==='pointercancel';
   setTimeout(()=>{
    preview.remove();d.source.classList.remove('drag-source');
    if(cancelled){jokers=d.original;renderJokers();renderShopOwned();}
    else syncJokerOrder(el);
   },180);
  }
  try{el.releasePointerCapture(e.pointerId)}catch{}
 }
 el.addEventListener('pointerup',endDrag);
 el.addEventListener('pointercancel',endDrag);
}

window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!document.getElementById('settings-modal').hidden){closeSettings();e.preventDefault();return}if(!document.getElementById('shop-modal').hidden){e.preventDefault();return}closeModals();return}if(!document.getElementById('help-modal').hidden||!document.getElementById('stats-modal').hidden||!document.getElementById('settings-modal').hidden||!document.getElementById('shop-modal').hidden)return;if(e.metaKey||e.ctrlKey||e.altKey)return;let key=e.key==='Enter'?'ENTER':e.key==='Backspace'?'BACKSPACE':e.key.toUpperCase();if(key==='BACKSPACE'||key==='ENTER'||/^[A-Z]$/.test(key)){e.preventDefault();handle(key)}});
function showModal(id){document.getElementById(id).hidden=false}function closeModals(){document.querySelectorAll('.overlay:not(#shop-modal)').forEach(e=>e.hidden=true)}document.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click',closeModals));document.querySelectorAll('.overlay').forEach(x=>x.addEventListener('click',e=>{if(e.target===x && x.id!=='shop-modal' && x.id!=='settings-modal')closeModals()}));

function showStats(){const total=stats.played||0,winPct=total?Math.round(stats.wins/total*100):0;document.getElementById('stat-row').innerHTML=[[total,'Played'],[winPct+'%','Win rate'],[stats.streak||0,'Streak'],[stats.maxStreak||0,'Best streak']].map(([v,l])=>`<div class="stat"><strong>${v}</strong><small>${l}</small></div>`).join('');document.getElementById('result-msg').textContent=done?guesses.includes(solution)?`Solved in ${guesses.length} ${guesses.length===1?'guess':'guesses'}!`:`The word was ${solution}.`:'Keep guessing to finish the puzzle.';showModal('stats-modal')}
document.getElementById('reset').onclick=()=>{if(!confirm('Clear your statistics? Your current puzzle will remain.'))return;stats={played:0,wins:0,streak:0,maxStreak:0,lastWin:null};save();showStats()};

// Pointer-responsive tilt, centered on each letter (no permanent rotation).
const motionReduced=window.matchMedia('(prefers-reduced-motion: reduce)');
board.addEventListener('pointermove',e=>{
 if(e.pointerType==='touch'||motionReduced.matches)return;
 const tile=e.target.closest('.tile');
 if(!tile||!board.contains(tile)||tile.classList.contains('slam'))return;
 const rect=tile.getBoundingClientRect();
 const px=Math.max(-1,Math.min(1,((e.clientX-rect.left)/rect.width-.5)*2));
 const py=Math.max(-1,Math.min(1,((e.clientY-rect.top)/rect.height-.5)*2));
 tile.classList.add('tilting');
 tile.style.transform=`perspective(380px) rotateX(${-py*12}deg) rotateY(${px*12}deg) translateZ(5px)`;
});
board.addEventListener('pointerout',e=>{
 const tile=e.target.closest('.tile');
 if(!tile||tile.contains(e.relatedTarget))return;
 tile.classList.remove('tilting');tile.style.transform='';
});
// Keep the left inventory exactly as tall as the six-row Wordle grid.
// Its top and height update when the viewport, zoom, or board dimensions change.
function syncCardRack(){
 const grid=board.getBoundingClientRect();
 const rack=document.querySelector('.card-side');
 if(!rack||!grid.height)return;
 rack.style.setProperty('--rack-top',grid.top+'px');
 rack.style.setProperty('--rack-height',grid.height+'px');
}
const cardRackObserver=new ResizeObserver(syncCardRack);
cardRackObserver.observe(board);
window.addEventListener('resize',syncCardRack);
window.addEventListener('scroll',syncCardRack,{passive:true});
requestAnimationFrame(syncCardRack);
document.getElementById('next-round').onclick=()=>{if(busy)return;if(lastRoundPassed&&!runEnded)openShop();else newRound()};buildKeyboard();makeBoard();renderJokers();document.getElementById('next-round').hidden=!done; if(done){const b=document.getElementById('next-round');b.textContent=runEnded?'Restart Run →':(roundIndex===14?'Enter Endless →':roundIndex%3===2?'Next Stage →':'Next Round →')} if(done&&lastRoundPassed&&!runEnded)openShop();save();

// Fit the board to the viewport's remaining vertical space without touching
// game logic or the existing scoring/card animations.
function fitGameToViewport(){
  const shell=document.querySelector('.shell');
  const top=document.querySelector('.top');
  const scoreboard=document.querySelector('.scoreboard');
  const hint=document.querySelector('.target-test');
  const playArea=document.querySelector('.play-area');
  const keyboard=document.querySelector('.keyboard');
  const next=document.getElementById('next-round');
  if(!shell||!top||!scoreboard||!hint||!playArea||!keyboard)return;
  const vh=window.innerHeight;
  if(vh<490){board.style.removeProperty('--board-fit');return;}
  const other=top.getBoundingClientRect().height+
    scoreboard.getBoundingClientRect().height+
    parseFloat(getComputedStyle(scoreboard).marginTop||0)+
    hint.getBoundingClientRect().height+
    parseFloat(getComputedStyle(hint).marginTop||0)+
    keyboard.getBoundingClientRect().height+
    parseFloat(getComputedStyle(keyboard).marginTop||0)+
    (next&&!next.hidden?next.getBoundingClientRect().height+5:0)+
    14; // bottom safe padding and rounding allowance
  const heightLeft=Math.max(0,vh-other);
  const rackWidth=window.innerWidth<=600?71:126;
  // Reserve the same width on both sides so the board remains truly centered.
  const widthLeft=Math.max(90,window.innerWidth-2*(rackWidth+14));
  const width=Math.max(90,Math.min(325,Math.floor(heightLeft*5/6),widthLeft));
  board.style.setProperty('--board-fit',width+'px');
  requestAnimationFrame(syncCardRack);
}
window.addEventListener('resize',fitGameToViewport);
window.addEventListener('orientationchange',fitGameToViewport);
new MutationObserver(()=>requestAnimationFrame(fitGameToViewport)).observe(document.getElementById('next-round'),{attributes:true,attributeFilter:['hidden']});
requestAnimationFrame(fitGameToViewport);
