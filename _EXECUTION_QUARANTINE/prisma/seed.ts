/**
 * Prisma Seed Script
 * Populates database with initial data
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default strategy configurations
  const strategies = [
    {
      name: "mean_reversion",
      description: "Mean reversion strategy using RSI and Bollinger Bands",
      type: "mean_reversion",
      config: JSON.stringify({
        rsiOversold: 30,
        rsiOverbought: 70,
        bbPeriod: 20,
        bbStdDev: 2,
      }),
      maxPositionSize: 0.1,
      stopLossPercent: 3,
      takeProfitPercent: 6,
      quantWeight: 0.5,
      traditionalWeight: 0.5,
      enabled: true,
      active: false,
    },
    {
      name: "trend_following",
      description: "Trend following strategy using EMA crossovers",
      type: "trend_following",
      config: JSON.stringify({
        emaShort: 9,
        emaLong: 21,
        volumeEMA: 10,
      }),
      maxPositionSize: 0.15,
      stopLossPercent: 4,
      takeProfitPercent: 8,
      quantWeight: 0.5,
      traditionalWeight: 0.5,
      enabled: true,
      active: false,
    },
    {
      name: "quant_blended",
      description: "Blended strategy using quant signals + technical analysis",
      type: "quant",
      config: JSON.stringify({
        quantWeight: 0.5,
        traditionalWeight: 0.5,
        speedWeight: 0.25,
        altDataWeight: 0.20,
        microstructureWeight: 0.25,
        optionsFlowWeight: 0.15,
        volatilityWeight: 0.15,
      }),
      maxPositionSize: 0.12,
      stopLossPercent: 3.5,
      takeProfitPercent: 7,
      quantWeight: 0.5,
      traditionalWeight: 0.5,
      enabled: true,
      active: false,
    },
  ];

  for (const strategy of strategies) {
    await prisma.strategyConfig.upsert({
      where: { name: strategy.name },
      update: strategy,
      create: strategy,
    });
    console.log(`✅ Created/Updated strategy: ${strategy.name}`);
  }

  // Create initial performance snapshot
  await prisma.performanceSnapshot.create({
    data: {
      totalBalance: 100,
      totalPnL: 0,
      totalPnLPercent: 0,
      dailyPnL: 0,
      dailyTrades: 0,
      dailyWinRate: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      openPositions: 0,
      totalExposure: 0,
    },
  });
  console.log("✅ Created initial performance snapshot");

  console.log("✨ Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

