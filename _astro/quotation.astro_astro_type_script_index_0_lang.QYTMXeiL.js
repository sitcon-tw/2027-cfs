import{t as e}from"./deadline.Cm09tB0z.js";import{i as t,n,r}from"./plan-helper.DF2_qkNc.js";var i=document.documentElement.lang===`en`?`en`:`zh-Hant`,a=i===`en`?`en-US`:`zh-TW`,o=i===`en`?r:t;function s(){if(typeof window>`u`)return[];try{let e=localStorage.getItem(`interestItems`);return e?JSON.parse(e):[]}catch(e){return console.error(`Error getting interested items from localStorage:`,e),[]}}function c(e){return(e.startsWith(`$`)||e.startsWith(`NT$`))&&parseInt(e.replace(/[NT$,]/g,``))||0}function l(e){return`NT$${e.toLocaleString(a)}`}function u(e){return e.includes(`方案包含項目`)||e.includes(`Plan Included`)}function d(){let t=s().map(e=>n(e,i)),r=document.getElementById(`content`);if(!r)return;if(t.length===0){r.innerHTML=`
						<div class="empty-state">
							<h2>${o.empty_title}</h2>
							<p>${o.empty_description}</p>
						</div>
					`;return}let d=new Date().toLocaleDateString(a,{year:`numeric`,month:`2-digit`,day:`2-digit`}),f=0,p=!1,m=t.map((t,n)=>{let r=t.price||``,i=e(t.deadline)?t.deadline.trim():``,a=u(r);a&&(p=!0);let s=c(r),d=s;return f+=d,`
						<tr>
							<td>${n+1}</td>
							<td>
								<div class="item-title">${t.title}</div>
								${i?`<div class="item-deadline">${o.deadline} ${i}</div>`:``}
							</td>
							<td class="quantity-cell">1</td>
							<td class="price-cell">${r||`—`}</td>
							<td class="subtotal-cell">${!a&&s>0?l(d):r||`—`}</td>
						</tr>
					`}).join(``);r.innerHTML=`
					<div class="quotation-info">
						<div class="info-item">
							<span class="info-label">${o.quotation_date}</span>
							<span>${d}</span>
						</div>
						<div class="info-item">
							<span class="info-label">${o.contact}</span>
							<span>contact@sitcon.org</span>
						</div>
						<div class="info-item">
							<span class="info-label">${o.item_count}</span>
							<span>${o.item_count_value.replace(`{count}`,String(t.length))}</span>
						</div>
					</div>

					<table class="items-table">
						<thead>
							<tr>
								<th style="width: 60px;">${o.number}</th>
								<th>${o.item_name}</th>
								<th style="width: 60px;">${o.quantity}</th>
								<th style="width: 120px;">${o.unit_price}</th>
								<th style="width: 120px;">${o.subtotal}</th>
							</tr>
						</thead>
						<tbody>
							${m}
						</tbody>
					</table>

					${f>0?`
					<div class="summary-section">
						<div class="summary-row total">
							<span>${o.total}</span>
							<span>${l(f)}</span>
						</div>
						<div class="summary-note">
							${o.tax_note.replace(`{amount}`,l(Math.round(f*.05)))}
						</div>
					</div>
					`:``}

					<div class="notes">
						<h3>${o.notes_title}</h3>
						<ul>
							${o.notes.map(e=>`<li>${e}</li>`).join(``)}
							${p?`<li>${o.non_numeric_note}</li>`:``}
						</ul>
					</div>

					<div class="footer">
						<p>${o.organization}</p>
						<p>${o.generated_note.replace(`{date}`,d)}</p>
					</div>
				`}document.addEventListener(`DOMContentLoaded`,()=>{d(),setTimeout(()=>{window.print()},500)});