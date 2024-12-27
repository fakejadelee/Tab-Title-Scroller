document.getElementById("apply").addEventListener("click", () => {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("请选择一个文件！");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const fileText = reader.result.trim();
    const fileId = generateFileId(file); // 根据文件生成唯一 ID

    // 将文本分成多行
    const lines = fileText.split("\n");

    // 调试输出，确认消息结构
    console.log("发送加载文件消息：", { fileId, lines });

    // 查询当前活动的标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        console.error("无法获取活动标签页！");
        return;
      }

      const currentTabId = tabs[0].id;

      // 向 background.js 发送加载文件消息
      chrome.runtime.sendMessage({
        action: "loadFile",
        fileId,
        lines,
        tabId: currentTabId,
      }, (response) => {
        if (response && response.success) {
          console.log(`文件 [${file.name}] 加载成功！`);
        } else {
          console.error("文件加载失败！", response.error);
        }
      });
    });
  };

  reader.readAsText(file); // 读取文件内容为文本
});

// 生成文件唯一 ID（根据文件名、大小和修改时间）
function generateFileId(file) {
  return `${file.name}_${file.size}_${file.lastModified}`;
}
