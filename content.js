// content.js - 划词词典插件

let currentPopup = null;
let isProcessing = false;

// 防抖函数 - 避免快速选词时频繁请求
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 获取用户选中的文本
function getSelectedText() {
  const selection = window.getSelection();
  return selection.toString().trim();
}

// 关闭当前弹窗
function closePopup() {
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }
  isProcessing = false;
}

// 创建弹窗元素
function createPopup() {
  const popup = document.createElement('div');
  popup.className = 'dict-popup';
  document.body.appendChild(popup);
  return popup;
}

// 显示加载状态
function showLoading(popup, word) {
  popup.innerHTML = `
    <div class="dict-popup-header">
      <h3 class="dict-popup-word">${word}</h3>
    </div>
    <div class="dict-popup-loading">
      🔄 正在查找...
    </div>
  `;
}

// 显示错误信息
function showError(popup, word, message) {
  popup.innerHTML = `
    <div class="dict-popup-header">
      <h3 class="dict-popup-word">${word}</h3>
    </div>
    <div class="dict-popup-error">
      😕 ${message}
    </div>
  `;
}

// 显示词典定义
function showDefinition(popup, word, data) {
  if (!data || !data[0]) {
    showError(popup, word, '未找到该单词的定义');
    return;
  }

  const entry = data[0];
  const wordWithPhonetic = entry.word;
  const meanings = entry.meanings || [];

  // 获取音频链接（优先找英式发音，其次美式）
  let audioUrl = null;
  if (entry.phonetics && entry.phonetics.length > 0) {
    // 查找有音频的 phonetic
    const withAudio = entry.phonetics.find(p => p.audio && p.audio !== '');
    if (withAudio) {
      audioUrl = withAudio.audio;
    }
  }

  // 构建定义 HTML
  let definitionsHtml = '';

  meanings.forEach((meaning, index) => {
    const partOfSpeech = meaning.partOfSpeech;
    const definitions = meaning.definitions.slice(0, 3); // 最多显示 3 个定义

    definitionsHtml += `<div class="dict-popup-definition">`;

    definitions.forEach((def, i) => {
      definitionsHtml += `
        <div>
          <span class="dict-popup-part-of-speech">${partOfSpeech}</span>
          <span>${def.definition}</span>
          ${def.example ? `<div class="dict-popup-example">"${def.example}"</div>` : ''}
        </div>
      `;
    });

    definitionsHtml += `</div>`;
  });

  // 构建标题栏（包含发音按钮）
  const headerHtml = `
    <div class="dict-popup-header">
      <div class="dict-popup-header-left">
        <h3 class="dict-popup-word">${wordWithPhonetic}</h3>
        ${audioUrl ? `<button class="dict-popup-audio" data-audio="${audioUrl}" title="播放发音">🔊</button>` : ''}
      </div>
    </div>
  `;

  popup.innerHTML = `
    ${headerHtml}
    <div class="dict-popup-content">
      ${definitionsHtml}
    </div>
  `;

  // 绑定发音按钮事件
  if (audioUrl) {
    const audioBtn = popup.querySelector('.dict-popup-audio');
    audioBtn.addEventListener('click', () => playAudio(audioUrl, audioBtn));
  }
}

// 播放音频
function playAudio(audioUrl, button) {
  const audio = new Audio(audioUrl);

  audio.addEventListener('play', () => {
    button.textContent = '🔉';
    button.classList.add('playing');
  });

  audio.addEventListener('ended', () => {
    button.textContent = '🔊';
    button.classList.remove('playing');
  });

  audio.addEventListener('error', () => {
    button.textContent = '❌';
    setTimeout(() => {
      button.textContent = '🔊';
    }, 1000);
  });

  audio.play().catch(err => {
    console.error('播放失败:', err);
    button.textContent = '❌';
    setTimeout(() => {
      button.textContent = '🔊';
    }, 1000);
  });
}

// 从 Free Dictionary API 获取定义
async function fetchDefinition(word) {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}

// 计算弹窗位置（避免超出屏幕）
function positionPopup(popup, x, y) {
  popup.style.left = x + 'px';
  popup.style.top = y + 'px';

  // 检查是否超出屏幕底部
  const popupRect = popup.getBoundingClientRect();
  const windowHeight = window.innerHeight;

  if (popupRect.bottom > windowHeight - 20) {
    // 如果超出底部，显示在选中文本上方
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rects = range.getClientRects();
      if (rects.length > 0) {
        popup.style.top = (rects[0].top - popupRect.height - 10) + 'px';
      }
    }
  }

  // 检查是否超出屏幕右侧
  if (popupRect.right > window.innerWidth - 20) {
    popup.style.left = (window.innerWidth - popupRect.width - 20) + 'px';
  }
}

// 处理文本选择
async function handleTextSelection() {
  const selectedText = getSelectedText();

  // 如果没有选中文本，关闭弹窗
  if (!selectedText) {
    closePopup();
    return;
  }

  // 只处理单个单词（允许连字符和撇号）
  const wordPattern = /^[a-zA-Z]+(?:['-][a-zA-Z]+)*$/;
  if (!wordPattern.test(selectedText)) {
    closePopup();
    return;
  }

  // 避免重复处理同一个词
  if (isProcessing) return;
  isProcessing = true;

  // 关闭之前的弹窗
  closePopup();

  // 创建新弹窗
  const popup = createPopup();
  currentPopup = popup;

  // 获取选中文本的位置
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    if (rects.length > 0) {
      positionPopup(popup, rects[0].left, rects[0].bottom + 10);
    }
  }

  // 显示加载状态
  showLoading(popup, selectedText);

  // 获取并显示定义
  const definitionData = await fetchDefinition(selectedText);

  if (definitionData) {
    showDefinition(popup, selectedText, definitionData);
  } else {
    showError(popup, selectedText, '未找到该单词的定义');
  }
}

// 使用防抖处理文本选择（延迟 300ms）
const debouncedHandleSelection = debounce(handleTextSelection, 300);

// 监听文本选择事件
document.addEventListener('mouseup', (e) => {
  // 只在左键点击时触发
  if (e.button === 0) {
    debouncedHandleSelection();
  }
});

// 监听键盘事件（按 Esc 关闭弹窗）
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closePopup();
  }
});

// 点击页面其他地方关闭弹窗
document.addEventListener('click', (e) => {
  if (currentPopup && !currentPopup.contains(e.target)) {
    closePopup();
  }
});

console.log('📚 English Dictionary 插件已加载');
