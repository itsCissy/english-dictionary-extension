// Chrome/Firefox compatible
const chromeOrBrowser = typeof browser !== "undefined" ? browser : chrome;
// sidepanel.js - 侧边栏生词本逻辑

let wordBook = {};
let currentView = 'list';
let reviewQueue = [];
let currentReviewIndex = 0;
let currentWordDetail = null;
let selectedDate = null;
let currentCalendarDate = new Date();

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadWordBook();
  setupEventListeners();
  updateStats();
  renderWordList();
  updateTagFilter();
  initCalendar();
});

// 加载生词本数据
async function loadWordBook() {
  const result = await chromeOrBrowser.storage.local.get('wordBook');
  wordBook = result.wordBook || {};
}

// 更新统计数据
function updateStats() {
  const words = Object.values(wordBook);
  const total = words.length;
  const mastered = words.filter(w => w.mastered).length;
  const totalViews = words.reduce((sum, w) => sum + (w.viewCount || 0), 0);
  const rate = total > 0 ? Math.round((mastered / total) * 100) : 0;

  // 主统计
  document.getElementById('totalCount').textContent = total;
  document.getElementById('masteredCount').textContent = mastered;

  // 详细统计
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statMastered').textContent = mastered;
  document.getElementById('statRate').textContent = rate + '%';
  document.getElementById('statViews').textContent = totalViews;

  // 最常查看
  const sortedByViews = Object.entries(wordBook)
    .sort((a, b) => (b[1].viewCount || 0) - (a[1].viewCount || 0))
    .slice(0, 5);

  const mostViewedList = document.getElementById('mostViewedList');
  if (sortedByViews.length > 0) {
    mostViewedList.innerHTML = sortedByViews.map(([word, data]) => `
      <div class="most-viewed-item">
        <span class="most-viewed-word">${word}</span>
        <span class="most-viewed-count">${data.viewCount || 0} 次</span>
      </div>
    `).join('');
  } else {
    mostViewedList.innerHTML = '<p class="empty-state">暂无数据</p>';
  }
}

// 更新标签过滤器
function updateTagFilter() {
  const allTags = new Set();
  Object.values(wordBook).forEach(word => {
    (word.tags || []).forEach(tag => allTags.add(tag));
  });

  const tagFilter = document.getElementById('tagFilter');
  tagFilter.innerHTML = '<option value="">全部标签</option>' +
    Array.from(allTags).sort().map(tag =>
      `<option value="${tag}">${tag}</option>`
    ).join('');
}

