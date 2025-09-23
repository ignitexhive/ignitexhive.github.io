(function(global){
  const ADDRESS = 'rsRy14FvipgqudiGmptJBhr1RtpsgfzKMM';
  global.IXH_WALLET = ADDRESS;

  function onReady(fn){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function applyWallet(){
    const nodes = document.querySelectorAll('[data-company-wallet]');
    nodes.forEach((node) => {
      if(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement){
        node.value = ADDRESS;
        node.setAttribute('value', ADDRESS);
      } else {
        node.textContent = ADDRESS;
      }
    });
  }

  function fallbackCopy(text){
    const temp = document.createElement('textarea');
    temp.style.position = 'fixed';
    temp.style.top = '-1000px';
    temp.style.opacity = '0';
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {
      ok = false;
    }
    document.body.removeChild(temp);
    return ok;
  }

  function attachCopyHandlers(){
    document.querySelectorAll('[data-copy-wallet]').forEach((btn) => {
      const original = btn.textContent.trim() || 'Copy Wallet Address';
      const resetLabel = btn.getAttribute('data-reset') || original;
      btn.addEventListener('click', async () => {
        let copied = false;
        if(navigator.clipboard && navigator.clipboard.writeText){
          try {
            await navigator.clipboard.writeText(ADDRESS);
            copied = true;
          } catch (err) {
            copied = false;
          }
        }
        if(!copied){
          copied = fallbackCopy(ADDRESS);
        }
        btn.textContent = copied ? 'Copied!' : 'Copy failed';
        setTimeout(() => {
          btn.textContent = resetLabel;
        }, 1600);
      });
    });
  }

  onReady(() => {
    applyWallet();
    attachCopyHandlers();
  });
})(window);





