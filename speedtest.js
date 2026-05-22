/**
 * @fileoverview Cloudflare 优选 IP 聚合工具 - 主程序
 * @description 从多个公开源获取 Cloudflare 优选 IP，经过去重、排序后输出
 * 
 * @module speedtest
 */

const config = require('./config');
const { fetchAllIPs } = require('./services/ipFetcher');
const { stableSortIPs } = require('./utils/ipSorter');
const {
    writeIPsToFile,
    printISPStats,
    printIPPreview,
    printUpdateTime
} = require('./utils/fileWriter');

/**
 * 主函数
 */
async function main() {
    console.log('开始聚合 Cloudflare 优选 IP...\n');

    // 1. 获取所有 IP 并去重
    const allIPs = await fetchAllIPs();
    let ipArray = Array.from(allIPs);

    console.log(`\n去重后共 ${ipArray.length} 个 IP`);

    if (ipArray.length === 0) {
        throw new Error('所有源均获取失败，没有可用 IP');
    }

    // 2. 稳定排序
    ipArray = stableSortIPs(ipArray);

    // 3. 截取前 TOP_COUNT 个
    const finalIPs = ipArray.slice(0, config.TOP_COUNT);

    // 4. 写入文件
    writeIPsToFile(finalIPs, config.PORT);

    // 5. 输出统计信息
    printISPStats(finalIPs);
    printIPPreview(finalIPs, config.PORT);
    printUpdateTime();
}

// 执行主函数
main().catch(err => {
    console.error('❌ 执行失败:', err.message);
    process.exit(1);
});
