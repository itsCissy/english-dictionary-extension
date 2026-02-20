// options.js - 生词本页面逻辑

let wordBook = {};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadWordBook();
  renderWordList();
  setupEventListeners();
});

// 加载生词本数据
async function loadWordBook() {
  const result = await chrome.storage.local.get('wordBook');
  wordBook = result.wordBook || {};
  updateStats();
}

// 更新统计数据
function updateStats() {
  const words = Object.values(wordBook);
  const total = words.length;
  const mastered = words.filter(w => w.mastered).length;

  document.getElementById('totalCount').textContent = total;
  document.getElementById('masteredCount').textContent = mastered;
}

// 渲染单词列表
function renderWordList(searchTerm = '') {
  const wordList = document.getElementById('wordList');
  const words = Object.entries(wordBook);

  // 过滤搜索
  const filteredWords = searchTerm
    ? words.filter(([word, data]) =>
        word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data.meanings?.some(m =>
          m.definitions?.some(d =>
            d.definition?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        )
      )
    : words;

  // 空状态
  if (filteredWords.length === 0) {
    wordList.innerHTML = `
      <div class="empty-state">
        <p>${searchTerm ? '没有找到匹配的单词' : '还没有保存任何单词'}</p>
        <p class="hint">${!searchTerm ? '在网页上选中单词，点击"保存"按钮即可添加' : ''}</p>
      </div>
    `;
    return;
  }

  // 按保存时间倒序排列
  const sortedWords = filteredWords.sort((a, b) =>
    new Date(b[1].savedAt) - new Date(a[1].savedAt)
  );

  // 渲染单词卡片
  wordList.innerHTML = sortedWords.map(([word, data]) => {
    const savedDate = new Date(data.savedAt).toLocaleDateString('zh-CN');
    const firstDef = data.meanings?.[0]?.definitions?.[0];
    const definition = firstDef?.definition || '';
    const example = firstDef?.example || '';
    const isMastered = data.mastered || false;

    return `
      <div class="word-card" data-word="${word}">
        <div class="word-card-header">
          <div class="word-card-word">${word}</div>
          <div class="word-card-date">${savedDate}</div>
        </div>
        ${definition ? `<div class="word-card-definition">${definition}</div>` : ''}
        ${example ? `<div class="word-card-example">"${example}"</div>` : ''}
        <div class="word-card-actions">
          <button class="word-card-btn btn-master ${isMastered ? 'mastered' : ''}" data-word="${word}">
            ${isMastered ? '✓ 已掌握' : '标记掌握'}
          </button>
          <button class="word-card-btn btn-delete" data-word="${word}">删除</button>
        </div>
      </div>
    `;
  }).join('');

  // 绑定卡片按钮事件
  bindCardEvents();
}

// 绑定卡片按钮事件
function bindCardEvents() {
  // 掌握按钮
  document.querySelectorAll('.btn-master').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const word = e.target.dataset.word;
      await toggleMastered(word);
    });
  });

  // 删除按钮
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const word = e.target.dataset.word;
      await deleteWord(word);
    });
  });
}

// 切换掌握状态
async function toggleMastered(word) {
  wordBook[word].mastered = !wordBook[word].mastered;
  await chrome.storage.local.set({ wordBook });
  await loadWordBook();
  renderWordList(document.getElementById('searchInput').value);
}

// 删除单词
async function deleteWord(word) {
  if (!confirm(`确定要删除 "${word}" 吗？`)) return;

  delete wordBook[word];
  await chrome.storage.local.set({ wordBook });
  await loadWordBook();
  renderWordList(document.getElementById('searchInput').value);
}

// 设置事件监听
function setupEventListeners() {
  // 搜索
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    renderWordList(e.target.value);
  });

  // 导出
  document.getElementById('exportBtn').addEventListener('click', exportWords);

  // 清空
  document.getElementById('clearBtn').addEventListener('click', async () => {
    if (Object.keys(wordBook).length === 0) {
      alert('生词本已经是空的');
      return;
    }
    if (!confirm('确定要清空所有单词吗？此操作不可恢复！')) return;

    wordBook = {};
    await chrome.storage.local.set({ wordBook });
    await loadWordBook();
    renderWordList();
  });
}

// 导出单词
function exportWords() {
  const words = Object.entries(wordBook);
  if (words.length === 0) {
    alert('生词本是空的，没有可导出的单词');
    return;
  }

  // 按字母顺序排序
  const sortedWords = words.sort((a, b) => a[0].localeCompare(b[0]));

  // 构建 CSV 内容
  let csv = '单词,词性,定义,例句,保存日期\n';

  sortedWords.forEach(([word, data]) => {
    const savedDate = new Date(data.savedAt).toLocaleDateString('zh-CN');

    data.meanings?.forEach(meaning => {
      meaning.definitions?.forEach(def => {
        const partOfSpeech = meaning.partOfSpeech || '';
        const definition = (def.definition || '').replace(/"/g, '""');
        const example = (def.example || '').replace(/"/g, '""');

        csv += `"${word}","${partOfSpeech}","${definition}","${example}","${savedDate}"\n`;
      });
    });
  });

  // 下载文件
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
