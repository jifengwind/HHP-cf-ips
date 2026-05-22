/**
 * @fileoverview ISP 识别工具模块
 * @description 根据 IP 地址前缀识别所属运营商
 */

const config = require('../config');

/**
 * 检测 IP 所属的运营商
 * 
 * @param {string} ip - IPv4 地址
 * @returns {string} - 运营商标识（移动/联通/电信/多线）
 */
function detectISP(ip) {
    if (!ip) {
        return config.DEFAULT_ISP;
    }

    // 遍历 ISP 规则，匹配 IP 前缀
    for (const [isp, prefixes] of Object.entries(config.ISP_RULES)) {
        for (const prefix of prefixes) {
            if (ip.startsWith(prefix)) {
                return isp;
            }
        }
    }

    return config.DEFAULT_ISP;
}

module.exports = {
    detectISP
};
