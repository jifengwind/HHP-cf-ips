const fs = require('fs');

// ==================== 配置区 ====================
const TOP_COUNT = 40;           // 最终选取的IP数量
const PORT = 443;               // 目标端口

// 多个公开优选源
const IP_SOURCES = [
    'https://ip.164746.xyz',                                    // 源1：原配置，可直接抓取
    'https://www.wetest.vip/page/cloudflare/address_v4.html'    // 源2：微测网，页面包含IP表格
    // 'https://vps789.com/cfip/'                               // 源3：VPS789，目前返回404，暂时注释，待确认新地址后启用
];
// =================================================

// 经验标签（仅用于标注）
function detectISP(ip) {
    if (!ip) return '多线';

    if (
        ip.startsWith('104.16') ||
        ip.startsWith('104.18') ||
        ip.startsWith('104.19') ||
        ip.startsWith('104.28')
    ) {
        return '移动';
    }

    if (
        ip.startsWith('172.64') ||
        ip.startsWith('172.67') ||
        ip.startsWith('104.23') ||
        ip.startsWith('104.31')
    ) {
        return '联通';
    }

    if (
        ip.startsWith('162.159') ||
        ip.startsWith('104.20') ||
        ip.startsWith('104.22')
    ) {
        return '电信';
    }

    return '多线';
}

// 更严谨的无效IP过滤
function isValidPublicIP(ip) {
    const parts = ip.split('.').map(Number);

    if (parts.length !== 4) return false;
    if (parts.some(n => isNaN(n) || n < 0 || n > 255)) return false;

    // 私网/保留地址过滤
    if (parts[0] === 0) return false;
    if (parts[0] === 10) return false;
    if (parts[0] === 127) return false;
    if (parts[0] === 169 && parts[1] === 254) return false;
    if (parts[0] === 192 && parts[1] === 168) return false;

    // 172.16 - 172.31
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
        return false;
    }

    // multicast / reserved
    if (parts[0] >= 224) return false;

    return true;
}

// 拉取单个源
async function fetchIPsFromSource(url) {
    console.log(`正在获取: ${url}`);

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        clearTimeout(timeout);

        if (!res.ok) {
            console.log(`  失败: HTTP ${res.status}`);
            return [];
        }

        const text = await res.text();
        
        // 通用IP提取正则，适用于大多数包含IP的页面
        const ipPattern = /(\d{1,3}(?:\.\d{1,3}){3})/g;
        const ips = [];

        let match;
        while ((match = ipPattern.exec(text)) !== null) {
            const ip = match[1];
            if (isValidPublicIP(ip)) {
                ips.push(ip);
            }
        }

        console.log(`  成功获取 ${ips.length} 个IP`);
        return ips;
    } catch (e) {
        console.log(`  获取失败: ${e.message}`);
        return [];
    }
}

// 稳定排序：避免每次大幅变动
function stableSortIPs(ips) {
    return ips.sort((a, b) => {
        const ispA = detectISP(a);
        const ispB = detectISP(b);

        // 按运营商排序：电信、联通、移动、多线
        if (ispA !== ispB) {
            return ispA.localeCompare(ispB);
        }
        // 同运营商内按IP排序
        return a.localeCompare(b);
    });
}

// 主函数
async function main() {
    console.log('开始聚合 Cloudflare 优选IP...\n');

    const allIPs = new Set();

    for (const source of IP_SOURCES) {
        const ips = await fetchIPsFromSource(source);
        ips.forEach(ip => allIPs.add(ip));
    }

    let ipArray = Array.from(allIPs);

    console.log(`\n去重后共 ${ipArray.length} 个IP`);

    if (ipArray.length === 0) {
        throw new Error('所有源均获取失败，没有可用IP');
    }

    // 稳定排序
    ipArray = stableSortIPs(ipArray);

    // 截取前 TOP_COUNT
    const finalIPs = ipArray.slice(0, TOP_COUNT);

    // 按所需格式生成输出行
    const lines = finalIPs.map(ip => {
        return `${ip}:${PORT}#${detectISP(ip)}优选`;
    });

    // 写入文件
    fs.writeFileSync('ips.txt', lines.join('\n'));
    fs.writeFileSync('last-update.txt', new Date().toISOString());

    console.log(`\n✅ 已生成 ${finalIPs.length} 个IP，格式：IP:${PORT}#运营商优选`);
    console.log('📁 文件已写入: ips.txt');

    // 统计运营商分布
    const stats = {};
    finalIPs.forEach(ip => {
        const isp = detectISP(ip);
        stats[isp] = (stats[isp] || 0) + 1;
    });

    console.log('\n📊 运营商分布:');
    Object.entries(stats).forEach(([isp, count]) => {
        console.log(`   ${isp}: ${count}`);
    });

    console.log('\n📋 前10个IP预览:');
    finalIPs.slice(0, 10).forEach((ip, index) => {
        console.log(`   ${index + 1}. ${ip}:${PORT}#${detectISP(ip)}优选`);
    });

    console.log('\n⏰ 更新时间:', new Date().toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai'
    }));
}

main().catch(err => {
    console.error('❌ 执行失败:', err.message);
    process.exit(1);
});
