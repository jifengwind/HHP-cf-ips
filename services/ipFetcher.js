/**
 * @fileoverview IP 获取器模块
 * @description 从多个源获取 Cloudflare 优选 IP 地址
 */

const config = require('../config');
const { isValidPublicIP } = require('../utils/ipValidator');

/**
 * 从单个源获取 IP 列表
 * 
 * @param {string} url - 源 URL
 * @returns {Promise<string[]>} - IP 地址数组
 */
async function fetchIPsFromSource(url) {
    console.log(`正在获取：${url}`);

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.FETCH_TIMEOUT);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        clearTimeout(timeout);

        if (!res.ok) {
            console.log(`  失败：HTTP ${res.status}`);
            return [];
        }

        const text = await res.text();
        
        // 通用 IP 提取正则，适用于大多数包含 IP 的页面
        const ipPattern = /(\d{1,3}(?:\.\d{1,3}){3})/g;
        const ips = [];

        let match;
        while ((match = ipPattern.exec(text)) !== null) {
            const ip = match[1];
            if (isValidPublicIP(ip)) {
                ips.push(ip);
            }
        }

        console.log(`  成功获取 ${ips.length} 个 IP`);
        return ips;
    } catch (e) {
        console.log(`  获取失败：${e.message}`);
        return [];
    }
}

/**
 * 从所有源获取 IP 并去重
 * 
 * @returns {Promise<Set<string>>} - 去重后的 IP 集合
 */
async function fetchAllIPs() {
    const allIPs = new Set();

    for (const source of config.IP_SOURCES) {
        const ips = await fetchIPsFromSource(source);
        ips.forEach(ip => allIPs.add(ip));
    }

    return allIPs;
}

module.exports = {
    fetchIPsFromSource,
    fetchAllIPs
};
