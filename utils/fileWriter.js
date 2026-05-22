/**
 * @fileoverview 文件操作工具模块
 * @description 提供 IP 列表写入和统计输出功能
 */

const fs = require('fs');
const config = require('../config');
const { detectISP } = require('./ispDetector');

/**
 * 将 IP 列表写入文件
 * 
 * @param {string[]} ips - IP 地址数组
 * @param {number} port - 端口号
 */
function writeIPsToFile(ips, port) {
    const lines = ips.map(ip => {
        return `${ip}:${port}#${detectISP(ip)}优选`;
    });

    fs.writeFileSync(config.OUTPUT_FILE, lines.join('\n'));
    fs.writeFileSync(config.UPDATE_TIME_FILE, new Date().toISOString());

    console.log(`\n✅ 已生成 ${ips.length} 个 IP，格式：IP:${port}#运营商优选`);
    console.log(`📁 文件已写入：${config.OUTPUT_FILE}`);
}

/**
 * 统计并打印运营商分布
 * 
 * @param {string[]} ips - IP 地址数组
 */
function printISPStats(ips) {
    const stats = {};
    ips.forEach(ip => {
        const isp = detectISP(ip);
        stats[isp] = (stats[isp] || 0) + 1;
    });

    console.log('\n📊 运营商分布:');
    Object.entries(stats).forEach(([isp, count]) => {
        console.log(`   ${isp}: ${count}`);
    });
}

/**
 * 打印前 N 个 IP 预览
 * 
 * @param {string[]} ips - IP 地址数组
 * @param {number} port - 端口号
 * @param {number} count - 预览数量
 */
function printIPPreview(ips, port, count = 10) {
    console.log(`\n📋 前${count}个 IP 预览:`);
    ips.slice(0, count).forEach((ip, index) => {
        console.log(`   ${index + 1}. ${ip}:${port}#${detectISP(ip)}优选`);
    });
}

/**
 * 打印更新时间
 */
function printUpdateTime() {
    console.log('\n⏰ 更新时间:', new Date().toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai'
    }));
}

module.exports = {
    writeIPsToFile,
    printISPStats,
    printIPPreview,
    printUpdateTime
};
