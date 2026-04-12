const fs = require('fs');

// ==================== 配置区 ====================
const TEST_URL = 'https://speed.cloudflare.com/__down?bytes=10485760'; // 10MB测试文件
const TEST_DURATION = 5000; // 每个IP测试5秒
const TOP_COUNT = 30; // 保留最快的30个IP
const PORT = 443; // 端口

// Cloudflare IP 段
const CF_IP_RANGES = [
    '104.16.0.0/12',
    '104.18.0.0/16',
    '104.19.0.0/16',
    '104.20.0.0/16',
    '104.21.0.0/16',
    '104.22.0.0/16',
    '104.23.0.0/16',
    '104.24.0.0/16',
    '104.25.0.0/16',
    '104.26.0.0/16',
    '104.27.0.0/16',
    '104.28.0.0/16',
    '104.29.0.0/16',
    '104.30.0.0/16',
    '104.31.0.0/16',
    '172.64.0.0/13',
    '162.159.0.0/16'
];

// 基础优选IP（已验证的快速IP段）
const BASE_IPS = [
    '104.16.0.0', '104.16.1.0', '104.16.2.0', '104.16.3.0',
    '104.18.0.0', '104.18.1.0', '104.18.2.0', '104.18.3.0',
    '104.19.0.0', '104.19.1.0', '104.20.0.0', '104.20.1.0',
    '172.64.0.0', '172.64.1.0', '172.64.2.0', '172.64.3.0',
    '162.159.0.0', '162.159.1.0', '162.159.2.0', '162.159.3.0'
];
// =================================================

// 从 CIDR 生成随机 IP
function randomIPFromCIDR(cidr) {
    const [baseIP, prefixLen] = cidr.split('/');
    const prefix = parseInt(prefixLen);
    const hostBits = 32 - prefix;
    const ipParts = baseIP.split('.').map(Number);
    const ipInt = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    const randomOffset = Math.floor(Math.random() * Math.pow(2, hostBits));
    const mask = (0xFFFFFFFF << hostBits) >>> 0;
    const randomIPInt = ((ipInt & mask) >>> 0) + randomOffset;
    return `${(randomIPInt >>> 24) & 0xFF}.${(randomIPInt >>> 16) & 0xFF}.${(randomIPInt >>> 8) & 0xFF}.${randomIPInt & 0xFF}`;
}

// 生成测试IP列表
function generateTestIPs(count = 80) {
    const ips = new Set();
    
    // 先加入基础IP的变体
    for (const baseIP of BASE_IPS) {
        const parts = baseIP.split('.').map(Number);
        for (let i = 0; i < 4; i++) {
            const newIP = `${parts[0]}.${parts[1]}.${parts[2]}.${parts[3] + i}`;
            ips.add(newIP);
        }
    }
    
    // 从CIDR随机生成
    while (ips.size < count) {
        const cidr = CF_IP_RANGES[Math.floor(Math.random() * CF_IP_RANGES.length)];
        ips.add(randomIPFromCIDR(cidr));
    }
    
    return Array.from(ips).slice(0, count);
}

// 判断运营商
function detectISP(ip) {
    if (ip.startsWith('104.16') || ip.startsWith('104.18') || ip.startsWith('104.19')) {
        return '移动';
    } else if (ip.startsWith('172.64')) {
        return '联通';
    } else if (ip.startsWith('162.159')) {
        return '电信';
    }
    return '多线';
}

// 测速单个IP
async function testIP(ip) {
    const startTime = Date.now();
    let totalBytes = 0;
    let speed = 0;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TEST_DURATION);
        
        const response = await fetch(TEST_URL, {
            signal: controller.signal,
            headers: {
                'Host': 'speed.cloudflare.com',
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        const reader = response.body.getReader();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            totalBytes += value.length;
            
            if (Date.now() - startTime >= TEST_DURATION) {
                reader.cancel();
                clearTimeout(timeoutId);
                break;
            }
        }
        
        clearTimeout(timeoutId);
        
        const duration = (Date.now() - startTime) / 1000;
        speed = (totalBytes * 8) / (duration * 1024 * 1024);
        
    } catch (error) {
        const duration = (Date.now() - startTime) / 1000;
        if (totalBytes > 0) {
            speed = (totalBytes * 8) / (duration * 1024 * 1024);
        } else {
            speed = 0;
        }
    }
    
    return { ip, port: PORT, speed: Math.round(speed * 100) / 100, bytes: totalBytes };
}

// 并发测速
async function runSpeedTest(ipList, concurrency = 8) {
    const results = [];
    const queue = [...ipList];
    
    const workers = Array(concurrency).fill().map(async () => {
        while (queue.length > 0) {
            const ip = queue.shift();
            if (!ip) break;
            
            process.stdout.write(`  测试: ${ip}... `);
            const result = await testIP(ip);
            
            if (result.speed > 0) {
                results.push(result);
                console.log(`✓ ${result.speed} Mbps`);
            } else {
                console.log(`✗ 失败`);
            }
        }
    });
    
    await Promise.all(workers);
    return results;
}

// 生成带备注的IP列表
function generateIPList(results) {
    const sorted = results.sort((a, b) => b.speed - a.speed);
    const top = sorted.slice(0, TOP_COUNT);
    
    const lines = [];
    for (let i = 0; i < top.length; i++) {
        const r = top[i];
        const isp = detectISP(r.ip);
        lines.push(`${r.ip}:${r.port}#${isp} ${r.speed}Mbps`);
    }
    
    return {
        content: lines.join('\n'),
        stats: {
            total: results.length,
            top: top.length,
            maxSpeed: top[0]?.speed || 0,
            avgSpeed: Math.round(top.reduce((a, b) => a + b.speed, 0) / top.length * 100) / 100
        }
    };
}

// 主函数
async function main() {
    console.log('🚀 Cloudflare IP 优选测速开始...\n');
    
    console.log('📋 生成测试IP列表 (80个)...');
    const testIPs = generateTestIPs(80);
    console.log(`✓ 已生成 ${testIPs.length} 个IP\n`);
    
    console.log('⚡ 开始测速 (并发8)...');
    const results = await runSpeedTest(testIPs, 8);
    console.log(`\n✓ 测速完成，有效结果: ${results.length} 个\n`);
    
    const { content, stats } = generateIPList(results);
    
    fs.writeFileSync('ips.txt', content);
    console.log('📁 已写入 ips.txt\n');
    
    console.log('📊 统计信息:');
    console.log(`  测试总数: ${stats.total}`);
    console.log(`  保留数量: ${stats.top}`);
    console.log(`  最高速度: ${stats.maxSpeed} Mbps`);
    console.log(`  平均速度: ${stats.avgSpeed} Mbps`);
    
    if (results.length > 0) {
        console.log(`\n🏆 前5名:`);
        results.sort((a, b) => b.speed - a.speed).slice(0, 5).forEach((r, i) => {
            console.log(`  ${i+1}. ${r.ip}:${r.port} (${detectISP(r.ip)}) - ${r.speed} Mbps`);
        });
    }
    
    const timestamp = new Date().toISOString();
    fs.writeFileSync('last-update.txt', timestamp);
}

main().catch(console.error);
