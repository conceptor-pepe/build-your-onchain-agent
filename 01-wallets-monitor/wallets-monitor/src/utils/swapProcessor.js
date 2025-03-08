import BigNumber from 'bignumber.js';

// 定义 SOL 代币的地址常量
export const SOL_ADDRESS = 'So11111111111111111111111111111111111111112';
// 定义 USDC 代币的地址常量
export const USDC_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

/**
 * 格式化代币金额，将原始金额除以对应的小数位数
 * @param {string|number} amount - 原始代币金额
 * @param {number} decimals - 代币的小数位数
 * @returns {string} 格式化后的金额
 */
export function formatAmount(amount, decimals) {
  return new BigNumber(amount)
    .dividedBy(new BigNumber(10).pow(decimals))
    .toFixed();
}

/**
 * 处理交换事件数据，将 webhook 数据转换为标准格式
 * @param {Object} webhookData - webhook 原始数据
 * @returns {Object} 处理后的标准格式数据
 */
export function processSwapData(webhookData) {
  const swapEvent = webhookData.events.swap;
  let processedData = {};

  // 处理输入代币信息
  if (swapEvent.nativeInput && swapEvent.nativeInput.amount) {
    // 处理原生 SOL 代币输入
    processedData = {
      account: webhookData.feePayer,          // 支付手续费的账户
      token_in_address: SOL_ADDRESS,          // 输入代币地址（SOL）
      token_in_amount: formatAmount(parseInt(swapEvent.nativeInput.amount), 9)  // SOL 有 9 位小数
    };
  } else if (swapEvent.tokenInputs && swapEvent.tokenInputs.length > 0) {
    // 处理其他代币输入
    const tokenInput = swapEvent.tokenInputs[0];
    processedData = {
      account: webhookData.feePayer,          // 支付手续费的账户
      token_in_address: tokenInput.mint,      // 输入代币的铸造地址
      token_in_amount: formatAmount(
        parseInt(tokenInput.rawTokenAmount.tokenAmount),
        tokenInput.rawTokenAmount.decimals    // 使用代币自身的小数位数
      )
    };
  }

  // 处理输出代币信息
  if (swapEvent.nativeOutput && swapEvent.nativeOutput.amount) {
    // 处理原生 SOL 代币输出
    processedData.token_out_address = SOL_ADDRESS;
    processedData.token_out_amount = formatAmount(parseInt(swapEvent.nativeOutput.amount), 9);
  } else if (swapEvent.tokenOutputs && swapEvent.tokenOutputs.length > 0) {
    // 处理其他代币输出
    const tokenOutput = swapEvent.tokenOutputs[0];
    processedData.token_out_address = tokenOutput.mint;
    processedData.token_out_amount = formatAmount(
      parseInt(tokenOutput.rawTokenAmount.tokenAmount),
      tokenOutput.rawTokenAmount.decimals
    );
  }

  // 添加时间戳和描述信息
  processedData.timestamp = webhookData.timestamp;    // 交易时间戳
  processedData.description = webhookData.description; // 交易描述

  return processedData;
}
