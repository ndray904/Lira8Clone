// Observe raw events at window capture, before the app's document handlers.
// Local-only diagnostics; no event is cancelled and no key data is transmitted.
const panel=document.createElement('details');
panel.style.cssText='margin-top:24px;padding:16px;border:1px solid #3e4438;border-radius:6px;font-size:12px;line-height:1.8;color:#c1c7b4';
panel.innerHTML='<summary>Input monitor · check simultaneous pads</summary><p>With latch off, hold 1 and 2, then press 6. Compare the keys received by the browser with the pads activated by the app. Release all keys before each attempt.</p><div>Keys browser sees: <output id="input-keys">None</output></div><div>Pads activated: <output id="input-pads">None</output></div><div>Page focus: <output id="input-focus">Active</output></div><pre id="input-history" style="white-space:pre-wrap;font-size:11px"></pre><p>Events are shown only on this page. A key absent from the first row did not reach this monitor; that can involve the keyboard, operating system, or browser. A key present there with its pad absent points to the app.</p>';
document.querySelector('footer').before(panel);
const down=new Map(),history=[];
function render(){
 panel.querySelector('#input-keys').textContent=[...down.values()].join(', ')||'None';
 panel.querySelector('#input-pads').textContent=[...document.querySelectorAll('.pad[aria-pressed="true"]')].map(el=>el.id.replace('pad-','')).join(', ')||'None';
 panel.querySelector('#input-history').textContent=history.join('\n');
}
for(const type of ['keydown','keyup'])window.addEventListener(type,e=>{
 if(!/^(Digit|Numpad)[1-8]$/.test(e.code)&&!/^[1-8]$/.test(e.key))return;
 if(e.repeat)return;
 if(type==='keydown')down.set(e.code||e.key,`${e.code||e.key} (key ${e.key})`);else down.delete(e.code||e.key);
 history.unshift(`${type==='keydown'?'DOWN':'UP'} ${e.code} · key ${e.key} · focus ${e.target.tagName}`);
 history.length=Math.min(history.length,12);
 queueMicrotask(render);
},true);
window.addEventListener('blur',()=>{down.clear();history.unshift('Page lost focus');history.length=Math.min(history.length,12);panel.querySelector('#input-focus').textContent='Inactive';render();});
window.addEventListener('focus',()=>{panel.querySelector('#input-focus').textContent='Active';render();});
new MutationObserver(render).observe(document.querySelector('.instrument'),{subtree:true,attributes:true,attributeFilter:['aria-pressed']});
render();
