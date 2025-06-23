export interface RuneLiteSkill {
  getActions(): Record<string, import('../../../types/agent.js').ExtensionAction>
}

export interface TradeItem {
  itemId: string
  quantity: number
}

