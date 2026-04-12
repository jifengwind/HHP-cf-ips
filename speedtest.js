const fs = require('fs');

// ==================== 配置区 ====================
const TOP_COUNT = 40; // 保留的IP数量
const PORT = 443;

// 多个公开的优选IP来源
const IP_SOURCES = [
    // cmliu 维护的优选IP
    'https://raw.githubusercontent.com/cmliu/CF-Workers-SUB/main/ADD.txt',
    // ip-scanner 扫描结果
    'https://raw.githubusercontent.com/ip-scanner/cloudflare/main/ips.txt',
    // 090227 优选IP
    'https://cf.090227.xyz',
    // 164746 优选IP
    'https://ip.164746.xyz',
    // Cloudflare 官方IP段（作为兜底）
    'https://www.cloudflare.com/ips-v4'
];

// 手动添加的已知优质IP段（兜底）
const FALLBACK_IPS = [
    '104.16.0.0', '104.16.1.0', '104.16.2.0', '104.16.3.0',
    '104.18.0.0', '104.18.1.0', '104.18.2.0', '104.18.3.0',
    '104.19.0.0', '104.19.1.0', '104.20.0.0', '104.20.1.0',
    '172.64.0.0', '172.64.1.0', '172.64.2.0', '172.64.3.0',
    '162.159.0.0', '162.159.1.0', '162.159.2.0', '162.159.3.0',
    '104.21.0.0', '104.21.1.0', '104.22.0.0', '104.22.1.0',
    '172.67.0.0', '172.67.1.0', '172.67.2.0', '172.67.3.0',
    '104.17.0.0', '104.17.1.0', '104.17.2.0', '104.17.3.0',
    '104.24.0.0', '104.24.1.0', '104.25.0.0', '104.25.1.0',
    '104.26.0.0', '104.26.1.0', '104.27.0.0', '104.27.1.0'
];
// =================================================

// 判断运营商（根据IP段）
function detectISP(ip) {
    if (!ip) return '未知';
    
    // 移动优选段
    if (ip.startsWith('104.16') || ip.startsWith('104.18') || 
        ip.startsWith('104.19') || ip.startsWith('104.28')) {
        return '移动';
    }
    // 联通优选段
    if (ip.startsWith('172.64') || ip.startsWith('172.67') || 
        ip.startsWith('104.23') || ip.startsWith('104.31')) {
        return '联通';
    }
    // 电信优选段
    if (ip.startsWith('162.159') || ip.startsWith('104.20') || 
        ip.startsWith('104.22')) {
        return '电信';
    }
    return '多线';
}

// 从URL获取IP列表
async function fetchIPsFromSource(url) {
    console.log(`  获取: ${url}`);
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        
        const res = await fetch(url, { 
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        clearTimeout(timeout);
        
        if (!res.ok) {
            console.log(`    ✗ HTTP ${res.status}`);
            return [];
        }
        
        const text = await res.text();
        
        // 提取所有IP地址（支持多种格式）
        const ipPattern = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g;
        const ips = [];
        let match;
        
        while ((match = ipPattern.exec(text)) !== null) {
            const ip = match[1];
            // 过滤掉私有IP和无效IP
            if (!ip.startsWith('0.') && 
                !ip.startsWith('10.') && 
                !ip.startsWith('127.') && 
                !ip.startsWith('169.254.') &&
                !ip.startsWith('172.1') && !ip.startsWith('172.2') && !ip.startsWith('172.3') &&
                !ip.startsWith('192.168.') &&
                !ip.startsWith('224.') && !ip.startsWith('225.') &&
                !ip.startsWith('240.')) {
                ips.push(ip);
            }
        }
        
        console.log(`    ✓ 获取到 ${ips.length} 个IP`);
        return ips;
        
    } catch (e) {
        console.log(`    ✗ 失败: ${e.message}`);
        return [];
    }
}

// 生成兜底IP
function generateFallbackIPs(count) {
    const ips = [];
    for (const base of FALLBACK_IPS) {
        const parts = base.split('.').slice(0, 3).join('.');
        const last = Math.floor(Math.random() * 254) + 1;
        ips.push(`${parts}.${last}`);
    }
    return ips.slice(0, count);
}

// 主函数
async function main() {
    console.log('🚀 开始收集 Cloudflare 优选 IP...\n');
    
    // 收集所有IP
    const allIPs = new Set();
    
    // 从各个来源获取
    for (const source of IP_SOURCES) {
        const ips = await fetchIPsFromSource(source);
        ips.forEach(ip => allIPs.add(ip));
    }
    
    console.log(`\n📊 去重前: 收集到 ${allIPs.size} 个IP`);
    
    // 转换为数组
    let ipArray = Array.from(allIPs);
    
    // 如果收集到的IP太少，补充兜底IP
    if (ipArray.length < TOP_COUNT) {
        console.log(`⚠️ 收集到的IP不足，补充兜底IP`);
        const fallback = generateFallbackIPs(TOP_COUNT * 2);
        fallback.forEach(ip => allIPs.add(ip));
        ipArray = Array.from(allIPs);
    }
    
    // 按运营商分类并均衡选择
    const ispGroups = {
        '移动': [],
        '联通': [],
        '电信': [],
        '多线': []
    };
    
    ipArray.forEach(ip => {
        const isp = detectISP(ip);
        if (ispGroups[isp]) {
            ispGroups[isp].push(ip);
        } else {
            ispGroups['多线'].push(ip);
        }
    });
    
    // 均衡选择：从每个运营商各取一部分
    const perISP = Math.ceil(TOP_COUNT / 3);
    const selected = [];
    
    ['移动', '联通', '电信'].forEach(isp => {
        const group = ispGroups[isp] || [];
        // 随机打乱
        const shuffled = group.sort(() => Math.random() - 0.5);
        selected.push(...shuffled.slice(0, perISP));
    });
    
    // 如果还不够，从多线里补充
    if (selected.length < TOP_COUNT) {
        const shuffled = (ispGroups['多线'] || []).sort(() => Math.random() - 0.5);
        selected.push(...shuffled.slice(0, TOP_COUNT - selected.length));
    }
    
    // 打乱最终顺序，取前 TOP_COUNT 个
    const finalIPs = selected.sort(() => Math.random() - 0.5).slice(0, TOP_COUNT);
    
    console.log(`✅ 最终选择 ${finalIPs.length} 个IP\n`);
    
    // 生成输出内容
    const lines = finalIPs.map(ip => {
        const isp = detectISP(ip);
        return `${ip}:${PORT}#${isp}优选`;
    });
    
    fs.writeFileSync('ips.txt', lines.join('\n'));
    
    // 统计信息
    console.log('📁 ips.txt 已生成');
    console.log('\n📊 运营商分布:');
    const stats = {};
    finalIPs.forEach(ip => {
        const isp = detectISP(ip);
        stats[isp] = (stats[isp] || 0) + 1;
    });
    Object.entries(stats).forEach(([isp, count]) => {
        console.log(`  ${isp}: ${count} 个`);
    });
    
    console.log('\n🏆 前10个IP:');
    finalIPs.slice(0, 10).forEach((ip, i) => {
        console.log(`  ${i+1}. ${ip}:${PORT} (${detectISP(ip)})`);
    });
    
    // 写入更新时间
    fs.writeFileSync('last-update.txt', new Date().toISOString());
    console.log(`\n⏰ 更新时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
}

main().catch(console.error);
