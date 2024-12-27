let currentFileId = null;
let currentLines = [];
let currentTabId = null;
const charsPerPage = 50;  // 每次显示的字符数

// 恢复文件加载状态和标签页ID
function restoreState() {
  chrome.storage.local.get(['fileId', 'lines', 'tabId'], (data) => {
    if (data.fileId && data.lines && data.tabId) {
      currentFileId = data.fileId;
      currentLines = data.lines;
      currentTabId = data.tabId;
      console.log('[恢复状态] 文件ID:', currentFileId, '标签页ID:', currentTabId);
    } else {
      console.warn('[恢复状态] 没有找到保存的状态');
    }
  });
}

// 保存文件加载状态和标签页ID
function saveState() {
  chrome.storage.local.set({
    fileId: currentFileId,
    lines: currentLines,
    tabId: currentTabId,
  }, () => {
    console.log('[保存状态] 文件ID:', currentFileId, '标签页ID:', currentTabId);
  });
}

// 保存当前进度
function saveProgress(fileId, progress) {
  chrome.storage.local.set({ [`progress_${fileId}`]: progress }, () => {
    console.log('[保存进度] 文件ID:', fileId, '进度:', progress);
  });
}

// 恢复进度
function getProgress(fileId, callback) {
  chrome.storage.local.get([`progress_${fileId}`], (data) => {
    const progress = data[`progress_${fileId}`] || { index: 0 };  // 只记录字符位置
    console.log('[恢复进度] 文件ID:', fileId, '进度:', progress);
    callback(progress);
  });
}

// 执行命令逻辑
function executeCommand(command, fileId, fileLines, currentProgress, tabId) {
  console.log('[执行命令] 指令:', command, '当前进度:', currentProgress);

  let newIndex = currentProgress.index;

  switch (command) {
    case "next-char":
      newIndex = (newIndex + charsPerPage) % fileLines.join('').length;  // 向下滚动固定字符数
      break;
    case "prev-char":
      newIndex = (newIndex - charsPerPage + fileLines.join('').length) % fileLines.join('').length;  // 向上滚动固定字符数
      break;
    default:
      console.warn('[执行命令] 未知指令:', command);
      return;
  }

  const newText = fileLines.join('').slice(newIndex, newIndex + charsPerPage);  // 获取新的文本片段
  console.log('[执行命令] 新文本:', newText, '新进度:', { index: newIndex });

  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (updatedText) => {
      // 检查是否已经存在文本框
      const existingTextBox = document.getElementById("custom-text-box");
      if (existingTextBox) {
        console.log('[页面脚本] 更新文本框内容:', updatedText);
        existingTextBox.textContent = updatedText;
        return;
      }

      // 创建新的文本框（无圆角，尖角矩形）
      const textBox = document.createElement('div');
      textBox.id = "custom-text-box";
      textBox.style.position = 'fixed';
      textBox.style.left = '10px';  // 设置距离左侧固定的距离
      textBox.style.bottom = '0px';  // 确保文本框贴底
      textBox.style.backgroundColor = 'gray';
      textBox.style.color = 'white';
      textBox.style.fontSize = '12px';
      textBox.style.padding = '5px';
      textBox.style.zIndex = '9999';
      textBox.style.whiteSpace = 'pre-wrap';  // 支持换行显示
      textBox.style.overflowY = 'hidden';  // 不显示纵向滚动条
      textBox.style.maxHeight = '40px';  // 固定最大高度，确保只显示一行
      textBox.style.borderRadius = '0px';  // 无圆角，尖角样式
      textBox.style.boxShadow = '0px 0px 10px rgba(0, 0, 0, 0.5)';  // 添加阴影效果
      textBox.textContent = updatedText;
      
      // 添加到页面
      document.body.appendChild(textBox);
      console.log('[页面脚本] 新文本框已添加:', updatedText);
    },
    args: [newText],
  }, (result) => {
    if (chrome.runtime.lastError) {
      console.error("[执行命令] executeScript 执行失败:", chrome.runtime.lastError.message);
    } else {
      console.log("[执行命令] 脚本执行成功:", result);
      saveProgress(fileId, { index: newIndex });
    }
  });
}

// 监听快捷键命令
chrome.commands.onCommand.addListener((command) => {
  console.log('[快捷键监听] 接收到命令:', command);

  if (!currentFileId || !currentLines.length || !currentTabId) {
    console.error('[快捷键监听] 缺少必要的文件或标签页信息');
    return;
  }

  getProgress(currentFileId, (progress) => {
    executeCommand(command, currentFileId, currentLines, progress, currentTabId);
  });
});

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[消息监听] 接收到消息:", message);

  if (message.action === "loadFile") {
    const { fileId, lines, tabId } = message;
    if (!fileId || !lines || !tabId) {
      console.error("[消息监听] 消息内容缺失:", { fileId, lines, tabId });
      sendResponse({ success: false, error: "Missing required fields" });
      return;
    }

    console.log("[消息监听] 加载文件请求:", fileId, tabId);
    currentFileId = fileId;
    currentLines = lines;
    currentTabId = tabId;
    saveState();

    getProgress(fileId, (progress) => {
      executeCommand("next-char", fileId, lines, progress, tabId);
    });

    sendResponse({ success: true });
    return true;
  }
});

// 初始化时恢复状态
restoreState();
console.log('[初始化] 恢复状态完成');
