// ===== Học tiếng Hàn - Giai đoạn 1 =====
const $=s=>document.querySelector(s);
const KEY='hanhoc_v1';
// S = toàn bộ dữ liệu học, lưu trong bộ nhớ trình duyệt trên điện thoại
let S=Object.assign({cards:{},streak:0,last:0,newDay:0,newN:0,rate:0.9,theme:'auto'},JSON.parse(localStorage.getItem(KEY)||'{}'));
const save=()=>localStorage.setItem(KEY,JSON.stringify(S));
const today=()=>Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5); // số thứ tự ngày
let T=[],H=[],W=[],WM={},Q=[],QZ=null;
const shuffle=a=>a.sort(()=>Math.random()-.5);
const pick=a=>a[Math.random()*a.length|0];

// Đọc tiếng Hàn bằng giọng có sẵn của máy
function speak(t,r){
  if(!('speechSynthesis' in window))return alert('Máy không hỗ trợ đọc giọng nói');
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(t);u.lang='ko-KR';u.rate=r||S.rate;speechSynthesis.speak(u);
}
function applyTheme(){document.documentElement.dataset.theme=S.theme;}

async function init(){
  applyTheme();
  const d=await Promise.all([fetch('data/vocab.json').then(r=>r.json()),fetch('data/hangul.json').then(r=>r.json())]);
  T=d[0];H=d[1];
  T.forEach(t=>t.words.forEach(w=>{w.id=t.id+':'+w.ko;W.push(w);WM[w.id]=w;}));
  show('home');
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
}

function show(t){
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t==t));
  ({home:home,vocab:vocab,ai:()=>soon('Trò chuyện AI','Giai đoạn 2'),exam:()=>soon('Luyện thi TOPIK','Giai đoạn 4'),set:settings})[t]();
  scrollTo(0,0);
}
function soon(a,b){$('#main').innerHTML=`<h1>${a}</h1><div class="card">Phần này sẽ có ở ${b}.</div>`;}

// ---------- Trang Học ----------
const dueCards=()=>Object.values(S.cards).filter(c=>c.due<=today());
function home(){
  const due=dueCards().length,left=5-(S.newDay==today()?S.newN:0);
  $('#main').innerHTML=`<h1>Hôm nay</h1><p class="muted">🔥 Chuỗi ngày học: ${S.streak}</p>
  <div class="card"><b>Ôn flashcard</b><p>${due} thẻ cần ôn</p><button onclick="review()">Bắt đầu ôn</button></div>
  <div class="card"><b>Học từ mới</b><p>Còn ${Math.max(0,left)} từ mới hôm nay</p><button onclick="learnNew()">Học từ mới</button></div>
  <div class="card"><b>Hangul</b><p>Ôn bảng chữ cái, bấm để nghe</p><button onclick="hangul()">Mở bảng chữ</button><button class="alt" onclick="quiz('h')">Nghe chọn chữ</button></div>
  <div class="card"><b>Luyện nghe</b><p>Nghe từ, chọn nghĩa tiếng Việt</p><button onclick="quiz('w')">Bắt đầu nghe</button></div>`;
}
function learnNew(){
  if(S.newDay!=today()){S.newDay=today();S.newN=0;}
  const left=5-S.newN;
  if(left<=0)return alert('Hôm nay bạn đã học đủ 5 từ mới. Hãy ôn lại nhé!');
  const fresh=W.filter(w=>!S.cards[w.id]).slice(0,left);
  if(!fresh.length)return alert('Bạn đã thêm hết các từ hiện có.');
  fresh.forEach(w=>S.cards[w.id]={id:w.id,ef:2.5,n:0,i:0,due:today()});
  S.newN+=fresh.length;save();review();
}

// ---------- Flashcard (thuật toán SM-2) ----------
function review(){
  Q=shuffle(dueCards().map(c=>c.id));
  if(!Q.length)return alert('Chưa có thẻ cần ôn. Hãy học từ mới!');
  next();
}
function next(){
  if(!Q.length)return done();
  const w=WM[Q[0]];
  $('#main').innerHTML=`<p class="muted">Còn ${Q.length} thẻ</p>
  <div class="card"><div class="ko">${w.ko}</div>
  <div style="text-align:center"><button class="alt" onclick="speak('${w.ko}')">🔊 Nghe lại</button></div>
  <div id="ans" hidden><hr><p><b>${w.vi}</b> <span class="muted">(${w.rom})</span></p>
  <p>${w.ex}<br><span class="muted">${w.exvi}</span></p><button class="alt" onclick="speak('${w.ex}')">🔊 Nghe câu</button></div></div>
  <div id="btns"><button onclick="reveal()">Hiện đáp án</button></div>`;
  speak(w.ko);
}
function reveal(){
  $('#ans').hidden=false;
  $('#btns').innerHTML=[['Quên',1],['Khó',3],['Tốt',4],['Dễ',5]].map(a=>`<button class="${a[1]==1?'alt':''}" onclick="grade(${a[1]})">${a[0]}</button>`).join('');
}
function grade(q){
  const id=Q.shift(),c=S.cards[id];
  if(q<3){c.n=0;c.i=0;c.due=today();Q.push(id);}           // quên: hỏi lại trong buổi này
  else{c.i=c.n==0?1:c.n==1?3:Math.round(c.i*c.ef);c.n++;c.due=today()+c.i;} // nhớ: giãn cách ngày ôn
  c.ef=Math.max(1.3,c.ef+.1-(5-q)*(.08+(5-q)*.02));
  save();next();
}
function done(){
  const t=today();
  if(S.last!=t){S.streak=S.last==t-1?S.streak+1:1;S.last=t;save();}
  $('#main').innerHTML=`<h1>🎉 Xong rồi!</h1><p>🔥 Chuỗi ngày học: ${S.streak}</p><button onclick="show('home')">Về trang chủ</button>`;
}

