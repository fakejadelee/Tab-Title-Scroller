let currentFileId = null; // 当前文件的唯一标识
let currentText = "";     // 当前文件的内容
let currentTabId = null;  // 当前文件绑定的标签页 ID
let fileLoaded = false;   // 文件加载状态标志

// 恢复文件加载状态和标签页ID
function restoreState() {
  chrome.storage.local.get(['fileId', 'fileText', 'tabId', 'fileLoaded'], (data) => {
    if (data.fileId && data.fileText && data.tabId && data.fileLoaded) {
      currentFileId = data.fileId;
      currentText = data.fileText;
      currentTabId = data.tabId;
      fileLoaded = data.fileLoaded;
      console.log('恢复文件状态：', currentFileId, currentTabId);
    }
  });
}

// 保存文件加载状态和标签页ID
function saveState() {
  chrome.storage.local.set({
    fileId: currentFileId,
    fileText: currentText,
    tabId: currentTabId,
    fileLoaded: fileLoaded
  }, () => {
    console.log('文件状态已保存');
  });
}

// 监听消息并处理文件加载
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "loadFile") {
    const { fileId, fileText, tabId } = message;

    // 确保 tabId 存在
    if (!tabId) {
      console.error("无法获取有效的 tabId！");
      sendResponse({ success: false, error: "Invalid tabId" });
      return;
    }

    console.log("接收到加载文件的请求：", fileId, tabId);

    // 确保当前文件信息已正确设置
    currentFileId = fileId;
    currentText = fileText;
    currentTabId = tabId;  // 保存当前的 tabId
    fileLoaded = true;      // 设置文件已加载

    // 保存文件和 tabId 的映射关系
    saveState(); // 保存文件状态和标签页ID

    loadProgress(currentFileId, (progress) => {
      const initialTitle = currentText.slice(progress.index, progress.index + 10);

      // 更新标签页标题
      chrome.scripting.executeScript({
        target: { tabId: currentTabId }, // 使用已保存的 tabId
        func: (title) => {
          document.title = title;
        },
        args: [initialTitle],
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("无法更新标签标题：", chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log("文件加载成功：", currentFileId);
          sendResponse({ success: true });
        }
      });
    });

    return true; // 表示异步响应
  }
});

// 监听命令并执行
chrome.commands.onCommand.addListener((command) => {
  if (!fileLoaded) {
    console.error("文件未加载，无法执行命令！");
    return;
  }

  loadProgress(currentFileId, (progress) => {
    // 如果当前 tabId 无效，则重新查询并恢复
    if (!currentTabId) {
      restoreTabIdFromMapping(currentFileId, (tabId) => {
        if (tabId) {
          currentTabId = tabId;
          executeCommand(command, currentFileId, currentText, progress, currentTabId);
        } else {
          console.error("无法恢复标签页 ID，无法执行命令！");
        }
      });
    } else {
      executeCommand(command, currentFileId, currentText, progress, currentTabId);
    }
  });
});

// 恢复标签页ID
function restoreTabIdFromMapping(fileId, callback) {
  chrome.storage.local.get(['fileTabMapping'], (data) => {
    const fileTabMapping = data.fileTabMapping || {};
    const tabId = fileTabMapping[fileId];
    callback(tabId);
  });
}

// 保存进度
function saveProgress(fileId, progress) {
  chrome.storage.local.get(['fileProgress'], (data) => {
    const fileProgress = data.fileProgress || {};
    fileProgress[fileId] = progress;

    chrome.storage.local.set({ fileProgress }, () => {
      console.log(`进度已保存：文件 [${fileId}]`, progress);
    });
  });
}

// 恢复进度
function loadProgress(fileId, callback) {
  chrome.storage.local.get(['fileProgress'], (data) => {
    const fileProgress = data.fileProgress || {};
    const progress = fileProgress[fileId] || { index: 0, line: 0 };
    callback(progress);
  });
}

// 执行命令逻辑
function executeCommand(command, fileId, fileText, currentProgress, tabId) {
  const { index, line } = currentProgress;
  const lineLength = 10; // 每行显示的字符数
  let newIndex = index;
  let newLine = line;

  switch (command) {
    case "next-char":
      newIndex = (index + 1) % fileText.length;
      break;
    case "prev-char":
      newIndex = (index - 1 + fileText.length) % fileText.length;
      break;
    case "next-line":
      newLine = (line + 1) % Math.ceil(fileText.length / lineLength);
      newIndex = newLine * lineLength;
      break;
    case "prev-line":
      newLine = (line - 1 + Math.ceil(fileText.length / lineLength)) % Math.ceil(fileText.length / lineLength);
      newIndex = newLine * lineLength;
      break;
  }

  const newTitle = fileText.slice(newIndex, newIndex + lineLength);

  // 更新标签页标题
  chrome.scripting.executeScript({
    target: { tabId: tabId },  // 使用固定的 tabId
    func: (updatedTitle) => {
      document.title = updatedTitle;
    },
    args: [newTitle],
  }, () => {
    if (!chrome.runtime.lastError) {
      saveProgress(fileId, { index: newIndex, line: newLine }); // 保存进度
    } else {
      console.error("更新标题失败：", chrome.runtime.lastError.message);
    }
  });
}

// 页面加载时恢复状态
restoreState();
