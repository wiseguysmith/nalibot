/**
 * Strategy Router
 * Combines multiple strategies with weighted allocations
 * Normalizes weights and aggregates signals
 */

const fs = require('fs');
const path = require('path');

// Load all strategies
const strategiesDir = path.join(__dirname, '../strategies');
const strategies = {};

// Dynamically load all strategy files
const strategyFiles = fs.readdirSync(strategiesDir).filter(file => file.endsWith('.js'));
strategyFiles.forEach(file => {
  const strategyName = file.replace('.js', '');
  try {
    strategies[strategyName] = require(path.join(strategiesDir, file));
  } catch (error) {
    console.error(`Error loading strategy ${strategyName}:`, error);
  }
});

/**
 * Normalize strategy weights to sum to 100%
 * @param {Object} strategyBlend - Object with strategy names as keys and weights as values
 * @returns {Object} Normalized strategy blend
 */
function normalizeWeights(strategyBlend) {
  const totalWeight = Object.values(strategyBlend).reduce((sum, weight) => sum + weight, 0);
  
  if (totalWeight === 0) {
    throw new Error('Strategy blend weights cannot all be zero');
  }

  const normalized = {};
  Object.keys(strategyBlend).forEach(strategyName => {
    normalized[strategyName] = strategyBlend[strategyName] / totalWeight;
  });

  return normalized;
}

/**
 * Get available strategy names
 * @returns {Array} Array of strategy names
 */
function getAvailableStrategies() {
  return Object.keys(strategies);
}

/**
 * Get strategy metadata
 * @param {string} strategyName - Name of the strategy
 * @returns {Object} Strategy metadata
 */
function getStrategyMetadata(strategyName) {
  if (!strategies[strategyName]) {
    throw new Error(`Strategy ${strategyName} not found`);
  }

  const strategy = strategies[strategyName];
  return {
    name: strategy.name,
    riskLevel: strategy.riskLevel,
    expectedReturn: strategy.expectedReturn,
    strategyMix: strategy.strategyMix,
    timeHorizonMonths: strategy.timeHorizonMonths,
    coreLogicDescription: strategy.coreLogicDescription,
    behaviorDescription: strategy.behaviorDescription,
    keyFeatures: strategy.keyFeatures
  };
}

/**
 * Generate aggregated signals from multiple strategies
 * @param {Object} strategyBlend - Object with strategy names and weights (e.g., { conservative: 0.4, momentum: 0.6 })
 * @param {Object} marketData - Market data to pass to strategies
 * @returns {Object} Aggregated trading signals
 */
function generateAggregatedSignals(strategyBlend, marketData) {
  // Normalize weights
  const normalizedBlend = normalizeWeights(strategyBlend);

  // Generate signals from each strategy
  const strategySignals = [];
  const strategyDetails = {};

  Object.keys(normalizedBlend).forEach(strategyName => {
    const weight = normalizedBlend[strategyName];
    
    if (!strategies[strategyName]) {
      console.warn(`Strategy ${strategyName} not found, skipping`);
      return;
    }

    try {
      const strategy = strategies[strategyName];
      const signal = strategy.generateSignals(marketData);
      
      strategySignals.push({
        strategy: strategyName,
        weight: weight,
        signal: signal
      });

      strategyDetails[strategyName] = {
        weight: weight,
        action: signal.action,
        confidence: signal.confidence,
        details: signal.details
      };
    } catch (error) {
      console.error(`Error generating signal for ${strategyName}:`, error);
    }
  });

  // Aggregate signals by weighting
  let buyWeight = 0;
  let sellWeight = 0;
  let totalConfidence = 0;
  let weightedPositionSize = 0;
  let weightedStopLoss = 0;
  let weightedTakeProfit = 0;

  strategySignals.forEach(({ strategy, weight, signal }) => {
    if (signal.action === 'buy') {
      buyWeight += weight * signal.confidence;
    } else if (signal.action === 'sell') {
      sellWeight += weight * signal.confidence;
    }
    
    totalConfidence += weight * signal.confidence;
    weightedPositionSize += weight * signal.positionSize;
    weightedStopLoss += weight * signal.stopLoss;
    weightedTakeProfit += weight * signal.takeProfit;
  });

  // Determine final action
  let finalAction = 'hold';
  let finalConfidence = 0;

  if (buyWeight > sellWeight && buyWeight > 0.3) {
    finalAction = 'buy';
    finalConfidence = buyWeight;
  } else if (sellWeight > buyWeight && sellWeight > 0.3) {
    finalAction = 'sell';
    finalConfidence = sellWeight;
  }

  return {
    action: finalAction,
    confidence: finalConfidence,
    buyWeight: buyWeight,
    sellWeight: sellWeight,
    positionSize: weightedPositionSize,
    stopLoss: weightedStopLoss,
    takeProfit: weightedTakeProfit,
    strategyDetails: strategyDetails,
    strategyBlend: normalizedBlend
  };
}

/**
 * Generate signals from a single strategy
 * @param {string} strategyName - Name of the strategy
 * @param {Object} marketData - Market data to pass to strategy
 * @returns {Object} Trading signals
 */
function generateSingleStrategySignals(strategyName, marketData) {
  if (!strategies[strategyName]) {
    throw new Error(`Strategy ${strategyName} not found`);
  }

  return strategies[strategyName].generateSignals(marketData);
}

module.exports = {
  generateAggregatedSignals,
  generateSingleStrategySignals,
  getAvailableStrategies,
  getStrategyMetadata,
  normalizeWeights,
  strategies // Export for direct access if needed
};

