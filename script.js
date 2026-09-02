const $ = selector => document.querySelector(selector);
const data = window.LESSON_DATA;
const tasks = window.TASKS;
const focusData = window.LEARNING_FOCUS_DATA;

const publisher = $('#publisher');
const grade = $('#grade');
const lesson = $('#lesson');
const genre = $('#genre');
const status = $('#data-status');
const learningStage = $('#learning-stage');
const lessonInput = $('#lesson-input');
let current = null;

function options(element, items, placeholder) {
  element.innerHTML = `<option value="">${placeholder}</option>` + [...new Set(items)].map(value => `<option value="${value}">${value}</option>`).join('');
  element.disabled = !items.length;
}

function resetMaterialInput() {
  current = null;
  lessonInput.value = '';
  $('#lesson-meta').textContent = '尚未選擇教材';
  updateTextCount();
  $('#prompt-section').hidden = true;
}

options(publisher, data.map(item => item.publisher), '請選擇版本');

publisher.addEventListener('change', () => {
  resetMaterialInput();
  resetLearningFocus();
  const rows = data.filter(item => item.publisher === publisher.value);
  options(grade, rows.map(item => item.grade), rows.length ? '請選擇年級與冊別' : '目前沒有教材索引');
  options(lesson, [], '請先選年級');
  status.textContent = rows.length ? '請繼續選擇年級與課次。' : '請選擇其他版本。';
});

grade.addEventListener('change', () => {
  resetMaterialInput();
  const rows = data.filter(item => item.publisher === publisher.value && item.grade === grade.value);
  options(lesson, rows.map(item => `${item.lesson}｜${item.title}`), '請選擇課次');
});

lesson.addEventListener('change', () => {
  const label = lesson.value;
  current = data.find(item => item.publisher === publisher.value && item.grade === grade.value && `${item.lesson}｜${item.title}` === label);
  if (!current) return;
  lessonInput.value = '';
  resetLearningFocus();
  updateTextCount();
  $('#lesson-meta').textContent = [current.publisher, current.grade, current.lesson, current.title, current.author].filter(Boolean).join('｜');
  $('#prompt-section').hidden = true;
  status.textContent = `已選擇「${current.title}」。請在 STEP 02 自行貼上課文全文。`;
  setTimeout(() => $('#text-section').scrollIntoView({ behavior: 'smooth' }), 80);
});

genre.addEventListener('change', () => {
  if (current) $('#lesson-meta').textContent = [current.publisher, current.grade, current.lesson, current.title, genre.value, current.author].filter(Boolean).join('｜');
  $('#prompt-section').hidden = true;
});

function updateTextCount() {
  const length = lessonInput.value.trim().length;
  $('#text-count').textContent = length ? `已貼上 ${length} 個字元` : '尚未貼上課文';
  $('#prompt-section').hidden = true;
}

lessonInput.addEventListener('input', updateTextCount);
$('#clear-text').addEventListener('click', () => {
  lessonInput.value = '';
  updateTextCount();
  lessonInput.focus();
});

function resetLearningFocus() {
  learningStage.value = '';
  $('#focus-columns').hidden = true;
  $('#content-options').innerHTML = '';
  $('#performance-options').innerHTML = '';
  $('#focus-count').textContent = '尚未選擇學習重點';
}

function renderFocusList(container, items) {
  container.innerHTML = '';
  const groups = {};
  items.forEach(item => (groups[item.category] ??= []).push(item));
  Object.entries(groups).forEach(([category, rows]) => {
    const section = document.createElement('section');
    section.className = 'focus-category';
    const heading = document.createElement('h4');
    heading.textContent = category;
    section.append(heading);
    rows.forEach(item => {
      const label = document.createElement('label');
      label.className = 'focus-item';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.focusText = `${item.code} ${item.description}`;
      input.addEventListener('change', updateFocusCount);
      const text = document.createElement('span');
      text.innerHTML = `<span class="focus-code">${item.code}</span><span class="focus-description">${item.description}</span>`;
      label.append(input, text);
      section.append(label);
    });
    container.append(section);
  });
}

function updateFocusCount() {
  const contentCount = $('#content-options').querySelectorAll('input:checked').length;
  const performanceCount = $('#performance-options').querySelectorAll('input:checked').length;
  $('#focus-count').textContent = contentCount || performanceCount ? `已選擇學習內容 ${contentCount} 項、學習表現 ${performanceCount} 項` : '尚未選擇學習重點';
  $('#prompt-section').hidden = true;
}

