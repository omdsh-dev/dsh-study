// unified diff → HTML。分片里的 diff 以 "diff --git-ds" 行开头，文件节以 "diff --git a/x b/y" 开头。
export function renderDiff(text) {
  const box = document.createElement('div');
  box.className = 'diffbox';
  if (!text || !text.trim()) {
    const empty = document.createElement('div');
    empty.className = 'diff-empty';
    empty.textContent = '该提交没有可展示的 diff（merge 提交，或改动全部为锁文件 / 快照等被过滤的噪音）。';
    box.appendChild(empty);
    return box;
  }
  const lines = text.split('\n');
  let file = null;
  let plusPath = '';
  const newFile = () => {
    file = document.createElement('section');
    file.className = 'file';
    const head = document.createElement('div');
    head.className = 'file-head';
    file.appendChild(head);
    const linesEl = document.createElement('div');
    linesEl.className = 'lines';
    file.appendChild(linesEl);
    file._head = head;
    file._lines = linesEl;
    file._add = 0;
    file._del = 0;
    file._path = '';
    box.appendChild(file);
  };
  const setHead = () => {
    if (!file) return;
    const sign = file._del && !file._add ? '-' : file._add && !file._del ? '+' : '';
    file._head.innerHTML = '';
    const nm = document.createElement('span');
    nm.textContent = `${file._path || '(unknown)'}`;
    const cnt = document.createElement('span');
    cnt.style.marginLeft = 'auto';
    cnt.style.fontWeight = '500';
    cnt.innerHTML = `<span style="color:#7ee2a8">+${file._add}</span> <span style="color:#ffb1ab">−${file._del}</span> ${sign}`;
    file._head.append(nm, cnt);
  };

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      if (file) setHead();
      newFile();
      continue;
    }
    if (!file) continue;
    if (line.startsWith('--- ')) { void 0; continue; }
    if (line.startsWith('+++ ')) {
      const p = line.slice(6);
      if (p !== '/dev/null') file._path = p;
      continue;
    }
    if (line.startsWith('index ') || line.startsWith('new file') || line.startsWith('deleted file') ||
        line.startsWith('similarity ') || line.startsWith('rename ') || line.startsWith('old mode') || line.startsWith('new mode') || line.startsWith('Binary files')) {
      if (line.startsWith('Binary files')) {
        if (!file._path) file._path = '(binary)';
        const ln = document.createElement('span');
        ln.className = 'ln meta';
        ln.textContent = line;
        file._lines.appendChild(ln);
      }
      continue;
    }
    if (line.startsWith('@@')) {
      const ln = document.createElement('span');
      ln.className = 'ln hunk';
      ln.textContent = line;
      file._lines.appendChild(ln);
      continue;
    }
    if (line.startsWith('+')) { file._add++; addLn(file, line, 'add'); continue; }
    if (line.startsWith('-')) { file._del++; addLn(file, line, 'del'); continue; }
    if (line.startsWith('\\')) { // "\ No newline at end of file"
      addLn(file, line, 'meta');
      continue;
    }
    addLn(file, line, '');
  }
  setHead();
  return box;
}

function addLn(file, text, cls) {
  const el = document.createElement('span');
  el.className = `ln${cls ? ' ' + cls : ''}`;
  el.textContent = text || ' ';
  file._lines.appendChild(el);
}
