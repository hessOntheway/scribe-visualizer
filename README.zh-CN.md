# Scribe Visualizer

[中文](README.zh-CN.md) | [English](README.en.md)

Scribe Visualizer 是 `scribe-engine` 的配套可视化工具。

它用于可视化多轮 LLM 执行日志，帮助你快速查看：

- 每一轮循环步骤（request -> response）
- 触发下一次模型调用的消息链路
- 当前轮上下文中的用户问题
- Assistant 回复与结束原因
- 模型发出的工具调用
- Token 使用情况（prompt / completion / total）

## 快速开始

1. 安装依赖

```bash
npm install
```

2. 启动前后端

```bash
npm run dev
```

3. 打开页面

- http://localhost:5173

## 数据输入方式

- 上传 JSON 文件
- 输入本地文件路径（由后端读取）
- 直接粘贴原始 JSON 内容
