// 导入所需的依赖
import { createClient } from '@supabase/supabase-js';
import { processSwapData } from '../../src/utils/swapProcessor';
import { solParser } from '../../src/utils/txParser';

// 初始化 Supabase 客户端
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * 处理 Webhook 请求的主函数
 * 主要功能:
 * 1. 验证请求方法和授权
 * 2. 解析交易数据
 * 3. 处理 SWAP 交易
 * 4. 存储交易数据到数据库
 */
export default async function handler(req, res) {
  // 检查请求方法是否为 POST
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  // 验证请求头中的 API Key
  if (req.headers.authorization !== `Bearer ${process.env.HELIUS_API_KEY}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // 获取并检查交易数据
  const txData = Array.isArray(req.body) ? req.body[0] : req.body;
  if (!txData) {
    console.error('Empty transaction data received', txData);
    return res.status(200).json({ skipped: true, message: 'Empty data' });
  }

  // 处理交易数据
  let processedData = null;

  // 根据不同数据来源处理交易
  if (txData.events?.swap) {
    // 使用 Helius 解析器处理 SWAP 事件
    processedData = processSwapData(txData);
  } else if (txData.signature) {
    // 使用 Solana 解析器处理交易签名
    processedData = await solParser(txData.signature);
    if (!processedData) {
      console.error('Failed to parse tx:', txData.signature);
      return res.status(200).json({ skipped: true, message: 'Parse failed', signature: txData.signature });
    }
  } else {
    // 如果没有 SWAP 数据则跳过
    return res.status(200).json({ skipped: true, message: 'No swap data' });
  }

  // 将处理后的数据存储到 Supabase 数据库
  const { error } = await supabase.from('txs').insert([{
    ...processedData,
    signature: txData.signature
  }]);

  // 处理数据库插入错误
  if (error) {
    console.error('Error inserting into Supabase:', error);
    return res.status(500).json({ error: error });
  }

  // 记录成功信息并返回结果
  console.log('Successfully processed and stored with parser:', txData.events?.swap ? 'helius' : 'shyft');
  return res.status(200).json({
    success: true
  });
}