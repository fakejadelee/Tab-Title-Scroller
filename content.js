let lines = [];
let currentLine = 0;
let currentIndex = 0;

// 接收文本内容并初始化
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "start") {
    lines = message.text.split("\n");
    updateTitle();
  }
});



// 更新标签标题
function updateTitle() {
  const text = lines[currentLine] || "";
  document.title = text.slice(currentIndex, currentIndex + 10);
}

// 热键操作
document.addEventListener("keydown", (e) => {
  console.log("键盘事件触发：", e);  // 查看是否捕获到键盘事件
  if (e.ctrlKey) {
    switch (e.key) {
      case "ArrowRight":
        currentIndex = Math.min(currentIndex + 1, lines[currentLine].length - 10);
        break;
      case "ArrowLeft":
        currentIndex = Math.max(currentIndex - 1, 0);
        break;
      case "ArrowDown":
        currentLine = Math.min(currentLine + 1, lines.length - 1);
        currentIndex = 0;
        break;
      case "ArrowUp":
        currentLine = Math.max(currentLine - 1, 0);
        currentIndex = 0;
        break;
      default:
        return;
    }
    updateTitle();
  }
});
