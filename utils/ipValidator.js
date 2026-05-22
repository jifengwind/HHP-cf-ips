/**
 * @fileoverview IP 验证工具模块
 * @description 提供 IPv4 地址有效性校验功能
 */

const config = require('../config');

/**
 * 检查 IP 是否为有效的公网 IPv4 地址
 * 
 * @param {string} ip - 待验证的 IP 地址
 * @returns {boolean} - 是否为有效的公网 IP
 */
function isValidPublicIP(ip) {
    if (!ip || typeof ip !== 'string') {
        return false;
    }

    const parts = ip.split('.').map(Number);

    // 1. 必须是 4 段数字
    if (parts.length !== 4) {
        return false;
    }
    
    // 2. 每段数字必须在 0-255 范围内
    if (parts.some(n => isNaN(n) || n < 0 || n > 255)) {
        return false;
    }

    // 3. 检查是否属于私有/保留地址段
    for (const range of config.PRIVATE_RANGES) {
        const [a, b, c, d] = parts;
        const [startA, startB, startC, startD] = range.start;
        const [endA, endB, endC, endD] = range.end;

        // 将 IP 转换为数值便于比较
        const ipValue = a * 16777216 + b * 65536 + c * 256 + d;
        const startValue = startA * 16777216 + startB * 65536 + startC * 256 + startD;
        const endValue = endA * 16777216 + endB * 65536 + endC * 256 + endD;

        if (ipValue >= startValue && ipValue <= endValue) {
            return false;
        }
    }

    return true;
}

module.exports = {
    isValidPublicIP
};
