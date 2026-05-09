use anchor_lang::prelude::*;

#[error_code]
pub enum AxiomError {
    #[msg("Invalid protocol fee")]
    InvalidProtocolFee,
    #[msg("Invalid performance fee")]
    InvalidPerformanceFee,
    #[msg("Agent is paused")]
    AgentPaused,
    #[msg("Agent is liquidated")]
    AgentLiquidated,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Invalid output mint")]
    InvalidOutputMint,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Invalid Jupiter program ID")]
    InvalidJupiterProgram,
    #[msg("Invalid Pyth price")]
    InvalidOraclePrice,
    #[msg("Arithmetic Error")]
    MathOverflow,
    #[msg("Epoch not finished")]
    EpochNotFinished,
    #[msg("Invalid remaining accounts")]
    InvalidRemainingAccounts,
    #[msg("Insufficient shares to unstake")]
    InsufficientShares,
}
