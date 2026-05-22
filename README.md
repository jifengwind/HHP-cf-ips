# Cloudflare 优选 IP 聚合工具

这个版本针对直接读取别人的 IP，按网址汇聚

## 项目结构

```
/workspace/
├── config.js              # 全局配置文件
├── speedtest.js           # 主程序入口
├── services/
│   └── ipFetcher.js       # IP 获取服务
├── utils/
│   ├── ipValidator.js     # IP 验证工具
│   ├── ispDetector.js     # ISP 识别工具
│   ├── ipSorter.js        # IP 排序工具
│   └── fileWriter.js      # 文件写入工具
├── ips.txt                # 输出的 IP 列表
├── ips-dj.txt             # 备用 IP 列表
└── last-update.txt        # 最后更新时间
```

## 模块说明

### config.js
集中管理所有配置项：
- 核心配置（IP 数量、端口、超时时间等）
- IP 源列表
- ISP 识别规则
- 私有地址段定义

### services/ipFetcher.js
负责从多个公开源获取 IP 地址：
- 支持多个 IP 源
- 自动去重
- HTTP 请求超时控制

### utils/ipValidator.js
IP 地址有效性校验：
- IPv4 格式验证
- 私有/保留地址过滤

### utils/ispDetector.js
根据 IP 前缀识别运营商：
- 移动、联通、电信识别
- 多线默认标签

### utils/ipSorter.js
IP 地址稳定排序：
- 按运营商优先级排序
- 同运营商内按 IP 字符串排序

### utils/fileWriter.js
输出处理：
- 生成指定格式的 IP 列表
- 统计运营商分布
- 写入文件

## 使用方法

```bash
node speedtest.js
```

## 配置说明

编辑 `config.js` 可自定义：
- `TOP_COUNT`: 最终选取的 IP 数量
- `PORT`: 目标端口
- `FETCH_TIMEOUT`: 请求超时时间
- `IP_SOURCES`: IP 源 URL 列表
- `ISP_RULES`: 运营商识别规则
