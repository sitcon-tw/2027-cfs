import{l as f,q as g,a as y}from"./plan-helper.C21AMPbC.js";import{p as b}from"./deadline.CtY66QXY.js";const l=document.documentElement.lang==="en"?"en":"zh-Hant",$=l==="en"?"en-US":"zh-TW",t=l==="en"?g:y;function _(){if(typeof window>"u")return[];try{const e=localStorage.getItem("interestItems");return e?JSON.parse(e):[]}catch(e){return console.error("Error getting interested items from localStorage:",e),[]}}function w(e){return(e.startsWith("$")||e.startsWith("NT$"))&&parseInt(e.replace(/[NT$,]/g,""))||0}function o(e){return`NT$${e.toLocaleString($)}`}function I(e){return e.includes("方案包含項目")||e.includes("Plan Included")}function q(){const e=_().map(n=>f(n,l)),s=document.getElementById("content");if(!s)return;if(e.length===0){s.innerHTML=`
						<div class="empty-state">
							<h2>${t.empty_title}</h2>
							<p>${t.empty_description}</p>
						</div>
					`;return}const r=new Date().toLocaleDateString($,{year:"numeric",month:"2-digit",day:"2-digit"});let a=0,d=!1;const h=e.map((n,v)=>{const i=n.price||"",c=b(n.deadline)?n.deadline.trim():"",u=I(i);u&&(d=!0);const m=w(i),p=m;return a+=p,`
						<tr>
							<td>${v+1}</td>
							<td>
								<div class="item-title">${n.title}</div>
								${c?`<div class="item-deadline">${t.deadline} ${c}</div>`:""}
							</td>
							<td class="quantity-cell">1</td>
							<td class="price-cell">${i||"—"}</td>
							<td class="subtotal-cell">${!u&&m>0?o(p):i||"—"}</td>
						</tr>
					`}).join("");s.innerHTML=`
					<div class="quotation-info">
						<div class="info-item">
							<span class="info-label">${t.quotation_date}</span>
							<span>${r}</span>
						</div>
						<div class="info-item">
							<span class="info-label">${t.contact}</span>
							<span>contact@sitcon.org</span>
						</div>
						<div class="info-item">
							<span class="info-label">${t.item_count}</span>
							<span>${t.item_count_value.replace("{count}",String(e.length))}</span>
						</div>
					</div>

					<table class="items-table">
						<thead>
							<tr>
								<th style="width: 60px;">${t.number}</th>
								<th>${t.item_name}</th>
								<th style="width: 60px;">${t.quantity}</th>
								<th style="width: 120px;">${t.unit_price}</th>
								<th style="width: 120px;">${t.subtotal}</th>
							</tr>
						</thead>
						<tbody>
							${h}
						</tbody>
					</table>

					${a>0?`
					<div class="summary-section">
						<div class="summary-row total">
							<span>${t.total}</span>
							<span>${o(a)}</span>
						</div>
						<div class="summary-note">
							${t.tax_note.replace("{amount}",o(Math.round(a*.05)))}
						</div>
					</div>
					`:""}

					<div class="notes">
						<h3>${t.notes_title}</h3>
						<ul>
							${t.notes.map(n=>`<li>${n}</li>`).join("")}
							${d?`<li>${t.non_numeric_note}</li>`:""}
						</ul>
					</div>

					<div class="footer">
						<p>${t.organization}</p>
						<p>${t.generated_note.replace("{date}",r)}</p>
					</div>
				`}document.addEventListener("DOMContentLoaded",()=>{q(),setTimeout(()=>{window.print()},500)});
