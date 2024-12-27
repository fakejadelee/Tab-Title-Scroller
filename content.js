// 初始化文本框
function initTextBox() {
  const textBox = document.createElement("div");
  textBox.id = "floatingTextBox";
  textBox.style.position = "fixed";
  textBox.style.bottom = "0px";
  textBox.style.left = "0px";
  textBox.style.background = "rgba(0, 0, 0, 0.7)";
  textBox.style.color = "white";
  textBox.style.padding = "5px";
  textBox.style.fontSize = "12px";
  textBox.style.fontFamily = "Arial, sans-serif";
  textBox.style.zIndex = "1000";
  textBox.style.borderRadius = "0px";  // 如果你不要圆角
  textBox.style.maxWidth = "200%";
  textBox.style.overflow = "hidden";
  textBox.style.whiteSpace = "pre-wrap"; // 支持换行显示
  document.body.appendChild(textBox);
  console.log("文本框已添加到页面");
  return textBox;
}

// 更新文本框内容
function updateTextBoxContent(text) {
  const textBox = document.getElementById("floatingTextBox");
  if (!textBox) {
    console.error("文本框未找到！");
    return;
  }
  textBox.textContent = text;
  console.log("文本框内容已更新为：", text);
}

// 接收恢复状态消息
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "restoreState") {
    console.log("收到恢复状态的消息：", message);
    const { lines, currentIndex } = message;
    const textBox = document.getElementById("floatingTextBox") || initTextBox();
    const textToDisplay = lines[currentIndex] || "";
    updateTextBoxContent(textToDisplay);
  }
});

// 注入 content.js
chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  const tabId = tabs[0].id; // 获取当前活动标签页的ID
  chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"]
  }, () => {
    console.log("已重新注入 content.js");
  });
});
