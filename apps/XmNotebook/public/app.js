document.addEventListener('click', async (ev) => {
  const target = ev.target;
  if (target && target.classList && target.classList.contains('run')) {
    const cell = target.closest('.cell');
    const pre = cell.querySelector('.code');
    const code = pre.textContent;
    const cellId = cell.dataset.id;
    const outputEl = document.querySelector(`[data-output-for="${cellId}"]`);
    outputEl.textContent = 'Running...';
    try {
      const res = await fetch('/api/execute', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, lang: 'js' })});
      const json = await res.json();
      outputEl.textContent = '';
      if (json.stdout) outputEl.textContent += json.stdout + '\n';
      if (json.stderr) outputEl.textContent += 'ERR: ' + json.stderr + '\n';
    } catch (e) {
      outputEl.textContent = 'Execute failed: ' + e.message;
    }
  }
});