// 设置事件监听
function setupEventListeners() {
  // 视图切换
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // 搜索
  document.getElementById('searchInput').addEventListener('input', () => {
    if (currentView === 'list') renderWordList();
  });

  // 标签筛选
  document.getElementById('tagFilter').addEventListener('change', () => {
    if (currentView === 'list') renderWordList();
  });

  // 日历切换
  document.getElementById('calendarToggle').addEventListener('click', () => {
    const dropdown = document.getElementById('calendarDropdown');
    const toggle = document.getElementById('calendarToggle');
    dropdown.classList.toggle('active');
    toggle.classList.toggle('active');
  });

  // 月份导航
  document.getElementById('prevMonth').addEventListener('click', (e) => {
    e.stopPropagation();
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById('nextMonth').addEventListener('click', (e) => {
    e.stopPropagation();
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
  });

  // 清除日期筛选
  document.getElementById('clearDateFilter').addEventListener('click', () => {
    selectedDate = null;
    document.getElementById('selectedDateText').textContent = '选择日期';
    document.getElementById('clearDateFilter').style.display = 'none';
    document.getElementById('dateStats').textContent = '';
    renderCalendar();
    renderWordList();
  });

  // 导出
  document.getElementById('exportBtn').addEventListener('click', exportWords);

  // 清空
  document.getElementById('clearBtn').addEventListener('click', async () => {
    if (Object.keys(wordBook).length === 0) return;
    if (!confirm('清空所有单词？')) return;
    wordBook = {};
    await chromeOrBrowser.storage.local.set({ wordBook });
    await loadWordBook();
    updateStats();
    renderWordList();
    updateTagFilter();
  });

  // 关闭弹窗
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('wordDetailModal').addEventListener('click', (e) => {
    if (e.target.id === 'wordDetailModal') closeModal();
  });

  // 添加标签
  document.getElementById('addTagBtn').addEventListener('click', addTag);
  document.getElementById('tagInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTag();
  });

  // 复习按钮
  document.querySelectorAll('.review-btn').forEach(btn => {
    btn.addEventListener('click', () => handleReviewResult(btn.dataset.result));
  });

  // 翻转闪卡
  document.getElementById('flashcard')?.addEventListener('click', function() {
    this.classList.toggle('flipped');
  });
}

// 切换视图
function switchView(viewName) {
  currentView = viewName;

  // 更新标签状态
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // 更新内容显示
  document.querySelectorAll('.view-content').forEach(content => {
    content.classList.toggle('active', content.id === viewName + 'View');
  });

  // 渲染对应视图
  switch (viewName) {
    case 'list':
      renderWordList();
      break;
    case 'groups':
      renderAlphabetGroups();
      break;
    case 'review':
      startReview();
      break;
    case 'stats':
      updateStats();
      break;
  }
}

// 渲染单词列表
function renderWordList() {
  const wordList = document.getElementById('wordList');
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const tagFilter = document.getElementById('tagFilter').value;

  let words = Object.entries(wordBook);

  // 过滤
  words = words.filter(([word, data]) => {
    // 搜索过滤
    const matchSearch = !searchTerm ||
      word.toLowerCase().includes(searchTerm) ||
      data.meanings?.some(m =>
        m.definitions?.some(d =>
          d.definition?.toLowerCase().includes(searchTerm)
        )
      );

    // 标签过滤
    const matchTag = !tagFilter || (data.tags || []).includes(tagFilter);

    // 日期过滤
    let matchDate = true;
    if (selectedDate) {
      const savedDate = new Date(data.savedAt);
      const filterDate = new Date(selectedDate);
      matchDate = savedDate.toDateString() === filterDate.toDateString();
    }

    return matchSearch && matchTag && matchDate;
  });

  // 排序
  words.sort((a, b) => new Date(b[1].savedAt) - new Date(a[1].savedAt));

  if (words.length === 0) {
    let emptyMsg = '还没有保存单词';
    if (selectedDate) {
      emptyMsg = '该日期没有保存的单词';
    } else if (searchTerm || tagFilter) {
      emptyMsg = '没有找到匹配的单词';
    }
    wordList.innerHTML = `<div class="empty-state"><p>${emptyMsg}</p></div>`;
    return;
  }

  wordList.innerHTML = words.map(([word, data]) => {
    const savedDate = new Date(data.savedAt).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
    const firstDef = data.meanings?.[0]?.definitions?.[0];
    const definition = firstDef?.definition || '';
    const tags = (data.tags || []).slice(0, 3);
    const isMastered = data.mastered || false;

    return `
      <div class="word-card" data-word="${word}">
        <div class="word-card-header">
          <div class="word-card-word">${word}</div>
          <div class="word-card-meta">
            <span>${savedDate}</span>
            <span>${data.viewCount || 0}次</span>
          </div>
        </div>
        ${definition ? `<div class="word-card-definition">${definition}</div>` : ''}
        <div class="word-card-tags">
          ${isMastered ? '<span class="word-tag mastered">已掌握</span>' : ''}
          ${tags.map(tag => `<span class="word-tag">${tag}</span>`).join('')}
        </div>
      </div>
    `;
  }).join('');

  // 绑定点击事件
  document.querySelectorAll('.word-card').forEach(card => {
    card.addEventListener('click', () => showWordDetail(card.dataset.word));
  });
}

// 渲染字母分组
function renderAlphabetGroups() {
  const alphabetList = document.getElementById('alphabetList');

  // 按首字母分组
  const groups = {};
  Object.keys(wordBook).sort().forEach(word => {
    const letter = word[0].toUpperCase();
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(word);
  });

  if (Object.keys(groups).length === 0) {
    alphabetList.innerHTML = '<div class="empty-state"><p>还没有保存单词</p></div>';
    return;
  }

  alphabetList.innerHTML = Object.entries(groups).map(([letter, words]) => `
    <div class="alphabet-group">
      <div class="alphabet-header">${letter} (${words.length})</div>
      <div class="alphabet-words">
        ${words.map(word => `
          <div class="alphabet-word" data-word="${word}">${word}</div>
        `).join('')}
      </div>
    </div>
  `).join('');

  // 绑定点击事件
  document.querySelectorAll('.alphabet-word').forEach(el => {
    el.addEventListener('click', () => showWordDetail(el.dataset.word));
  });
}

// 开始复习
function startReview() {
  reviewQueue = Object.entries(wordBook)
    .filter(([_, data]) => !data.mastered)
    .sort((a, b) => (a[1].reviewCount || 0) - (b[1].reviewCount || 0));

  currentReviewIndex = 0;
  showNextFlashcard();
}

// 显示下一张闪卡
function showNextFlashcard() {
  const flashcard = document.getElementById('flashcard');
  const flashcardFront = document.getElementById('flashcardFront');
  const flashcardBack = document.getElementById('flashcardBack');

  flashcard.classList.remove('flipped');

  if (currentReviewIndex >= reviewQueue.length) {
    // 复习完成
    flashcardFront.innerHTML = `
      <div class="flashcard-word">🎉</div>
      <div class="flashcard-hint">复习完成！</div>
    `;
    flashcardBack.style.display = 'none';
    document.getElementById('reviewProgress').textContent =
      `${reviewQueue.length} / ${reviewQueue.length}`;
    return;
  }

  const [word, data] = reviewQueue[currentReviewIndex];
  const firstDef = data.meanings?.[0]?.definitions?.[0];
  const example = firstDef?.example || '';

  flashcardFront.innerHTML = `
    <div class="flashcard-word">${word}</div>
    <div class="flashcard-hint">点击翻转</div>
  `;

  flashcardBack.innerHTML = `
    <div class="flashcard-definition">${firstDef?.definition || '暂无定义'}</div>
    ${example ? `<div class="flashcard-example">"${example}"</div>` : ''}
    <div class="flashcard-actions">
      <button class="review-btn" data-result="hard">😓</button>
      <button class="review-btn" data-result="good">😊</button>
      <button class="review-btn" data-result="easy">😎</button>
    </div>
  `;
  flashcardBack.style.display = 'flex';

  document.getElementById('reviewProgress').textContent =
    `${currentReviewIndex + 1} / ${reviewQueue.length}`;
}

// 处理复习结果
function handleReviewResult(result) {
  if (currentReviewIndex >= reviewQueue.length) return;

  const [word, data] = reviewQueue[currentReviewIndex];

  // 更新复习次数
  data.reviewCount = (data.reviewCount || 0) + 1;

  // 根据结果更新状态
  if (result === 'easy') {
    data.mastered = true;
  } else if (result === 'hard') {
    data.reviewCount = 0; // 重置
  }

  // 保存
  wordBook[word] = data;
  chromeOrBrowser.storage.local.set({ wordBook });

  // 下一张
  currentReviewIndex++;
  showNextFlashcard();
}

// 显示单词详情
function showWordDetail(word) {
  const data = wordBook[word];
  if (!data) return;

  currentWordDetail = word;

  const modal = document.getElementById('wordDetailModal');
  document.getElementById('detailWord').textContent = word;

  const detailBody = document.getElementById('detailBody');
  detailBody.innerHTML = data.meanings?.map(meaning => `
    <div class="modal-definition">
      <div class="modal-part-of-speech">${meaning.partOfSpeech}</div>
      ${meaning.definitions?.slice(0, 3).map(def => `
        <div class="modal-definition-text">${def.definition}</div>
        ${def.example ? `<div class="modal-example">"${def.example}"</div>` : ''}
      `).join('') || ''}
    </div>
  `).join('') || '<p>暂无定义</p>';

  // 渲染标签
  renderDetailTags(data.tags || []);

  // 添加操作按钮
  const isMastered = data.mastered || false;
  detailBody.innerHTML += `
    <div class="modal-actions">
      <button class="btn-master" onclick="toggleMastered('${word}')">
        ${isMastered ? '✓ 已掌握' : '标记掌握'}
      </button>
      <button class="btn-delete" onclick="deleteWord('${word}')">删除</button>
    </div>
  `;

  modal.classList.add('active');
}

// 渲染详情标签
function renderDetailTags(tags) {
  const tagList = document.getElementById('detailTagList');
  tagList.innerHTML = tags.map(tag => `
    <span class="tag-item">
      ${tag}
      <button onclick="removeTag('${tag}')">×</button>
    </span>
  `).join('');
}

// 添加标签
function addTag() {
  if (!currentWordDetail) return;

  const input = document.getElementById('tagInput');
  const tag = input.value.trim();

  if (!tag) return;

  const data = wordBook[currentWordDetail];
  if (!data.tags) data.tags = [];

  if (!data.tags.includes(tag)) {
    data.tags.push(tag);
    wordBook[currentWordDetail] = data;
    chromeOrBrowser.storage.local.set({ wordBook });
    renderDetailTags(data.tags);
    updateTagFilter();
  }

  input.value = '';
}

// 移除标签
function removeTag(tag) {
  if (!currentWordDetail) return;

  const data = wordBook[currentWordDetail];
  if (!data.tags) return;

  data.tags = data.tags.filter(t => t !== tag);
  wordBook[currentWordDetail] = data;
  chromeOrBrowser.storage.local.set({ wordBook });
  renderDetailTags(data.tags);
  updateTagFilter();
}

// 切换掌握状态
async function toggleMastered(word) {
  wordBook[word].mastered = !wordBook[word].mastered;
  await chromeOrBrowser.storage.local.set({ wordBook });
  updateStats();
  showWordDetail(word); // 刷新详情
  renderWordList(); // 刷新列表
}

// 删除单词
async function deleteWord(word) {
  if (!confirm(`删除 "${word}"？`)) return;

  delete wordBook[word];
  await chromeOrBrowser.storage.local.set({ wordBook });

  closeModal();
  updateStats();
  renderWordList();
  updateTagFilter();
}

// 关闭弹窗
function closeModal() {
  document.getElementById('wordDetailModal').classList.remove('active');
  currentWordDetail = null;
}

// 导出单词
function exportWords() {
  const words = Object.entries(wordBook);
  if (words.length === 0) {
    alert('生词本是空的');
    return;
  }

  const sortedWords = words.sort((a, b) => a[0].localeCompare(b[0]));
  let csv = '单词,词性,定义,例句,保存日期,查看次数,标签\n';

  sortedWords.forEach(([word, data]) => {
    const savedDate = new Date(data.savedAt).toLocaleDateString('zh-CN');
    const tags = (data.tags || []).join('; ');

    data.meanings?.forEach(meaning => {
      meaning.definitions?.forEach(def => {
        const partOfSpeech = meaning.partOfSpeech || '';
        const definition = (def.definition || '').replace(/"/g, '""');
        const example = (def.example || '').replace(/"/g, '""');

        csv += `"${word}","${partOfSpeech}","${definition}","${example}","${savedDate}","${data.viewCount || 0}","${tags}"\n`;
      });
    });
  });

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `生词本_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ========== 日历功能 ==========

// 初始化日历
function initCalendar() {
  renderCalendar();
}

// 渲染日历
function renderCalendar() {
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  // 更新标题
  document.getElementById('calendarTitle').textContent =
    `${year}年${month + 1}月`;

  // 获取月份的第一天和最后一天
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  // 获取有单词的日期
  const wordsByDate = {};
  Object.values(wordBook).forEach(data => {
    const savedDate = new Date(data.savedAt);
    if (savedDate.getFullYear() === year && savedDate.getMonth() === month) {
      const day = savedDate.getDate();
      wordsByDate[day] = (wordsByDate[day] || 0) + 1;
    }
  });

  // 今天的日期
  const today = new Date();

  // 渲染日期
  const calendarDays = document.getElementById('calendarDays');
  let html = '';

  // 空白日期（月初前）
  for (let i = 0; i < startDayOfWeek; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  // 实际日期
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    const isSelected = selectedDate === dateStr;
    const hasWords = wordsByDate[day] > 0;

    let classes = 'calendar-day';
    if (isToday) classes += ' today';
    if (isSelected) classes += ' selected';
    if (hasWords) classes += ' has-words';

    html += `<div class="${classes}" data-date="${dateStr}">${day}</div>`;
  }

  calendarDays.innerHTML = html;

  // 绑定日期点击事件
  calendarDays.querySelectorAll('.calendar-day:not(.empty)').forEach(dayEl => {
    dayEl.addEventListener('click', () => {
      const date = dayEl.dataset.date;
      selectDate(date);
    });
  });
}

// 选择日期
function selectDate(dateStr) {
  selectedDate = dateStr;

  // 更新显示
  const date = new Date(dateStr);
  const dateText = `${date.getMonth() + 1}月${date.getDate()}日`;
  document.getElementById('selectedDateText').textContent = dateText;
  document.getElementById('clearDateFilter').style.display = 'block';

  // 关闭下拉菜单
  document.getElementById('calendarDropdown').classList.remove('active');
  document.getElementById('calendarToggle').classList.remove('active');

  // 更新统计
  const wordsOnDate = Object.entries(wordBook).filter(([_, data]) => {
    const savedDate = new Date(data.savedAt);
    return savedDate.toDateString() === date.toDateString();
  });
  document.getElementById('dateStats').textContent = `${wordsOnDate.length} 个单词`;

  // 重新渲染列表
  renderCalendar();
  renderWordList();
}