// ---------- Hangul ----------
function hangul(){
  const g=(k,n)=>`<h3>${n}</h3><div class="grid">${H.filter(x=>x.g==k).map(x=>`<button class="tile" onclick="speak('${x.s}')">${x.c}<small>${x.r}</small></button>`).join('')}</div>`;
  $('#main').innerHTML=`<h1>Hangul</h1><p class="muted">Bấm vào ô để nghe.</p>${g('v','Nguyên âm')}${g('c','Phụ âm')}${g('d','Phụ âm đôi')}
  <div class="card"><b>Patchim (phụ âm cuối)</b><p>Chỉ có 7 âm cuối: ㄱ, ㄴ, ㄷ, ㄹ, ㅁ, ㅂ, ㅇ. Ví dụ: 밖→[박], 앞→[압], 꽃→[꼳]. Nối âm: 음악→[으막].</p></div>`;
}

// ---------- Nghe: chọn đáp án ----------
function quiz(t){
  const P=t=='h'?H:W,a=pick(P),o=[a];
  while(o.length<4){const x=pick(P);if(!o.includes(x))o.push(x);}
  shuffle(o);QZ={t:t,a:a,o:o};
  const say=t=='h'?a.s:a.ko;
  $('#main').innerHTML=`<h1>${t=='h'?'Nghe chọn chữ':'Nghe chọn nghĩa'}</h1><p class="muted">Bấm 🔊 rồi chọn đáp án đúng.</p>
  <button onclick="speak('${say}',0.8)">🔊 Nghe</button>
  <div class="opts" id="o">${o.map((x,i)=>`<button onclick="pickAns(${i})">${t=='h'?x.s:x.vi}</button>`).join('')}</div><div id="fb"></div>`;
  speak(say,0.8);
}
function pickAns(i){
  const q=QZ,bs=document.querySelectorAll('#o button');
  bs.forEach((b,j)=>{b.disabled=true;if(q.o[j]==q.a)b.classList.add('ok');});
  if(q.o[i]!=q.a)bs[i].classList.add('no');
  $('#fb').innerHTML=`<p>${q.o[i]==q.a?'✅ Đúng!':'❌ Chưa đúng.'} ${q.t=='h'?q.a.s+' = '+q.a.r:q.a.ko+' = '+q.a.vi}</p><button onclick="quiz('${q.t}')">Câu tiếp</button><button class="alt" onclick="show('home')">Thoát</button>`;
}

// ---------- Từ vựng ----------
function vocab(){
  $('#main').innerHTML=`<h1>Từ vựng</h1>`+T.map(t=>`<div class="card row" onclick="topic('${t.id}')"><b>${t.name}</b><span class="muted">${t.words.length} từ ›</span></div>`).join('');
}
function topic(id){
  const t=T.find(x=>x.id==id);
  $('#main').innerHTML=`<button class="alt" onclick="vocab()">‹ Quay lại</button><h2>${t.name}</h2>`+t.words.map(w=>`<div class="card"><div class="row">
  <div><b style="font-size:22px">${w.ko}</b> <span class="muted">${w.rom}</span><br>${w.vi}</div>
  <div><button class="alt" onclick="speak('${w.ko}')">🔊</button><button class="alt" onclick="addCard('${w.id}',this)">${S.cards[w.id]?'✓':'＋'}</button></div></div>
  <div class="muted">${w.ex} — ${w.exvi}</div></div>`).join('');
}
function addCard(id,b){
  if(!S.cards[id]){S.cards[id]={id:id,ef:2.5,n:0,i:0,due:today()};save();}
  b.textContent='✓';
}

// ---------- Cài đặt ----------
function settings(){
  $('#main').innerHTML=`<h1>Cài đặt</h1>
  <div class="card"><b>Giao diện</b><br><select onchange="S.theme=this.value;save();applyTheme()">${[['auto','Theo máy'],['light','Sáng'],['dark','Tối']].map(a=>`<option value="${a[0]}" ${S.theme==a[0]?'selected':''}>${a[1]}</option>`).join('')}</select></div>
  <div class="card"><b>Tốc độ đọc: <span id="rv">${S.rate}</span>x</b><br><input type="range" min="0.5" max="1.5" step="0.1" value="${S.rate}" oninput="S.rate=+this.value;rv.textContent=S.rate;save()"><br><button class="alt" onclick="speak('안녕하세요, 만나서 반갑습니다.')">🔊 Thử giọng Hàn</button></div>
  <div class="card"><b>Sao lưu</b><p class="muted">Dữ liệu học nằm trên điện thoại. Hãy xuất file thường xuyên.</p>
  <button onclick="exportData()">Xuất file</button><button class="alt" onclick="$('#imp').click()">Nhập file</button><input id="imp" type="file" accept=".json" hidden onchange="importData(this)"></div>`;
}
function exportData(){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(S)],{type:'application/json'}));
  a.download='hoc-han-sao-luu-'+new Date().toISOString().slice(0,10)+'.json';a.click();
}
function importData(i){
  const f=i.files[0];if(!f)return;
  f.text().then(t=>{try{S=Object.assign(S,JSON.parse(t));save();alert('Đã nhập xong!');show('home');}catch(e){alert('File không hợp lệ');}});
}
init();
