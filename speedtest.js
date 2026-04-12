const fs = require('fs');

// ==================== 配置区 ====================
const TOP_COUNT = 20; // 保留最快的20个IP
const PORT = 443;

// 常用优选IP列表（直接测试，不随机生成）
const TEST_IPS = [
    '104.16.0.0', '104.16.1.0', '104.16.2.0', '104.16.3.0',
    '104.18.0.0', '104.18.1.0', '104.18.2.0', '104.18.3.0',
    '104.19.0.0', '104.19.1.0', '104.20.0.0', '104.20.1.0',
    '172.64.0.0', '172.64.1.0', '172.64.2.0', '172.64.3.0',
    '162.159.0.0', '162.159.1.0', '162.159.2.0', '162.159.3.0',
    '104.21.0.0', '104.21.1.0', '104.22.0.0', '104.22.1.0',
    '172.67.0.0', '172.67.1.0', '172.67.2.0', '172.67.3.0',
    '104.17.0.0', '104.17.1.0', '104.17.2.0', '104.17.3.0'
];
// =================================================

function detectISP(ip) {
    if (ip.startsWith('104.16') || ip.startsWith('104.18') || ip.startsWith('104.19')) return '移动';
    if (ip.startsWith('172.64') || ip.startsWith('172.67')) return '联通';
    if (ip.startsWith('162.159')) return '电信';
    return '多线';
}

// 生成随机末位IP
function generateIPList() {
    const ips = [];
    for (const base of TEST_IPS) {
        const parts = base.split('.').slice(0, 3).join('.');
        const last = Math.floor(Math.random() * 254) + 1;
        ips.push(`${parts}.${last}`);
    }
    return ips;
}

// 简单测速（用 fetch 测试延迟）
async function testIP(ip) {
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const res = await fetch(`https://${ip}/cdn-cgi/trace`, {
            signal: controller.signal,
            headers: { 'Host': 'cloudflare.com' }
        });
        
        clearTimeout(timeout);
        const delay = Date.now() - start;
        
        if (res.ok) {
            return { ip, port: PORT, speed: Math.round(10000 / delay * 10) / 10 };
        }
    } catch (e) {}
    return null;
}

async function main() {
    console.log('🚀 开始测试 Cloudflare IP...\n');
    
    const testIPs = generateIPList();
    console.log(`📋 测试 ${testIPs.length} 个IP\n`);
    
    const results = [];
    for (const ip of testIPs) {
        process.stdout.write(`  测试 ${ip}... `);
        const r = await testIP(ip);
        if (r) {
            results.push(r);
            console.log(`✓ ${r.speed} 分`);
        } else {
            console.log(`✗ 失败`);
        }
    }
    
    console.log(`\n✅ 有效结果: ${results.length} 个\n`);
    
    if (results.length === 0) {
        // 如果没有有效结果，生成默认IP
        console.log('⚠️ 无有效结果，生成默认IP列表');
        const defaultLines = TEST_IPS.slice(0, TOP_COUNT).map(ip => {
            const parts = ip.split('.').slice(0, 3).join('.');
            const last = Math.floor(Math.random() * 254) + 1;
            const finalIP = `${parts}.${last}`;
            return `${finalIP}:${PORT}#${detectISP(ip)} 默认`;
        });
        fs.writeFileSync('ips.txt', defaultLines.join('\n'));
    } else {
        const sorted = results.sort((a, b) => b.speed - a.speed);
        const top = sorted.slice(0, TOP_COUNT);
        
        const lines = top.map(r => `${r.ip}:${r.port}#${detectISP(r.ip)} ${r.speed}`);
        fs.writeFileSync('ips.txt', lines.join('\n'));
        
        console.log('📊 前5名:');
        top.slice(0, 5).forEach((r, i) => {
            console.log(`  ${i+1}. ${r.ip}:${r.port} (${detectISP(r.ip)}) - ${r.speed}`);
        });
    }
    
    fs.writeFileSync('last-update.txt', new Date().toISOString());
    console.log('\n📁 ips.txt 已生成');
}

main();
