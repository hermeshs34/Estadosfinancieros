import { FinancialEntry, FinancialRatio, Account } from '../types';

export class FinancialCalculator {
  private entries: FinancialEntry[];
  private accounts: Account[];

  constructor(entries: FinancialEntry[], accounts: Account[]) {
    this.entries = entries;
    this.accounts = accounts;
  }

  private getAccountBalance(accountCode: string): number {
    const account = this.accounts.find(acc => acc.code === accountCode);
    if (!account) return 0;

    return this.entries
      .filter(entry => entry.account_id === account.id)
      .reduce((sum, entry) => sum + entry.amount, 0);
  }

  private getAccountTypeBalance(accountType: string): number {
    const accountsOfType = this.accounts.filter(acc => acc.account_type === accountType);
    return accountsOfType.reduce((sum, account) => {
      const balance = this.getAccountBalance(account.code);
      return sum + balance;
    }, 0);
  }

  calculateCurrentRatio(): number {
    const currentAssets = this.getAccountBalance('110'); // Assuming 110 is current assets
    const currentLiabilities = this.getAccountBalance('210'); // Assuming 210 is current liabilities
    return currentLiabilities !== 0 ? currentAssets / currentLiabilities : 0;
  }

  calculateQuickRatio(): number {
    const currentAssets = this.getAccountBalance('110');
    const inventory = this.getAccountBalance('115'); // Assuming 115 is inventory
    const currentLiabilities = this.getAccountBalance('210');
    const quickAssets = currentAssets - inventory;
    return currentLiabilities !== 0 ? quickAssets / currentLiabilities : 0;
  }

  calculateDebtToEquityRatio(): number {
    const totalLiabilities = this.getAccountTypeBalance('liability');
    const totalEquity = this.getAccountTypeBalance('equity');
    return totalEquity !== 0 ? totalLiabilities / totalEquity : 0;
  }

  calculateROA(): number {
    const netIncome = this.getAccountTypeBalance('revenue') - this.getAccountTypeBalance('expense');
    const totalAssets = this.getAccountTypeBalance('asset');
    return totalAssets !== 0 ? (netIncome / totalAssets) * 100 : 0;
  }

  calculateROE(): number {
    const netIncome = this.getAccountTypeBalance('revenue') - this.getAccountTypeBalance('expense');
    const totalEquity = this.getAccountTypeBalance('equity');
    return totalEquity !== 0 ? (netIncome / totalEquity) * 100 : 0;
  }

  calculateGrossMargin(): number {
    const revenue = this.getAccountTypeBalance('revenue');
    const cogs = this.getAccountBalance('510'); // Assuming 510 is cost of goods sold
    return revenue !== 0 ? ((revenue - cogs) / revenue) * 100 : 0;
  }

  getAllRatios(): FinancialRatio[] {
    const currentRatio = this.calculateCurrentRatio();
    const quickRatio = this.calculateQuickRatio();
    const debtToEquity = this.calculateDebtToEquityRatio();
    const roa = this.calculateROA();
    const roe = this.calculateROE();
    const grossMargin = this.calculateGrossMargin();

    return [
      {
        name: 'Current Ratio',
        category: 'liquidity',
        value: currentRatio,
        formula: 'Current Assets / Current Liabilities',
        interpretation: currentRatio >= 1.5 ? 'good' : currentRatio >= 1 ? 'warning' : 'critical',
        benchmark: 2.0
      },
      {
        name: 'Quick Ratio',
        category: 'liquidity',
        value: quickRatio,
        formula: '(Current Assets - Inventory) / Current Liabilities',
        interpretation: quickRatio >= 1 ? 'good' : quickRatio >= 0.75 ? 'warning' : 'critical',
        benchmark: 1.0
      },
      {
        name: 'Debt-to-Equity',
        category: 'leverage',
        value: debtToEquity,
        formula: 'Total Liabilities / Total Equity',
        interpretation: debtToEquity <= 0.5 ? 'good' : debtToEquity <= 1 ? 'warning' : 'critical',
        benchmark: 0.5
      },
      {
        name: 'Return on Assets',
        category: 'profitability',
        value: roa,
        formula: '(Net Income / Total Assets) × 100',
        interpretation: roa >= 10 ? 'good' : roa >= 5 ? 'warning' : 'critical',
        benchmark: 15
      },
      {
        name: 'Return on Equity',
        category: 'profitability',
        value: roe,
        formula: '(Net Income / Total Equity) × 100',
        interpretation: roe >= 15 ? 'good' : roe >= 10 ? 'warning' : 'critical',
        benchmark: 20
      },
      {
        name: 'Gross Margin',
        category: 'profitability',
        value: grossMargin,
        formula: '((Revenue - COGS) / Revenue) × 100',
        interpretation: grossMargin >= 30 ? 'good' : grossMargin >= 20 ? 'warning' : 'critical',
        benchmark: 40
      }
    ];
  }

  generateComparativeAnalysis(previousEntries: FinancialEntry[]): any {
    const currentPeriodCalculator = new FinancialCalculator(this.entries, this.accounts);
    const previousPeriodCalculator = new FinancialCalculator(previousEntries, this.accounts);

    const currentRatios = currentPeriodCalculator.getAllRatios();
    const previousRatios = previousPeriodCalculator.getAllRatios();

    return currentRatios.map(current => {
      const previous = previousRatios.find(p => p.name === current.name);
      const change = previous ? ((current.value - previous.value) / previous.value) * 100 : 0;
      
      return {
        ...current,
        previousValue: previous?.value || 0,
        change,
        trend: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable'
      };
    });
  }
}