import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, setDoc, getDocs, updateDoc, doc, getDoc, query, orderBy, limit, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const $ = id => document.getElementById(id);
let app, auth, db, currentUser = null, profile = null, activePage = "dashboard", lang = "si";
const money = n => "රු. " + Number(n || 0).toLocaleString("en-US", {maximumFractionDigits:2});
const labels = {
 si:{dashboard:"Dashboard",shops:"කඩවල්",products:"නිෂ්පාදන",deliveries:"බෙදාහැරීම්",collections:"මුදල් එකතු කිරීම්",sales:"විකුණුම්",expenses:"ව්‍යාපාර වියදම්",fuelTrips:"ඉන්ධන වියදම්",livingExpenses:"ජීවන වියදම්",growthSavings:"ව්‍යාපාර ඉතිරි කිරීම්",emergencySavings:"හදිසි අරමුදල",employees:"සේවකයින්",reports:"වාර්තා",login:"ඇතුළු වන්න",signIn:"ඇතුළු වන්න",password:"මුරපදය",save:"සුරකින්න",name:"නම",phone:"දුරකථනය",address:"ලිපිනය",price:"මිල",qty:"ප්‍රමාණය",amount:"මුදල",date:"දිනය",category:"වර්ගය",description:"විස්තර",noData:"දත්ත නැත",revenue:"ආදායම",expensesLabel:"වියදම්",profit:"ඇස්තමේන්තුගත ශේෂය",deliveriesLabel:"බෙදාහැරීම්",recent:"මෑත සටහන්",status:"තත්ත්වය",shop:"කඩය",product:"භාණ්ඩය",total:"එකතුව",cost:"ඒකක වියදම",assignedTo:"සේවක UID"},
 en:{dashboard:"Dashboard",shops:"Shops",products:"Products",deliveries:"Deliveries",collections:"Collections",sales:"Sales",expenses:"Business expenses",fuelTrips:"Fuel expenses",livingExpenses:"Living expenses",growthSavings:"Business savings",emergencySavings:"Emergency fund",employees:"Employees",reports:"Reports",login:"Login",signIn:"Sign in",password:"Password",save:"Save",name:"Name",phone:"Phone",address:"Address",price:"Price",qty:"Quantity",amount:"Amount",date:"Date",category:"Category",description:"Description",noData:"No records",revenue:"Revenue",expensesLabel:"Expenses",profit:"Estimated balance",deliveriesLabel:"Deliveries",recent:"Recent records",status:"Status",shop:"Shop",product:"Product",total:"Total",cost:"Unit cost",assignedTo:"Employee UID"}
};
const T = k => labels[lang][k] || k;
const ownerOnly = ["sales","expenses","fuelTrips","livingExpenses","growthSavings","emergencySavings","employees","reports"];
const configs = {
 shops:{title:"shops",fields:[["name","text",true],["phone","tel"],["address","text"]],headers:["name","phone","address"],ownerWrite:true},
 products:{title:"products",fields:[["name","text",true],["price","number",true],["unitCost","number"]],headers:["name","price","unitCost"],ownerWrite:true},
 deliveries:{title:"deliveries",fields:[["shopId","shop",true],["productId","product",true],["qty","number",true],["date","date",true],["assignedTo","employee"]],headers:["shopName","productName","qty","date","status"]},
 collections:{title:"collections",fields:[["shopId","shop",true],["amount","number",true],["date","date",true],["description","text"]],headers:["shopName","amount","date","description"]},
 sales:{title:"sales",fields:[["date","date",true],["description","text",true],["qty","number"],["total","number",true],["notes","text"]],headers:["date","description","qty","total","notes"],ownerWrite:true},
 expenses:{title:"expenses",fields:[["date","date",true],["category","text",true],["description","text"],["amount","number",true]],headers:["date","category","description","amount"],ownerWrite:true},
 fuelTrips:{title:"fuelTrips",fields:[["date","date",true],["vehicle","text"],["distance","number"],["amount","number",true],["description","text"]],headers:["date","vehicle","distance","amount","description"],ownerWrite:true},
 livingExpenses:{title:"livingExpenses",fields:[["date","date",true],["category","text",true],["description","text"],["amount","number",true]],headers:["date","category","description","amount"],ownerWrite:true},
 growthSavings:{title:"growthSavings",fields:[["date","date",true],["description","text"],["amount","number",true]],headers:["date","description","amount"],ownerWrite:true},
 emergencySavings:{title:"emergencySavings",fields:[["date","date",true],["description","text"],["amount","number",true]],headers:["date","description","amount"],ownerWrite:true}
};
function isOwner(){return profile?.role==="owner";}
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2600);}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function getRows(name){
 let q;
 if(profile.role==="employee" && name==="deliveries") q=query(collection(db,name),where("assignedTo","==",currentUser.uid),limit(150));
 else if(profile.role==="employee" && name==="collections") q=query(collection(db,name),where("createdBy","==",currentUser.uid),limit(150));
 else q=query(collection(db,name),orderBy("createdAt","desc"),limit(150));
 const snap=await getDocs(q); return snap.docs.map(d=>({id:d.id,...d.data()}));
}
async function saveRow(name,data){await addDoc(collection(db,name),{...data,createdBy:currentUser.uid,createdAt:serverTimestamp()});}
function fieldHTML(id,type,required=false,options=[]){
 if(type==="shop"||type==="product"||type==="employee") return `<label>${T(id==="shopId"?"shop":id==="productId"?"product":"assignedTo")}<select id="${id}" ${required?"required":""}><option value="">-- තෝරන්න --</option>${options.map(o=>`<option value="${esc(o.id)}">${esc(o.name||o.email||o.id)}</option>`).join("")}</select></label>`;
 const label=T(id)||id;
 return `<label>${esc(label)}<input id="${id}" type="${type}" ${required?"required":""} ${type==="number"?'min="0" step="any"':''}></label>`;
}
function table(headers,rows){
 return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(T(h)||h)}</th>`).join("")}</tr></thead><tbody>${rows.length?rows.join(""):`<tr><td colspan="${headers.length}" class="empty">${T("noData")}</td></tr>`}</tbody></table></div>`;
}
function renderNav(){
 const pages=["dashboard","shops","products","deliveries","collections",...(isOwner()?["sales","expenses","fuelTrips","livingExpenses","growthSavings","emergencySavings","employees","reports"]:[])];
 $("nav").innerHTML=pages.map(p=>`<button class="nav-btn ${activePage===p?"active":""}" data-page="${p}">${T(p)}</button>`).join("");
 $("nav").querySelectorAll("button").forEach(b=>b.onclick=()=>{activePage=b.dataset.page;renderNav();renderPage();});
}
function stat(label,value,sub=""){return `<article class="panel stat"><span>${esc(label)}</span><strong>${value}</strong><small>${esc(sub)}</small></article>`;}
async function renderDashboard(){
 const deliveries=await getRows("deliveries");
 if(!isOwner()){$("page").innerHTML=`<section class="stats">${stat(T("deliveriesLabel"),deliveries.length,"ඔබට පැවරූ බෙදාහැරීම්")}</section><div class="panel"><h2>${T("recent")}</h2>${table(["shopName","productName","qty","date","status"],deliveries.slice(0,8).map(x=>`<tr><td>${esc(x.shopName)}</td><td>${esc(x.productName)}</td><td>${esc(x.qty)}</td><td>${esc(x.date)}</td><td>${esc(x.status)}</td></tr>`))}</div>`;return;}
 const names=["sales","expenses","fuelTrips","livingExpenses","growthSavings","emergencySavings"];
 const data=await Promise.all(names.map(getRows)); const [sales,expenses,fuel,living,growth,emergency]=data;
 const revenue=sales.reduce((s,x)=>s+Number(x.total||x.amount||0),0);
 const costs=[...expenses,...fuel,...living].reduce((s,x)=>s+Number(x.amount||0),0);
 const saved=[...growth,...emergency].reduce((s,x)=>s+Number(x.amount||0),0);
 $("page").innerHTML=`<section class="stats">${stat(T("revenue"),money(revenue),"සටහන් කළ විකුණුම්")}${stat(T("expensesLabel"),money(costs),"ව්‍යාපාර + ඉන්ධන + ජීවන")}${stat(T("profit"),money(revenue-costs),"ඉතිරි කිරීම් අඩු කිරීමට පෙර")}${stat(T("deliveriesLabel"),deliveries.length,"මුළු බෙදාහැරීම්")}</section>
 <div class="report-grid"><section class="panel"><h2>මුදල් සාරාංශය</h2><p class="muted">සටහන් කර ඇති දත්ත මත පදනම් වූ එකතුව</p>${bar("විකුණුම්",revenue,revenue+costs)}${bar("වියදම්",costs,revenue+costs)}${bar("ඉතිරි කිරීම්",saved,revenue+costs+saved)}</section><section class="panel"><h2>ඉතිරි කිරීම්</h2><div class="stat"><span>ව්‍යාපාර ඉතිරි කිරීම්</span><strong>${money(growth.reduce((s,x)=>s+Number(x.amount||0),0))}</strong></div><div class="stat"><span>හදිසි අරමුදල</span><strong>${money(emergency.reduce((s,x)=>s+Number(x.amount||0),0))}</strong></div></section></div>`;
}
function bar(label,value,max){const pct=max?Math.min(100,value/max*100):0;return `<div class="bar-row"><div class="bar-label"><b>${esc(label)}</b><span>${money(value)}</span></div><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></div>`;}
async function renderCollection(name){
 const cfg=configs[name]; let [rows,shops,products,employees]=await Promise.all([getRows(name),name==="deliveries"||name==="collections"?getRows("shops"):[],name==="deliveries"?getRows("products"):[],name==="deliveries"&&isOwner()?getEmployeeProfiles():[]]);
 const canWrite=!cfg.ownerWrite||isOwner();
 const fields=cfg.fields.map(([id,type,req])=>{
  if(id==="assignedTo"&&!isOwner())return "";
  let opts=type==="shop"?shops:type==="product"?products:employees;
  return fieldHTML(id,type,!!req,opts);
 }).join("");
 const rowsHTML=rows.map(x=>`<tr>${cfg.headers.map(h=>`<td>${h==="amount"||h==="total"||h==="price"||h==="unitCost"?money(x[h]):esc(x[h])}</td>`).join("")}</tr>`);
 $("page").innerHTML=`${canWrite?`<section class="panel"><div class="section-head"><h2>${T(name)}</h2></div><form id="recordForm" class="form-grid">${fields}<div class="full-field"><button class="btn btn-primary" type="submit">${T("save")}</button></div></form></section>`:""}<section class="panel"><div class="section-head"><h2>${T(name)} · ${rows.length}</h2></div>${table(cfg.headers,rowsHTML)}</section>`;
 if(canWrite){
  $("recordForm").onsubmit=async e=>{e.preventDefault();try{
   const data={};
   for(const [id,type] of cfg.fields){if(id==="assignedTo"&&!isOwner())continue;let el=$(id);if(!el)continue;data[id]=type==="number"?Number(el.value):el.value.trim();}
   if(name==="deliveries"){const s=shops.find(x=>x.id===data.shopId),p=products.find(x=>x.id===data.productId);if(!s||!p)throw Error("කඩය සහ භාණ්ඩය තෝරන්න.");data.shopName=s.name;data.productName=p.name;data.assignedTo=isOwner()?(data.assignedTo||""):currentUser.uid;data.status="Scheduled";}
   if(name==="collections"){const s=shops.find(x=>x.id===data.shopId);if(!s)throw Error("කඩය තෝරන්න.");data.shopName=s.name;}
   await saveRow(name,data);toast("දත්ත සුරැකුණා");await renderPage();
  }catch(err){toast(err.message);}};
 }
}
async function getEmployeeProfiles(){const s=await getDocs(collection(db,"users"));return s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.role==="employee"&&x.status==="approved");}
async function renderEmployees(){
 const s=await getDocs(collection(db,"users"));const people=s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.role==="employee");
 $("page").innerHTML=`<section class="panel"><h2>සේවක ගිණුම් / Employees</h2><p class="muted">අනුමත කළ සේවකයන්ට පමණක් සීමිත App ප්‍රවේශය ලැබේ.</p>${people.length?people.map(x=>`<article class="employee-card"><h3>${esc(x.name)}</h3><p>Email: ${esc(x.email)}</p><p>Phone: ${esc(x.phone)}</p><p>Status: <b>${esc(x.status)}</b></p>${x.status==="pending"?`<div class="actions"><button class="btn btn-success" data-approve="${esc(x.id)}">Approve</button><button class="btn btn-danger" data-reject="${esc(x.id)}">Reject</button></div>`:""}</article>`).join(""):"<p class='empty'>සේවක ඉල්ලීම් නැත.</p>"}</section>`;
 $("page").querySelectorAll("[data-approve]").forEach(b=>b.onclick=()=>setEmployeeStatus(b.dataset.approve,"approved"));
 $("page").querySelectorAll("[data-reject]").forEach(b=>b.onclick=()=>setEmployeeStatus(b.dataset.reject,"rejected"));
}
async function setEmployeeStatus(uid,status){try{await updateDoc(doc(db,"users",uid),{status});toast("සේවක තත්ත්වය යාවත්කාලීන කළා");await renderEmployees();}catch(e){toast(e.message);}}
async function renderReports(){
 const keys=["sales","expenses","fuelTrips","livingExpenses","growthSavings","emergencySavings"];const all=await Promise.all(keys.map(getRows));const sums=Object.fromEntries(keys.map((k,i)=>[k,all[i].reduce((s,x)=>s+Number(x.total||x.amount||0),0)]));
 $("page").innerHTML=`<section class="panel"><h2>වාර්තා සහ සාරාංශය</h2><p class="muted">දැනට සුරැකී ඇති වාර්තා 150ක් දක්වා එකතුව.</p><div class="stats">${keys.map(k=>stat(T(k),money(sums[k]),`${all[keys.indexOf(k)].length} records`)).join("")}</div></section><section class="panel"><h2>සටහන</h2><p class="muted">මෙම වාර්තා සියලුම කාලවල සුරැකී ඇති දත්ත එකතු කරයි. දිනය අනුව වෙන් කළ වාර්තා ඊළඟ අදියරේදී එකතු කළ හැක.</p></section>`;
}
async function renderPage(){
 try{
  if(ownerOnly.includes(activePage)&&!isOwner()){$("page").innerHTML="<section class='panel'>Access denied</section>";return;}
  $("pageHeading").textContent=T(activePage);
  if(activePage==="dashboard")return await renderDashboard();
  if(activePage==="employees")return await renderEmployees();
  if(activePage==="reports")return await renderReports();
  if(configs[activePage])return await renderCollection(activePage);
 }catch(e){$("page").innerHTML=`<section class="panel message">${esc(e.message)}</section>`;}
}
async function loadProfile(user){
 const s=await getDoc(doc(db,"users",user.uid));if(!s.exists())throw Error("User profile not found. Owner විසින් ගිණුම සකස් කළ යුතුයි.");
 const d=s.data();if(!["owner","employee"].includes(d.role))throw Error("Invalid user role.");
 if(d.role==="employee"&&d.status!=="approved")throw Error("ඔබගේ ගිණුම Owner අනුමැතිය බලාපොරොත්තුවෙන් ඇත.");
 return d;
}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("loginMessage").textContent="";try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value);}catch(err){$("loginMessage").textContent=err.message;}});
$("registerForm").addEventListener("submit",async e=>{
 e.preventDefault();$("registerMessage").textContent="";
 const name=$("registerName").value.trim(),phone=$("registerPhone").value.trim(),email=$("registerEmail").value.trim(),password=$("registerPassword").value,confirm=$("confirmPassword").value;
 if(password!==confirm){$("registerMessage").textContent="මුරපද දෙක සමාන නැහැ.";return;}
 if(password.length<8){$("registerMessage").textContent="මුරපදය අවම අකුරු 8ක් විය යුතුයි.";return;}
 let secondaryApp;
 try{
  secondaryApp=initializeApp(firebaseConfig,"employeeRegistration");const secondaryAuth=getAuth(secondaryApp),secondaryDb=getFirestore(secondaryApp);
  const credential=await createUserWithEmailAndPassword(secondaryAuth,email,password);
  await setDoc(doc(secondaryDb,"users",credential.user.uid),{name,phone,email,role:"employee",status:"pending",createdAt:serverTimestamp()});
  await signOut(secondaryAuth);$("registerMessage").textContent="ගිණුම සාර්ථකයි! Owner අනුමැතිය ලැබෙනතුරු රැඳී සිටින්න.";$("registerForm").reset();
 }catch(err){$("registerMessage").textContent=err.message;}finally{if(secondaryApp)await deleteApp(secondaryApp);}
});
$("logoutBtn").onclick=()=>signOut(auth);
$("langBtn").onclick=()=>{lang=lang==="si"?"en":"si";$("langBtn").textContent=lang==="si"?"English":"සිංහල";renderNav();renderPage();};
if(!firebaseConfig.apiKey||firebaseConfig.apiKey.startsWith("PASTE_")){$("loginMessage").textContent="firebase-config.js සකස් කරන්න.";}
else{
 app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);
 onAuthStateChanged(auth,async user=>{
  currentUser=user;
  if(!user){profile=null;$("loginView").hidden=false;$("appView").hidden=true;$("logoutBtn").hidden=true;return;}
  try{profile=await loadProfile(user);$("loginView").hidden=true;$("appView").hidden=false;$("logoutBtn").hidden=false;$("userEmail").textContent=user.email||"";$("rolePill").textContent=isOwner()?"OWNER":"EMPLOYEE";$("todayLabel").textContent=new Date().toLocaleDateString(lang==="si"?"si-LK":"en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});activePage="dashboard";renderNav();await renderPage();}
  catch(err){$("loginMessage").textContent=err.message;await signOut(auth);}
 });
}
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));}
