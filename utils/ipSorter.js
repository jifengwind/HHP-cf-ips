/**
 * @fileoverview IP 排序工具模块
 * @description 提供 IP 地址的稳定排序功能
 */

const { detectISP } = require('./ispDetector');

/**
 * 对 IP 数组进行稳定排序
 * 排序规则：先按运营商排序，再按 IP 字符串排序
 * 
 * @param {string[]} ips - IP 地址数组
 * @returns {string[]} - 排序后的 IP 数组
 */
function stableSortIPs(ips) {
    // 创建副本避免修改原数组
    return [...ips].sort((a, b) => {
        const ispA = detectISP(a);
        const ispB = detectISP(b);

        // 按运营商排序：电信、联通、移动、多线
        if (ispA !== ispB) {
            return ispA.localeCompare(ispB, 'zh-CN');
        }
        
        // 同运营商内按 IP 字符串排序
        return a.localeCompare(b);
    });
}

module.exports = {
    stableSortIPs
};