function selectedFocus(selector) {
  return [...document.querySelectorAll(`${selector} input:checked`)].map(input => input.dataset.focusText);
}

learningStage.addEventListener('change', () => {
  const selected = focusData[learningStage.value];
  $('#focus-columns').hidden = !selected;
  if (selected) {
    renderFocusList($('#content-options'), selected.content);
    renderFocusList($('#performance-options'), selected.performance);
  } else {
    $('#content-options').innerHTML = '';
    $('#performance-options').innerHTML = '';
  }
  updateFocusCount();
});

$('#clear-focus').addEventListener('click', () => {
  document.querySelectorAll('.focus-options input:checked').forEach(input => input.checked = false);
  updateFocusCount();
});

$('#task-grid').innerHTML = tasks.map(task => `<label class="task-card"><input type="checkbox" value="${task.id}"><strong>${task.title}</strong><small>${task.desc}</small></label>`).join('');

function updateTaskCount() {
  const count = document.querySelectorAll('.task-card input:checked').length;
  $('#selected-count').textContent = count ? `已選擇 ${count} 項備課任務` : '尚未選擇任務';
}

document.querySelectorAll('.task-card input').forEach(input => input.addEventListener('change', updateTaskCount));

$('#build-prompt').addEventListener('click', () => {
  const text = lessonInput.value.trim();
  const selected = [...document.querySelectorAll('.task-card input:checked')].map(input => tasks.find(task => task.id === input.value));
  if (!current) {
    $('#selected-count').textContent = '請先選擇教材';
    return;
  }
  if (!text) {
    $('#selected-count').textContent = '請先在 STEP 02 貼上課文';
    lessonInput.focus();
    return;
  }
  if (!genre.value) {
    $('#selected-count').textContent = '請先選擇文體';
    return;
  }
  if (!selected.length) {
    $('#selected-count').textContent = '請至少選擇 1 項任務';
    return;
  }

  const note = $('#custom-note').value.trim();
  const contentFocus = selectedFocus('#content-options');
  const performanceFocus = selectedFocus('#performance-options');
  const focusBlock = contentFocus.length || performanceFocus.length ? `【本課學習重點】\n學習階段：${learningStage.value}\n學習內容：\n${contentFocus.length ? contentFocus.map(item => `- ${item}`).join('\n') : '- 未勾選'}\n學習表現：\n${performanceFocus.length ? performanceFocus.map(item => `- ${item}`).join('\n') : '- 未勾選'}\n\n` : '';
  const intro = `你是一位熟悉臺灣國小語文教學與 108 課綱的教學設計專家。請全程使用繁體中文，英文與數字兩側保留半形空格。\n\n【教材身分】\n版本：${current.publisher}\n年級冊別：${current.grade}\n課次：${current.lesson}\n課名：${current.title}\n文體：${genre.value}\n作者：${current.author || '未提供'}\n\n${focusBlock}【要完成的備課任務】\n`;
  const body = selected.map((task, index) => `任務 ${index + 1}｜${task.title}\n${task.prompt}`).join('\n\n');
  const ending = `\n\n${note ? `【教師補充需求】\n${note}\n\n` : ''}【課文全文】\n${text}\n\n請將不同任務分成清楚的標題區塊；先核對年級、課次、文體、學習重點與文本內容，再開始回答。若未提供學習重點，請依文本與年級提出最合適的建議。`;
  $('#prompt-output').value = intro + body + ending;
  $('#prompt-section').hidden = false;
  setTimeout(() => $('#prompt-section').scrollIntoView({ behavior: 'smooth' }), 80);
});

$('#copy-prompt').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#prompt-output').value);
    $('#copy-status').textContent = '已複製，可以貼到您常用的 AI 工具。';
  } catch {
    const output = $('#prompt-output');
    output.select();
    document.execCommand('copy');
    $('#copy-status').textContent = '已複製完整提示詞。';
  }
});

$('#download-prompt').addEventListener('click', () => {
  const blob = new Blob([$('#prompt-output').value], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${current.publisher}_${current.grade}_${current.lesson}_${current.title}_AI備課提示詞.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
});
