use anchor_lang::prelude::*;

#[account]
pub struct Registry {
    pub authority: Pubkey,
    pub protocol_fee_bps: u16,
    pub total_agents: u64,
    pub total_tvl: u64,
    pub treasury: Pubkey,
    pub bump: u8,
}
impl Registry {
    pub const SIZE: usize = 8 + 32 + 2 + 8 + 8 + 32 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum AgentStatus {
    Active,
    Paused,
    Liquidated,
}

#[account]
pub struct AgentState {
    pub developer: Pubkey,
    pub agent_pubkey: Pubkey,
    pub vault_usdc_ata: Pubkey,
    pub performance_fee_bps: u16,
    pub total_shares: u64,
    pub assets_per_share: u64,
    pub high_water_mark: u64,
    pub epoch_start: i64,
    pub epoch_duration: i64,
    pub status: AgentStatus,
    pub whitelisted_mints: Vec<Pubkey>,
    pub cumulative_pnl: i64,
    pub total_trades: u64,
    pub bump: u8,
}
impl AgentState {
    pub fn size(mints_len: usize) -> usize {
        8 + 32 + 32 + 32 + 2 + 8 + 8 + 8 + 8 + 8 + 1 + (4 + mints_len * 32) + 8 + 8 + 1
    }
}

#[account]
pub struct StakerReceipt {
    pub staker: Pubkey,
    pub agent: Pubkey,
    pub shares: u64,
    pub entry_assets_per_share: u64,
    pub deposit_timestamp: i64,
    pub bump: u8,
}
impl StakerReceipt {
    pub const SIZE: usize = 8 + 32 + 32 + 8 + 8 + 8 + 1;
}
